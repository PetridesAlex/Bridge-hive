-- shift_role_claim.test.sql
-- Role selection storage, published role lock, cross-role claim denial,
-- and org-active claim gating.

begin;

select plan(19);

create extension if not exists pgtap with schema extensions;

-- ---------------------------------------------------------------------------
-- Seed
-- ---------------------------------------------------------------------------

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  (
    '00000000-0000-0000-0000-000000000000',
    'b3000001-0000-4000-8000-000000000301',
    'authenticated', 'authenticated', 'role-claim-admin@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Role Claim Admin"}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'b3000001-0000-4000-8000-000000000302',
    'authenticated', 'authenticated', 'role-claim-nurse@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Role Claim Nurse"}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'b3000001-0000-4000-8000-000000000303',
    'authenticated', 'authenticated', 'role-claim-ward@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Role Claim Ward"}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'b3000001-0000-4000-8000-000000000304',
    'authenticated', 'authenticated', 'role-claim-billing@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Role Claim Billing"}'::jsonb, now(), now()
  )
on conflict (id) do nothing;

insert into public.profiles (id, full_name, account_status) values
  ('b3000001-0000-4000-8000-000000000301', 'Role Claim Admin', 'active'),
  ('b3000001-0000-4000-8000-000000000302', 'Role Claim Nurse', 'active'),
  ('b3000001-0000-4000-8000-000000000303', 'Role Claim Ward', 'active'),
  ('b3000001-0000-4000-8000-000000000304', 'Role Claim Billing', 'active')
on conflict (id) do update set account_status = excluded.account_status;

insert into public.organizations (id, legal_name, display_name, slug, status)
values (
  'b3000001-cccc-4000-8000-0000000000a1',
  'Role Claim Org Ltd', 'Role Claim Org', 'role-claim-org', 'active'
)
on conflict (id) do nothing;

insert into public.organization_members (organization_id, user_id, role, status, accepted_at)
values
  (
    'b3000001-cccc-4000-8000-0000000000a1',
    'b3000001-0000-4000-8000-000000000301',
    'org_admin', 'active', now()
  ),
  (
    'b3000001-cccc-4000-8000-0000000000a1',
    'b3000001-0000-4000-8000-000000000304',
    'org_billing', 'active', now()
  )
on conflict (organization_id, user_id) do nothing;

insert into public.locations (id, organization_id, name)
values (
  'b3000001-cccc-4000-8000-0000000000c1',
  'b3000001-cccc-4000-8000-0000000000a1',
  'Role Claim Site'
)
on conflict (id) do nothing;

-- Foreign org + location for cross-tenant create attempt
insert into public.organizations (id, legal_name, display_name, slug, status)
values (
  'b3000001-cccc-4000-8000-0000000000b1',
  'Role Other Org Ltd', 'Role Other Org', 'role-other-org', 'active'
)
on conflict (id) do nothing;

insert into public.locations (id, organization_id, name)
values (
  'b3000001-cccc-4000-8000-0000000000c2',
  'b3000001-cccc-4000-8000-0000000000b1',
  'Other Site'
)
on conflict (id) do nothing;

insert into public.worker_profiles (user_id, worker_role, onboarding_status)
values
  ('b3000001-0000-4000-8000-000000000302', 'registered_nurse', 'completed'),
  ('b3000001-0000-4000-8000-000000000303', 'ward_assistant', 'completed')
on conflict (user_id) do update
set worker_role = excluded.worker_role,
    onboarding_status = excluded.onboarding_status;

select set_config('bridgehive.allow_platform_verify', 'on', true);

update public.worker_profiles
set verification_status = 'verified'
where user_id in (
  'b3000001-0000-4000-8000-000000000302',
  'b3000001-0000-4000-8000-000000000303'
);

insert into public.payout_accounts (
  worker_id, country, currency, masked_iban, status, verified_at, last_verified_at
) values
  (
    'b3000001-0000-4000-8000-000000000302',
    'CY', 'EUR', 'CY••••0302', 'verified', now(), now()
  ),
  (
    'b3000001-0000-4000-8000-000000000303',
    'CY', 'EUR', 'CY••••0303', 'verified', now(), now()
  )
on conflict (worker_id) do update
set status = 'verified', verified_at = now(), last_verified_at = now();

insert into public.credentials (
  worker_id, credential_type, status, expires_at, storage_path, storage_paths
)
select
  'b3000001-0000-4000-8000-000000000302',
  t.cred_type,
  'pending',
  now() + interval '1 year',
  'b3000001-0000-4000-8000-000000000302/' || t.cred_type || '/seed.pdf',
  jsonb_build_array(
    'b3000001-0000-4000-8000-000000000302/' || t.cred_type || '/seed.pdf'
  )
from unnest(public.worker_required_credential_types('registered_nurse')) as t(cred_type);

insert into public.credentials (
  worker_id, credential_type, status, expires_at, storage_path, storage_paths
)
select
  'b3000001-0000-4000-8000-000000000303',
  t.cred_type,
  'pending',
  now() + interval '1 year',
  'b3000001-0000-4000-8000-000000000303/' || t.cred_type || '/seed.pdf',
  jsonb_build_array(
    'b3000001-0000-4000-8000-000000000303/' || t.cred_type || '/seed.pdf'
  )
from unnest(public.worker_required_credential_types('ward_assistant')) as t(cred_type);

update public.credentials
set status = 'verified', verified_at = now()
where worker_id in (
  'b3000001-0000-4000-8000-000000000302',
  'b3000001-0000-4000-8000-000000000303'
);

select set_config('bridgehive.allow_platform_verify', 'off', true);

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

-- ---------------------------------------------------------------------------
-- 1-2. Admin creates draft RN; stores correct role
-- ---------------------------------------------------------------------------

reset role;
select pg_temp.auth_as('b3000001-0000-4000-8000-000000000301');

select lives_ok(
  $$ insert into public.shifts (
       id, organization_id, location_id, required_role,
       starts_at, ends_at, break_minutes, rate_minor, currency, status, acceptance_deadline
     ) values (
       'b3000001-cccc-4000-8000-0000000000d1',
       'b3000001-cccc-4000-8000-0000000000a1',
       'b3000001-cccc-4000-8000-0000000000c1',
       'registered_nurse',
       now() + interval '6 days', now() + interval '6 days 8 hours',
       30, 2500, 'EUR', 'draft', now() + interval '5 days'
     ) $$,
  'org_admin can create draft registered_nurse shift'
);

select is(
  (
    select required_role::text
    from public.shifts
    where id = 'b3000001-cccc-4000-8000-0000000000d1'
  ),
  'registered_nurse',
  'registered_nurse shift stores correct role'
);

-- ---------------------------------------------------------------------------
-- 3. Billing cannot create shifts
-- ---------------------------------------------------------------------------

reset role;
select pg_temp.auth_as('b3000001-0000-4000-8000-000000000304');

select throws_ok(
  $$ insert into public.shifts (
       id, organization_id, location_id, required_role,
       starts_at, ends_at, break_minutes, rate_minor, currency, status
     ) values (
       'b3000001-cccc-4000-8000-0000000000d2',
       'b3000001-cccc-4000-8000-0000000000a1',
       'b3000001-cccc-4000-8000-0000000000c1',
       'ward_assistant',
       now() + interval '7 days', now() + interval '7 days 8 hours',
       30, 1800, 'EUR', 'draft'
     ) $$,
  '42501',
  'new row violates row-level security policy for table "shifts"',
  'billing-only user cannot create shifts'
);

-- ---------------------------------------------------------------------------
-- 4. Cross-org location rejected by trigger/policy
-- ---------------------------------------------------------------------------

reset role;
select pg_temp.auth_as('b3000001-0000-4000-8000-000000000301');

select throws_ok(
  $$ insert into public.shifts (
       id, organization_id, location_id, required_role,
       starts_at, ends_at, break_minutes, rate_minor, currency, status
     ) values (
       'b3000001-cccc-4000-8000-0000000000d3',
       'b3000001-cccc-4000-8000-0000000000a1',
       'b3000001-cccc-4000-8000-0000000000c2',
       'registered_nurse',
       now() + interval '8 days', now() + interval '8 days 8 hours',
       30, 2500, 'EUR', 'draft'
     ) $$,
  'P0001',
  'SHIFT_LOCATION_ORG_MISMATCH',
  'cannot create shift using another organization location'
);

-- ---------------------------------------------------------------------------
-- 5-6. Draft role may change; create WA draft and store role
-- ---------------------------------------------------------------------------

select lives_ok(
  $$ update public.shifts
     set required_role = 'ward_assistant'
     where id = 'b3000001-cccc-4000-8000-0000000000d1' $$,
  'draft required_role may be changed before publishing'
);

select lives_ok(
  $$ insert into public.shifts (
       id, organization_id, location_id, required_role,
       starts_at, ends_at, break_minutes, rate_minor, currency, status, acceptance_deadline
     ) values (
       'b3000001-cccc-4000-8000-0000000000d4',
       'b3000001-cccc-4000-8000-0000000000a1',
       'b3000001-cccc-4000-8000-0000000000c1',
       'ward_assistant',
       now() + interval '9 days', now() + interval '9 days 8 hours',
       30, 1800, 'EUR', 'draft', now() + interval '8 days'
     ) $$,
  'org_admin can create draft ward_assistant shift'
);

select is(
  (
    select required_role::text
    from public.shifts
    where id = 'b3000001-cccc-4000-8000-0000000000d4'
  ),
  'ward_assistant',
  'ward_assistant shift stores correct role'
);

-- Restore RN draft and publish both
select lives_ok(
  $$ update public.shifts
     set required_role = 'registered_nurse'
     where id = 'b3000001-cccc-4000-8000-0000000000d1' $$,
  'restore draft to registered_nurse before publish'
);

select lives_ok(
  $$ select public.publish_shift('b3000001-cccc-4000-8000-0000000000d1') $$,
  'publish registered_nurse shift'
);

select lives_ok(
  $$ select public.publish_shift('b3000001-cccc-4000-8000-0000000000d4') $$,
  'publish ward_assistant shift'
);

-- ---------------------------------------------------------------------------
-- 7. Published role cannot change
-- ---------------------------------------------------------------------------

select throws_ok(
  $$ update public.shifts
     set required_role = 'ward_assistant'
     where id = 'b3000001-cccc-4000-8000-0000000000d1' $$,
  'P0001',
  'SHIFT_ROLE_LOCKED',
  'published shift required_role cannot be changed'
);

-- ---------------------------------------------------------------------------
-- 8-9. Nurse claims RN; ward cannot claim RN
-- ---------------------------------------------------------------------------

reset role;
select pg_temp.auth_as('b3000001-0000-4000-8000-000000000302');

select lives_ok(
  $$ select public.claim_shift('b3000001-cccc-4000-8000-0000000000d1') $$,
  'verified nurse can claim published nurse shift'
);

reset role;
select pg_temp.auth_as('b3000001-0000-4000-8000-000000000303');

select throws_ok(
  $$ select public.claim_shift('b3000001-cccc-4000-8000-0000000000d1') $$,
  'P0001',
  'SHIFT_NOT_AVAILABLE',
  'ward assistant cannot claim already-filled nurse shift'
);

-- ---------------------------------------------------------------------------
-- 10-11. Ward claims WA; nurse cannot claim WA
-- ---------------------------------------------------------------------------

select lives_ok(
  $$ select public.claim_shift('b3000001-cccc-4000-8000-0000000000d4') $$,
  'verified ward assistant can claim published ward-assistant shift'
);

reset role;
select pg_temp.auth_as('b3000001-0000-4000-8000-000000000302');

select throws_ok(
  $$ select public.claim_shift('b3000001-cccc-4000-8000-0000000000d4') $$,
  'P0001',
  'SHIFT_NOT_AVAILABLE',
  'nurse cannot claim already-filled ward-assistant shift'
);

-- ---------------------------------------------------------------------------
-- 12. Assigned shift role cannot change
-- ---------------------------------------------------------------------------

reset role;
select pg_temp.auth_as('b3000001-0000-4000-8000-000000000301');

select throws_ok(
  $$ update public.shifts
     set required_role = 'ward_assistant'
     where id = 'b3000001-cccc-4000-8000-0000000000d1' $$,
  'P0001',
  'SHIFT_ROLE_LOCKED',
  'assigned shift required_role cannot be changed'
);

-- ---------------------------------------------------------------------------
-- 13. Non-active org cannot be claimed (suspend then claim unpublished path)
-- ---------------------------------------------------------------------------

reset role;
set local role postgres;

insert into public.shifts (
  id, organization_id, location_id, required_role,
  starts_at, ends_at, break_minutes, rate_minor, currency, status, acceptance_deadline
) values (
  'b3000001-cccc-4000-8000-0000000000d5',
  'b3000001-cccc-4000-8000-0000000000a1',
  'b3000001-cccc-4000-8000-0000000000c1',
  'registered_nurse',
  now() + interval '12 days', now() + interval '12 days 8 hours',
  30, 2500, 'EUR', 'published', now() + interval '11 days'
);

select set_config('bridgehive.allow_org_lifecycle', 'on', true);
update public.organizations
set status = 'suspended'
where id = 'b3000001-cccc-4000-8000-0000000000a1';
select set_config('bridgehive.allow_org_lifecycle', 'off', true);

reset role;
select pg_temp.auth_as('b3000001-0000-4000-8000-000000000302');

select throws_ok(
  $$ select public.claim_shift('b3000001-cccc-4000-8000-0000000000d5') $$,
  'P0001',
  'ORG_NOT_ACTIVE',
  'shift from non-active organization cannot be claimed'
);

-- ---------------------------------------------------------------------------
-- 14. Pending org cannot create shifts
-- ---------------------------------------------------------------------------

reset role;
set local role postgres;
select set_config('bridgehive.allow_org_lifecycle', 'on', true);
update public.organizations
set status = 'pending'
where id = 'b3000001-cccc-4000-8000-0000000000a1';
select set_config('bridgehive.allow_org_lifecycle', 'off', true);

reset role;
select pg_temp.auth_as('b3000001-0000-4000-8000-000000000301');

select throws_ok(
  $$ insert into public.shifts (
       id, organization_id, location_id, required_role,
       starts_at, ends_at, break_minutes, rate_minor, currency, status
     ) values (
       'b3000001-cccc-4000-8000-0000000000d6',
       'b3000001-cccc-4000-8000-0000000000a1',
       'b3000001-cccc-4000-8000-0000000000c1',
       'registered_nurse',
       now() + interval '13 days', now() + interval '13 days 8 hours',
       30, 2500, 'EUR', 'draft'
     ) $$,
  '42501',
  'new row violates row-level security policy for table "shifts"',
  'pending organization cannot create shifts'
);

-- Restore org for cleanup consistency inside transaction
reset role;
set local role postgres;
select set_config('bridgehive.allow_org_lifecycle', 'on', true);
update public.organizations
set status = 'active'
where id = 'b3000001-cccc-4000-8000-0000000000a1';
select set_config('bridgehive.allow_org_lifecycle', 'off', true);

-- ---------------------------------------------------------------------------
-- 15. Cross-role eligibility reason when both published and open
-- ---------------------------------------------------------------------------

insert into public.shifts (
  id, organization_id, location_id, required_role,
  starts_at, ends_at, break_minutes, rate_minor, currency, status, acceptance_deadline
) values (
  'b3000001-cccc-4000-8000-0000000000d7',
  'b3000001-cccc-4000-8000-0000000000a1',
  'b3000001-cccc-4000-8000-0000000000c1',
  'registered_nurse',
  now() + interval '14 days', now() + interval '14 days 8 hours',
  30, 2500, 'EUR', 'published', now() + interval '13 days'
);

reset role;
select pg_temp.auth_as('b3000001-0000-4000-8000-000000000303');

select throws_ok(
  $$ select public.claim_shift('b3000001-cccc-4000-8000-0000000000d7') $$,
  'P0001',
  'NOT_ELIGIBLE:role_mismatch',
  'ward assistant cannot claim open nurse shift'
);

select * from finish();
rollback;
