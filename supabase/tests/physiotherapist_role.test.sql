-- physiotherapist_role.test.sql
-- Physiotherapist checklist (owner-confirmed seven documents; not a statutory
-- claim), expiry enforcement, marketplace 3x3 matrix, bulk role allowlist,
-- and fail-closed empty requirements.
-- Requires migrations 025 + 026 + 028 (anon revoke on physio-touched RPCs).

begin;

create extension if not exists pgtap with schema extensions;

select plan(48);

-- ---------------------------------------------------------------------------
-- Seed
-- ---------------------------------------------------------------------------

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  (
    '00000000-0000-0000-0000-000000000000',
    'b5000001-0000-4000-8000-000000000501',
    'authenticated', 'authenticated', 'physio-admin@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Physio Admin"}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'b5000001-0000-4000-8000-000000000502',
    'authenticated', 'authenticated', 'physio-rn@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Physio RN"}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'b5000001-0000-4000-8000-000000000503',
    'authenticated', 'authenticated', 'physio-ward@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Physio Ward"}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'b5000001-0000-4000-8000-000000000504',
    'authenticated', 'authenticated', 'physio-pt@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Physio PT"}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'b5000001-0000-4000-8000-000000000505',
    'authenticated', 'authenticated', 'physio-verifier@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Physio Verifier"}'::jsonb, now(), now()
  )
on conflict (id) do nothing;

insert into public.profiles (id, full_name, account_status) values
  ('b5000001-0000-4000-8000-000000000501', 'Physio Admin', 'active'),
  ('b5000001-0000-4000-8000-000000000502', 'Physio RN', 'active'),
  ('b5000001-0000-4000-8000-000000000503', 'Physio Ward', 'active'),
  ('b5000001-0000-4000-8000-000000000504', 'Physio PT', 'active'),
  ('b5000001-0000-4000-8000-000000000505', 'Physio Verifier', 'active')
on conflict (id) do update set account_status = excluded.account_status;

insert into public.platform_admin_roles (user_id, role) values
  ('b5000001-0000-4000-8000-000000000505', 'platform_verifier')
on conflict (user_id) do update set role = excluded.role;

insert into public.organizations (id, legal_name, display_name, slug, status)
values (
  'b5000001-cccc-4000-8000-0000000000a1',
  'Physio Org Ltd', 'Physio Org', 'physio-role-org', 'active'
)
on conflict (id) do nothing;

insert into public.organization_members (organization_id, user_id, role, status, accepted_at)
values (
  'b5000001-cccc-4000-8000-0000000000a1',
  'b5000001-0000-4000-8000-000000000501',
  'org_admin', 'active', now()
)
on conflict (organization_id, user_id) do nothing;

insert into public.locations (id, organization_id, name)
values (
  'b5000001-cccc-4000-8000-0000000000c1',
  'b5000001-cccc-4000-8000-0000000000a1',
  'Physio Site'
)
on conflict (id) do nothing;

insert into public.worker_profiles (user_id, worker_role, onboarding_status)
values
  ('b5000001-0000-4000-8000-000000000502', 'registered_nurse', 'completed'),
  ('b5000001-0000-4000-8000-000000000503', 'ward_assistant', 'completed'),
  ('b5000001-0000-4000-8000-000000000504', 'physiotherapist', 'completed')
on conflict (user_id) do update
set worker_role = excluded.worker_role,
    onboarding_status = excluded.onboarding_status;

create or replace function pg_temp.auth_as(p_uid uuid)
returns void
language plpgsql
as $$
begin
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', p_uid::text, 'role', 'authenticated', 'aud', 'authenticated')::text,
    true
  );
  perform set_config('request.jwt.claim.sub', p_uid::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  execute 'set local role authenticated';
end;
$$;

create or replace function pg_temp.clear_auth()
returns void
language plpgsql
as $$
begin
  -- reset role alone leaves JWT claims set; payout/credential guards still see authenticated.
  perform set_config('request.jwt.claims', '', true);
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claim.role', '', true);
  execute 'reset role';
end;
$$;

-- ---------------------------------------------------------------------------
-- 1-4. Checklist parity and fail-closed empty set
-- ---------------------------------------------------------------------------

select is(
  (
    select array_agg(credential_type order by sort_order)
    from public.worker_credential_requirements('physiotherapist')
  ),
  array[
    'identity_document_front',
    'identity_document_back',
    'physiotherapy_degree',
    'physiotherapist_registration_certificate',
    'physiotherapy_practising_licence',
    'tax_identification_proof',
    'social_insurance_proof'
  ]::text[],
  'physiotherapist checklist is seven distinct document types'
);

select is(
  cardinality(public.worker_required_credential_types('physiotherapist')),
  7,
  'physiotherapist required types cardinality is 7'
);

select ok(
  public.credential_expiry_is_valid(
    'physiotherapy_practising_licence',
    now() + interval '1 day'
  ),
  'future practising licence expiry is valid'
);

select ok(
  not public.credential_expiry_is_valid(
    'physiotherapy_practising_licence',
    null
  ),
  'null practising licence expiry is invalid'
);

select ok(
  not public.credential_expiry_is_valid(
    'physiotherapy_practising_licence',
    now() - interval '1 second'
  ),
  'past practising licence expiry is invalid'
);

select ok(
  public.credential_expiry_is_valid('nursing_licence', null),
  'RN licence still allows null expiry'
);

-- ---------------------------------------------------------------------------
-- 5-7. Direct credential create rejects bad practising licence expiry
-- ---------------------------------------------------------------------------

reset role;
select pg_temp.auth_as('b5000001-0000-4000-8000-000000000504');

select throws_ok(
  $$ insert into public.credentials (
       worker_id, credential_type, status, expires_at, storage_path
     ) values (
       'b5000001-0000-4000-8000-000000000504',
       'physiotherapy_practising_licence',
       'pending',
       null,
       'b5000001-0000-4000-8000-000000000504/licence/null.pdf'
     ) $$,
  'P0001',
  'CREDENTIAL_EXPIRY_REQUIRED:physiotherapy_practising_licence',
  'direct insert rejects null practising licence expiry'
);

select throws_ok(
  $$ insert into public.credentials (
       worker_id, credential_type, status, expires_at, storage_path
     ) values (
       'b5000001-0000-4000-8000-000000000504',
       'physiotherapy_practising_licence',
       'pending',
       now() - interval '1 day',
       'b5000001-0000-4000-8000-000000000504/licence/past.pdf'
     ) $$,
  'P0001',
  'CREDENTIAL_EXPIRY_REQUIRED:physiotherapy_practising_licence',
  'direct insert rejects past practising licence expiry'
);

select lives_ok(
  $$ insert into public.credentials (
       id, worker_id, credential_type, status, expires_at, storage_path, storage_paths
     ) values (
       'b5000001-cccc-4000-8000-0000000000e1',
       'b5000001-0000-4000-8000-000000000504',
       'physiotherapy_practising_licence',
       'pending',
       date_trunc('day', now() at time zone 'Europe/Nicosia')
         at time zone 'Europe/Nicosia'
         + interval '1 day'
         - interval '1 millisecond',
       'b5000001-0000-4000-8000-000000000504/licence/today.pdf',
       jsonb_build_array(
         'b5000001-0000-4000-8000-000000000504/licence/today.pdf'
       )
     ) $$,
  'same-day Cyprus end-of-day practising licence insert succeeds'
);

-- ---------------------------------------------------------------------------
-- 8. Verifier can correct expiry without approving
-- ---------------------------------------------------------------------------

reset role;
select pg_temp.auth_as('b5000001-0000-4000-8000-000000000505');

select lives_ok(
  $$ select public.correct_credential_expires_at(
       'b5000001-cccc-4000-8000-0000000000e1',
       now() + interval '180 days'
     ) $$,
  'verifier can correct practising licence expires_at'
);

select is(
  (
    select status::text
    from public.credentials
    where id = 'b5000001-cccc-4000-8000-0000000000e1'
  ),
  'pending',
  'expiry correction does not auto-approve the credential'
);

-- ---------------------------------------------------------------------------
-- Seed verified marketplace workers (privileged path)
-- ---------------------------------------------------------------------------

select pg_temp.clear_auth();
select set_config('bridgehive.allow_platform_verify', 'on', true);

update public.worker_profiles
set verification_status = 'verified'
where user_id in (
  'b5000001-0000-4000-8000-000000000502',
  'b5000001-0000-4000-8000-000000000503',
  'b5000001-0000-4000-8000-000000000504'
);

insert into public.payout_accounts (
  worker_id, country, currency, masked_iban, status, verified_at, last_verified_at
) values
  (
    'b5000001-0000-4000-8000-000000000502',
    'CY', 'EUR', 'CY••••0502', 'verified', now(), now()
  ),
  (
    'b5000001-0000-4000-8000-000000000503',
    'CY', 'EUR', 'CY••••0503', 'verified', now(), now()
  ),
  (
    'b5000001-0000-4000-8000-000000000504',
    'CY', 'EUR', 'CY••••0504', 'verified', now(), now()
  )
on conflict (worker_id) do update
set status = 'verified', verified_at = now(), last_verified_at = now();

-- RN credentials (insert pending, then verify)
insert into public.credentials (
  worker_id, credential_type, status, expires_at, storage_path, storage_paths
)
select
  'b5000001-0000-4000-8000-000000000502',
  t.cred_type,
  'pending',
  now() + interval '1 year',
  'b5000001-0000-4000-8000-000000000502/' || t.cred_type || '/seed.pdf',
  jsonb_build_array(
    'b5000001-0000-4000-8000-000000000502/' || t.cred_type || '/seed.pdf'
  )
from unnest(public.worker_required_credential_types('registered_nurse')) as t(cred_type);

-- Ward credentials
insert into public.credentials (
  worker_id, credential_type, status, expires_at, storage_path, storage_paths
)
select
  'b5000001-0000-4000-8000-000000000503',
  t.cred_type,
  'pending',
  now() + interval '1 year',
  'b5000001-0000-4000-8000-000000000503/' || t.cred_type || '/seed.pdf',
  jsonb_build_array(
    'b5000001-0000-4000-8000-000000000503/' || t.cred_type || '/seed.pdf'
  )
from unnest(public.worker_required_credential_types('ward_assistant')) as t(cred_type);

-- Physio credentials (replace the earlier pending licence row with a full set)
delete from public.credentials
where worker_id = 'b5000001-0000-4000-8000-000000000504';

insert into public.credentials (
  worker_id, credential_type, status, expires_at, storage_path, storage_paths
)
select
  'b5000001-0000-4000-8000-000000000504',
  t.cred_type,
  'pending',
  case
    when t.cred_type = 'physiotherapy_practising_licence'
      then now() + interval '1 year'
    else null
  end,
  'b5000001-0000-4000-8000-000000000504/' || t.cred_type || '/seed.pdf',
  jsonb_build_array(
    'b5000001-0000-4000-8000-000000000504/' || t.cred_type || '/seed.pdf'
  )
from unnest(public.worker_required_credential_types('physiotherapist')) as t(cred_type);

update public.credentials
set status = 'verified', verified_at = now()
where worker_id in (
  'b5000001-0000-4000-8000-000000000502',
  'b5000001-0000-4000-8000-000000000503',
  'b5000001-0000-4000-8000-000000000504'
);

select set_config('bridgehive.allow_platform_verify', 'off', true);

-- ---------------------------------------------------------------------------
-- Published shifts for each role
-- ---------------------------------------------------------------------------

insert into public.shifts (
  id, organization_id, location_id, required_role,
  starts_at, ends_at, break_minutes, rate_minor, currency, status,
  acceptance_deadline, title
) values
  (
    'b5000001-cccc-4000-8000-0000000000d1',
    'b5000001-cccc-4000-8000-0000000000a1',
    'b5000001-cccc-4000-8000-0000000000c1',
    'registered_nurse',
    now() + interval '3 days', now() + interval '3 days 8 hours',
    30, 2800, 'EUR', 'published', now() + interval '2 days',
    'RN open'
  ),
  (
    'b5000001-cccc-4000-8000-0000000000d2',
    'b5000001-cccc-4000-8000-0000000000a1',
    'b5000001-cccc-4000-8000-0000000000c1',
    'ward_assistant',
    now() + interval '4 days', now() + interval '4 days 8 hours',
    30, 1800, 'EUR', 'published', now() + interval '3 days',
    'WA open'
  ),
  (
    'b5000001-cccc-4000-8000-0000000000d3',
    'b5000001-cccc-4000-8000-0000000000a1',
    'b5000001-cccc-4000-8000-0000000000c1',
    'physiotherapist',
    now() + interval '5 days', now() + interval '5 days 8 hours',
    30, 3000, 'EUR', 'published', now() + interval '4 days',
    'PT open'
  )
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 9-17. 3x3 marketplace list visibility (exact role match)
-- ---------------------------------------------------------------------------

reset role;
select pg_temp.auth_as('b5000001-0000-4000-8000-000000000502');
select is(
  (select count(*)::integer from public.shifts where status = 'published'),
  1,
  'RN list sees only RN published shift'
);
select ok(
  exists (
    select 1 from public.shifts
    where id = 'b5000001-cccc-4000-8000-0000000000d1'
  ),
  'RN list includes RN shift id'
);
select ok(
  not exists (
    select 1 from public.shifts
    where id = 'b5000001-cccc-4000-8000-0000000000d3'
  ),
  'RN list excludes physiotherapist shift id'
);

reset role;
select pg_temp.auth_as('b5000001-0000-4000-8000-000000000503');
select is(
  (select count(*)::integer from public.shifts where status = 'published'),
  1,
  'Ward list sees only Ward published shift'
);
select ok(
  not exists (
    select 1 from public.shifts
    where id = 'b5000001-cccc-4000-8000-0000000000d3'
  ),
  'Ward list excludes physiotherapist shift id'
);

reset role;
select pg_temp.auth_as('b5000001-0000-4000-8000-000000000504');
select is(
  (select count(*)::integer from public.shifts where status = 'published'),
  1,
  'Physiotherapist list sees only physiotherapist published shift'
);
select ok(
  exists (
    select 1 from public.shifts
    where id = 'b5000001-cccc-4000-8000-0000000000d3'
  ),
  'Physiotherapist list includes physiotherapist shift id'
);
select ok(
  not exists (
    select 1 from public.shifts
    where id = 'b5000001-cccc-4000-8000-0000000000d1'
  ),
  'Physiotherapist list excludes RN shift id'
);
select ok(
  not exists (
    select 1 from public.shifts
    where id = 'b5000001-cccc-4000-8000-0000000000d2'
  ),
  'Physiotherapist list excludes Ward shift id'
);

-- ---------------------------------------------------------------------------
-- 18-26. Detail RPC exact role match (direct shift ids)
-- ---------------------------------------------------------------------------

reset role;
select pg_temp.auth_as('b5000001-0000-4000-8000-000000000504');
select is(
  (
    select count(*)::integer
    from public.get_worker_shift_details('b5000001-cccc-4000-8000-0000000000d3')
  ),
  1,
  'Physiotherapist detail returns matching physiotherapist shift'
);
select is(
  (
    select count(*)::integer
    from public.get_worker_shift_details('b5000001-cccc-4000-8000-0000000000d1')
  ),
  0,
  'Physiotherapist detail returns no row for RN shift id'
);
select is(
  (
    select count(*)::integer
    from public.get_worker_shift_details('b5000001-cccc-4000-8000-0000000000d2')
  ),
  0,
  'Physiotherapist detail returns no row for Ward shift id'
);

reset role;
select pg_temp.auth_as('b5000001-0000-4000-8000-000000000502');
select is(
  (
    select count(*)::integer
    from public.get_worker_shift_details('b5000001-cccc-4000-8000-0000000000d3')
  ),
  0,
  'RN detail returns no row for physiotherapist shift id'
);
select is(
  (
    select count(*)::integer
    from public.get_worker_shift_details('b5000001-cccc-4000-8000-0000000000d1')
  ),
  1,
  'RN detail returns matching RN shift'
);

reset role;
select pg_temp.auth_as('b5000001-0000-4000-8000-000000000503');
select is(
  (
    select count(*)::integer
    from public.get_worker_shift_details('b5000001-cccc-4000-8000-0000000000d3')
  ),
  0,
  'Ward detail returns no row for physiotherapist shift id'
);
select is(
  (
    select count(*)::integer
    from public.get_worker_shift_details('b5000001-cccc-4000-8000-0000000000d2')
  ),
  1,
  'Ward detail returns matching Ward shift'
);

-- ---------------------------------------------------------------------------
-- 27-30. Claim matrix: mismatch denied before fill; then match claim
-- ---------------------------------------------------------------------------

-- Mismatch checks must run while the target physiotherapist shift is still open.
reset role;
select pg_temp.auth_as('b5000001-0000-4000-8000-000000000504');
select throws_ok(
  $$ select public.claim_shift('b5000001-cccc-4000-8000-0000000000d1') $$,
  'P0001',
  'NOT_ELIGIBLE:role_mismatch',
  'Physiotherapist cannot claim RN shift'
);

reset role;
select pg_temp.auth_as('b5000001-0000-4000-8000-000000000502');
select throws_ok(
  $$ select public.claim_shift('b5000001-cccc-4000-8000-0000000000d3') $$,
  'P0001',
  'NOT_ELIGIBLE:role_mismatch',
  'RN cannot claim physiotherapist shift'
);

reset role;
select pg_temp.auth_as('b5000001-0000-4000-8000-000000000504');
select lives_ok(
  $$ select public.claim_shift('b5000001-cccc-4000-8000-0000000000d3') $$,
  'Physiotherapist can claim matching physiotherapist shift'
);

-- Past verified licence blocks a fresh physiotherapist claim
select pg_temp.clear_auth();
select set_config('bridgehive.allow_platform_verify', 'on', true);
update public.credentials
set expires_at = now() - interval '1 hour'
where worker_id = 'b5000001-0000-4000-8000-000000000504'
  and credential_type = 'physiotherapy_practising_licence';
select set_config('bridgehive.allow_platform_verify', 'off', true);

insert into public.shifts (
  id, organization_id, location_id, required_role,
  starts_at, ends_at, break_minutes, rate_minor, currency, status,
  acceptance_deadline, title
) values (
  'b5000001-cccc-4000-8000-0000000000d4',
  'b5000001-cccc-4000-8000-0000000000a1',
  'b5000001-cccc-4000-8000-0000000000c1',
  'physiotherapist',
  now() + interval '6 days', now() + interval '6 days 8 hours',
  30, 3000, 'EUR', 'published', now() + interval '5 days',
  'PT expired licence'
);

reset role;
select pg_temp.auth_as('b5000001-0000-4000-8000-000000000504');
select throws_ok(
  $$ select public.claim_shift('b5000001-cccc-4000-8000-0000000000d4') $$,
  'P0001',
  'NOT_ELIGIBLE:missing_credential:physiotherapy_practising_licence',
  'verified but past practising licence cannot claim'
);

-- Restore future licence for remaining checks
select pg_temp.clear_auth();
select set_config('bridgehive.allow_platform_verify', 'on', true);
update public.credentials
set expires_at = now() + interval '1 year'
where worker_id = 'b5000001-0000-4000-8000-000000000504'
  and credential_type = 'physiotherapy_practising_licence';
select set_config('bridgehive.allow_platform_verify', 'off', true);

-- ---------------------------------------------------------------------------
-- 31-33. Final approval gating: missing payout / rejected doc / empty set
-- ---------------------------------------------------------------------------

select ok(
  public.worker_is_ready_for_final_approval(
    'b5000001-0000-4000-8000-000000000504'
  ),
  'physiotherapist with verified docs and payout is ready for final approval'
);

select pg_temp.clear_auth();
select set_config('bridgehive.allow_payout_verify', 'on', true);
update public.payout_accounts
set status = 'pending', verified_at = null, last_verified_at = null
where worker_id = 'b5000001-0000-4000-8000-000000000504';
select set_config('bridgehive.allow_payout_verify', 'off', true);

select ok(
  not public.worker_is_ready_for_final_approval(
    'b5000001-0000-4000-8000-000000000504'
  ),
  'unverified payout blocks final approval'
);

select pg_temp.clear_auth();
select set_config('bridgehive.allow_payout_verify', 'on', true);
select set_config('bridgehive.allow_platform_verify', 'on', true);
update public.payout_accounts
set status = 'verified', verified_at = now(), last_verified_at = now()
where worker_id = 'b5000001-0000-4000-8000-000000000504';
update public.credentials
set status = 'rejected', rejection_reason = 'blurry scan'
where worker_id = 'b5000001-0000-4000-8000-000000000504'
  and credential_type = 'physiotherapy_degree';
select set_config('bridgehive.allow_platform_verify', 'off', true);
select set_config('bridgehive.allow_payout_verify', 'off', true);

select ok(
  not public.worker_is_ready_for_final_approval(
    'b5000001-0000-4000-8000-000000000504'
  ),
  'rejected professional document blocks final approval'
);

-- ---------------------------------------------------------------------------
-- 34-36. Single + bulk shift create for physiotherapist; inactive org blocked
-- ---------------------------------------------------------------------------

reset role;
select pg_temp.auth_as('b5000001-0000-4000-8000-000000000501');

select lives_ok(
  $$ insert into public.shifts (
       id, organization_id, location_id, required_role,
       starts_at, ends_at, break_minutes, rate_minor, currency, status
     ) values (
       'b5000001-cccc-4000-8000-0000000000d5',
       'b5000001-cccc-4000-8000-0000000000a1',
       'b5000001-cccc-4000-8000-0000000000c1',
       'physiotherapist',
       now() + interval '10 days', now() + interval '10 days 8 hours',
       30, 3000, 'EUR', 'draft'
     ) $$,
  'org_admin can create draft physiotherapist shift'
);

select is(
  (
    select required_role::text
    from public.shifts
    where id = 'b5000001-cccc-4000-8000-0000000000d5'
  ),
  'physiotherapist',
  'draft physiotherapist shift stores exact role'
);

select lives_ok(
  $$ select public.create_shifts_batch(
       'b5000001-cccc-4000-8000-0000000000a1',
       'req-physio-mixed-1',
       'draft',
       'individual',
       jsonb_build_array(
         jsonb_build_object(
           'location_id', 'b5000001-cccc-4000-8000-0000000000c1',
           'required_role', 'physiotherapist',
           'starts_at', (now() + interval '12 days')::text,
           'ends_at', (now() + interval '12 days 8 hours')::text,
           'break_minutes', 30,
           'rate_minor', 3000,
           'currency', 'EUR'
         ),
         jsonb_build_object(
           'location_id', 'b5000001-cccc-4000-8000-0000000000c1',
           'required_role', 'registered_nurse',
           'starts_at', (now() + interval '13 days')::text,
           'ends_at', (now() + interval '13 days 8 hours')::text,
           'break_minutes', 30,
           'rate_minor', 2800,
           'currency', 'EUR'
         )
       )
     ) $$,
  'bulk batch accepts mixed physiotherapist and RN roles'
);

-- Inactive organization cannot publish
reset role;
select set_config('bridgehive.allow_org_lifecycle', 'on', true);
update public.organizations
set status = 'suspended'
where id = 'b5000001-cccc-4000-8000-0000000000a1';
select set_config('bridgehive.allow_org_lifecycle', 'off', true);

select pg_temp.auth_as('b5000001-0000-4000-8000-000000000501');
select throws_ok(
  $$ select public.publish_shift('b5000001-cccc-4000-8000-0000000000d5') $$,
  'P0001',
  'ORG_NOT_ACTIVE',
  'inactive organization cannot publish physiotherapist shift'
);

reset role;
select set_config('bridgehive.allow_org_lifecycle', 'on', true);
update public.organizations
set status = 'active'
where id = 'b5000001-cccc-4000-8000-0000000000a1';
select set_config('bridgehive.allow_org_lifecycle', 'off', true);

-- ---------------------------------------------------------------------------
-- 37-39. Private credential isolation + tenant membership
-- ---------------------------------------------------------------------------

reset role;
select pg_temp.auth_as('b5000001-0000-4000-8000-000000000502');
select is(
  (
    select count(*)::integer
    from public.credentials
    where worker_id = 'b5000001-0000-4000-8000-000000000504'
  ),
  0,
  'RN worker cannot read physiotherapist private credentials'
);

reset role;
select pg_temp.auth_as('b5000001-0000-4000-8000-000000000504');
select is(
  (
    select count(*)::integer
    from public.credentials
    where worker_id = 'b5000001-0000-4000-8000-000000000504'
  ),
  7,
  'physiotherapist can read own seven credentials'
);

select ok(
  not exists (
    select 1
    from public.organization_members
    where user_id = 'b5000001-0000-4000-8000-000000000504'
  ),
  'physiotherapist is not an organization membership privilege'
);

-- ---------------------------------------------------------------------------
-- 40-42. Package submit fail-closed when requirements empty / missing licence
-- ---------------------------------------------------------------------------

select ok(
  public.credential_expiry_is_valid(
    'physiotherapy_practising_licence',
    date_trunc('day', now() at time zone 'Europe/Nicosia')
      at time zone 'Europe/Nicosia'
      + interval '1 day'
      - interval '1 millisecond',
    now()
  ),
  'same-day Cyprus end-of-day remains valid while still on that day'
);

select is(
  (
    select count(*)::integer
    from public.worker_credential_requirements('registered_nurse')
    where credential_type = 'physiotherapy_practising_licence'
  ),
  0,
  'RN checklist unchanged — no physiotherapy documents'
);

select is(
  (
    select count(*)::integer
    from public.worker_credential_requirements('ward_assistant')
    where credential_type like 'physio%'
  ),
  0,
  'Ward checklist unchanged — no physiotherapy documents'
);

-- ---------------------------------------------------------------------------
-- 43-46. Anon EXECUTE revoked on physio-touched RPCs (migration 028)
-- ---------------------------------------------------------------------------

select is(
  (
    select count(*)::integer
    from information_schema.routine_privileges
    where routine_schema = 'public'
      and routine_name = 'create_shifts_batch'
      and grantee = 'anon'
      and privilege_type = 'EXECUTE'
  ),
  0,
  'anon cannot execute create_shifts_batch after 028'
);

select is(
  (
    select count(*)::integer
    from information_schema.routine_privileges
    where routine_schema = 'public'
      and routine_name = 'ensure_my_worker_profile'
      and grantee = 'anon'
      and privilege_type = 'EXECUTE'
  ),
  0,
  'anon cannot execute ensure_my_worker_profile after 028'
);

select is(
  (
    select count(*)::integer
    from information_schema.routine_privileges
    where routine_schema = 'public'
      and routine_name = 'submit_worker_verification_package'
      and grantee = 'anon'
      and privilege_type = 'EXECUTE'
  ),
  0,
  'anon cannot execute submit_worker_verification_package after 028'
);

select is(
  (
    select count(*)::integer
    from information_schema.routine_privileges
    where routine_schema = 'public'
      and routine_name = 'credential_expiry_is_valid'
      and grantee = 'anon'
      and privilege_type = 'EXECUTE'
  ),
  0,
  'anon cannot execute credential_expiry_is_valid after 028'
);

select * from finish();
rollback;
