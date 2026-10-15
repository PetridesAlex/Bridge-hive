-- multi_position_claim_availability.test.sql
-- Migration 035: SHIFT_FULL, shared availability RPC, validation, reopen, roles.

begin;

select plan(28);

create extension if not exists pgtap with schema extensions;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  (
    '00000000-0000-0000-0000-000000000000',
    'e3500001-0000-4000-8000-000000000001',
    'authenticated', 'authenticated', 'avail-admin@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Avail Admin"}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'e3500001-0000-4000-8000-0000000000a1',
    'authenticated', 'authenticated', 'avail-nurse-a@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Avail Nurse A"}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'e3500001-0000-4000-8000-0000000000b1',
    'authenticated', 'authenticated', 'avail-nurse-b@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Avail Nurse B"}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'e3500001-0000-4000-8000-0000000000c1',
    'authenticated', 'authenticated', 'avail-nurse-c@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Avail Nurse C"}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'e3500001-0000-4000-8000-0000000000w1',
    'authenticated', 'authenticated', 'avail-wa@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Avail Ward Assistant"}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'e3500001-0000-4000-8000-0000000000p1',
    'authenticated', 'authenticated', 'avail-pt@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Avail Physio"}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'e3500001-0000-4000-8000-0000000000u1',
    'authenticated', 'authenticated', 'avail-unverified@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Avail Unverified"}'::jsonb, now(), now()
  )
on conflict (id) do nothing;

insert into public.profiles (id, full_name, account_status) values
  ('e3500001-0000-4000-8000-000000000001', 'Avail Admin', 'active'),
  ('e3500001-0000-4000-8000-0000000000a1', 'Avail Nurse A', 'active'),
  ('e3500001-0000-4000-8000-0000000000b1', 'Avail Nurse B', 'active'),
  ('e3500001-0000-4000-8000-0000000000c1', 'Avail Nurse C', 'active'),
  ('e3500001-0000-4000-8000-0000000000w1', 'Avail Ward Assistant', 'active'),
  ('e3500001-0000-4000-8000-0000000000p1', 'Avail Physio', 'active'),
  ('e3500001-0000-4000-8000-0000000000u1', 'Avail Unverified', 'active')
on conflict (id) do update set account_status = excluded.account_status;

insert into public.organizations (id, legal_name, display_name, slug, status)
values (
  'e3500001-cccc-4000-8000-0000000000o1',
  'Avail Org Ltd', 'Avail Org', 'avail-org', 'active'
)
on conflict (id) do nothing;

insert into public.organization_members (organization_id, user_id, role, status, accepted_at)
values (
  'e3500001-cccc-4000-8000-0000000000o1',
  'e3500001-0000-4000-8000-000000000001',
  'org_admin', 'active', now()
)
on conflict (organization_id, user_id) do nothing;

insert into public.locations (id, organization_id, name)
values (
  'e3500001-cccc-4000-8000-0000000000l1',
  'e3500001-cccc-4000-8000-0000000000o1',
  'Avail Site'
)
on conflict (id) do nothing;

insert into public.worker_profiles (user_id, worker_role, onboarding_status)
values
  ('e3500001-0000-4000-8000-0000000000a1', 'registered_nurse', 'completed'),
  ('e3500001-0000-4000-8000-0000000000b1', 'registered_nurse', 'completed'),
  ('e3500001-0000-4000-8000-0000000000c1', 'registered_nurse', 'completed'),
  ('e3500001-0000-4000-8000-0000000000w1', 'ward_assistant', 'completed'),
  ('e3500001-0000-4000-8000-0000000000p1', 'physiotherapist', 'completed'),
  ('e3500001-0000-4000-8000-0000000000u1', 'registered_nurse', 'completed')
on conflict (user_id) do update
set worker_role = excluded.worker_role,
    onboarding_status = excluded.onboarding_status;

select set_config('bridgehive.allow_platform_verify', 'on', true);

update public.worker_profiles
set verification_status = 'verified'
where user_id in (
  'e3500001-0000-4000-8000-0000000000a1',
  'e3500001-0000-4000-8000-0000000000b1',
  'e3500001-0000-4000-8000-0000000000c1',
  'e3500001-0000-4000-8000-0000000000w1',
  'e3500001-0000-4000-8000-0000000000p1'
);

update public.worker_profiles
set verification_status = 'submitted'
where user_id = 'e3500001-0000-4000-8000-0000000000u1';

insert into public.payout_accounts (
  worker_id, country, currency, masked_iban, status, verified_at, last_verified_at
)
select
  u.id, 'CY', 'EUR', 'CY••••' || right(u.id::text, 4), 'verified', now(), now()
from (
  values
    ('e3500001-0000-4000-8000-0000000000a1'::uuid),
    ('e3500001-0000-4000-8000-0000000000b1'::uuid),
    ('e3500001-0000-4000-8000-0000000000c1'::uuid),
    ('e3500001-0000-4000-8000-0000000000w1'::uuid),
    ('e3500001-0000-4000-8000-0000000000p1'::uuid),
    ('e3500001-0000-4000-8000-0000000000u1'::uuid)
) as u(id)
on conflict (worker_id) do update
set status = 'verified', verified_at = now(), last_verified_at = now();

insert into public.credentials (
  worker_id, credential_type, status, expires_at, storage_path, storage_paths
)
select
  w.id,
  t.cred_type,
  'pending',
  now() + interval '1 year',
  w.id::text || '/' || t.cred_type || '/seed.pdf',
  jsonb_build_array(w.id::text || '/' || t.cred_type || '/seed.pdf')
from (
  values
    ('e3500001-0000-4000-8000-0000000000a1'::uuid, 'registered_nurse'::public.worker_role),
    ('e3500001-0000-4000-8000-0000000000b1'::uuid, 'registered_nurse'::public.worker_role),
    ('e3500001-0000-4000-8000-0000000000c1'::uuid, 'registered_nurse'::public.worker_role),
    ('e3500001-0000-4000-8000-0000000000w1'::uuid, 'ward_assistant'::public.worker_role),
    ('e3500001-0000-4000-8000-0000000000p1'::uuid, 'physiotherapist'::public.worker_role),
    ('e3500001-0000-4000-8000-0000000000u1'::uuid, 'registered_nurse'::public.worker_role)
) as w(id, role)
cross join lateral unnest(public.worker_required_credential_types(w.role)) as t(cred_type);

update public.credentials
set status = 'verified', verified_at = now()
where worker_id in (
  'e3500001-0000-4000-8000-0000000000a1',
  'e3500001-0000-4000-8000-0000000000b1',
  'e3500001-0000-4000-8000-0000000000c1',
  'e3500001-0000-4000-8000-0000000000w1',
  'e3500001-0000-4000-8000-0000000000p1',
  'e3500001-0000-4000-8000-0000000000u1'
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

-- Positions validation
reset role;
select pg_temp.auth_as('e3500001-0000-4000-8000-000000000001');

select throws_ok(
  $$ insert into public.shifts (
       id, organization_id, location_id, required_role, required_positions,
       starts_at, ends_at, break_minutes, rate_minor, currency, status, acceptance_deadline
     ) values (
       'e3500001-cccc-4000-8000-0000000000z0',
       'e3500001-cccc-4000-8000-0000000000o1',
       'e3500001-cccc-4000-8000-0000000000l1',
       'registered_nurse', 0,
       now() + interval '10 days', now() + interval '10 days 8 hours',
       30, 2500, 'EUR', 'published', now() + interval '9 days'
     ) $$,
  '23514',
  null,
  'positions 0 is rejected'
);

select throws_ok(
  $$ insert into public.shifts (
       id, organization_id, location_id, required_role, required_positions,
       starts_at, ends_at, break_minutes, rate_minor, currency, status, acceptance_deadline
     ) values (
       'e3500001-cccc-4000-8000-0000000000z1',
       'e3500001-cccc-4000-8000-0000000000o1',
       'e3500001-cccc-4000-8000-0000000000l1',
       'registered_nurse', 101,
       now() + interval '10 days', now() + interval '10 days 8 hours',
       30, 2500, 'EUR', 'published', now() + interval '9 days'
     ) $$,
  '23514',
  null,
  'positions >100 is rejected'
);

select throws_ok(
  $$ insert into public.shifts (
       id, organization_id, location_id, required_role, required_positions,
       starts_at, ends_at, break_minutes, rate_minor, currency, status, acceptance_deadline
     ) values (
       'e3500001-cccc-4000-8000-0000000000z2',
       'e3500001-cccc-4000-8000-0000000000o1',
       'e3500001-cccc-4000-8000-0000000000l1',
       'registered_nurse', -1,
       now() + interval '10 days', now() + interval '10 days 8 hours',
       30, 2500, 'EUR', 'published', now() + interval '9 days'
     ) $$,
  '23514',
  null,
  'negative positions rejected'
);

-- One-position: A succeeds, B gets SHIFT_FULL
select lives_ok(
  $$ insert into public.shifts (
       id, organization_id, location_id, required_role, required_positions,
       starts_at, ends_at, break_minutes, rate_minor, currency, status, acceptance_deadline
     ) values (
       'e3500001-cccc-4000-8000-0000000000d1',
       'e3500001-cccc-4000-8000-0000000000o1',
       'e3500001-cccc-4000-8000-0000000000l1',
       'registered_nurse', 1,
       now() + interval '11 days', now() + interval '11 days 8 hours',
       30, 2500, 'EUR', 'published', now() + interval '10 days'
     ) $$,
  'one-position shift created'
);

reset role;
select pg_temp.auth_as('e3500001-0000-4000-8000-0000000000a1');
select lives_ok(
  $$ select public.claim_shift('e3500001-cccc-4000-8000-0000000000d1') $$,
  'one-position: worker A claims'
);

reset role;
select pg_temp.auth_as('e3500001-0000-4000-8000-0000000000b1');
select throws_ok(
  $$ select public.claim_shift('e3500001-cccc-4000-8000-0000000000d1') $$,
  'P0001',
  'SHIFT_FULL',
  'one-position: worker B rejected as SHIFT_FULL'
);

-- Two-position: A and B succeed; C gets SHIFT_FULL; first claim stays published
reset role;
select pg_temp.auth_as('e3500001-0000-4000-8000-000000000001');
select lives_ok(
  $$ insert into public.shifts (
       id, organization_id, location_id, required_role, required_positions,
       starts_at, ends_at, break_minutes, rate_minor, currency, status, acceptance_deadline
     ) values (
       'e3500001-cccc-4000-8000-0000000000d2',
       'e3500001-cccc-4000-8000-0000000000o1',
       'e3500001-cccc-4000-8000-0000000000l1',
       'registered_nurse', 2,
       now() + interval '12 days', now() + interval '12 days 8 hours',
       30, 2500, 'EUR', 'published', now() + interval '11 days'
     ) $$,
  'two-position shift created'
);

reset role;
select pg_temp.auth_as('e3500001-0000-4000-8000-0000000000a1');
select lives_ok(
  $$ select public.claim_shift('e3500001-cccc-4000-8000-0000000000d2') $$,
  'two-position: worker A claims'
);

select is(
  (select status::text from public.shifts where id = 'e3500001-cccc-4000-8000-0000000000d2'),
  'published',
  'first claim leaves two-position shift published'
);

select is(
  (select open_positions from public.worker_shift_claim_availability('e3500001-cccc-4000-8000-0000000000d2')),
  1,
  'availability shows 1 open after first claim'
);

select is(
  (select is_claimable from public.worker_shift_claim_availability('e3500001-cccc-4000-8000-0000000000d2')),
  false,
  'assigned worker is not claimable again'
);

reset role;
select pg_temp.auth_as('e3500001-0000-4000-8000-0000000000b1');
select lives_ok(
  $$ select public.claim_shift('e3500001-cccc-4000-8000-0000000000d2') $$,
  'two-position: worker B claims'
);

select is(
  (select status::text from public.shifts where id = 'e3500001-cccc-4000-8000-0000000000d2'),
  'filled',
  'shift fills when both positions taken'
);

reset role;
select pg_temp.auth_as('e3500001-0000-4000-8000-0000000000c1');
select throws_ok(
  $$ select public.claim_shift('e3500001-cccc-4000-8000-0000000000d2') $$,
  'P0001',
  'SHIFT_FULL',
  'two-position: worker C rejected as SHIFT_FULL'
);

-- Same worker cannot take two seats (idempotent return)
reset role;
select pg_temp.auth_as('e3500001-0000-4000-8000-0000000000a1');
select is(
  (
    select count(*)::integer
    from public.claim_shift('e3500001-cccc-4000-8000-0000000000d2') c
    join public.shift_assignments sa on sa.id = c.id
  ),
  1,
  'same worker reclaim returns existing assignment'
);

select is(
  (
    select count(*)::integer
    from public.shift_assignments
    where shift_id = 'e3500001-cccc-4000-8000-0000000000d2'
      and worker_id = 'e3500001-0000-4000-8000-0000000000a1'
      and status = 'accepted'
  ),
  1,
  'same worker has exactly one active assignment'
);

-- Capacity reopen after withdraw; rejected/no_show do not consume
reset role;
select set_config('bridgehive.allow_assignment_write', 'on', true);
update public.shift_assignments
set status = 'withdrawn'
where shift_id = 'e3500001-cccc-4000-8000-0000000000d2'
  and worker_id = 'e3500001-0000-4000-8000-0000000000b1';
select set_config('bridgehive.allow_assignment_write', 'off', true);

select is(
  (select status::text from public.shifts where id = 'e3500001-cccc-4000-8000-0000000000d2'),
  'published',
  'withdraw reopens filled future shift'
);

reset role;
select pg_temp.auth_as('e3500001-0000-4000-8000-0000000000c1');
select lives_ok(
  $$ select public.claim_shift('e3500001-cccc-4000-8000-0000000000d2') $$,
  'worker C claims reopened seat'
);

reset role;
select set_config('bridgehive.allow_assignment_write', 'on', true);
insert into public.shift_assignments (shift_id, worker_id, status, accepted_at)
values (
  'e3500001-cccc-4000-8000-0000000000d2',
  'e3500001-0000-4000-8000-0000000000b1',
  'rejected',
  now()
);
insert into public.shift_assignments (shift_id, worker_id, status, accepted_at)
values (
  'e3500001-cccc-4000-8000-0000000000d1',
  'e3500001-0000-4000-8000-0000000000c1',
  'no_show',
  now()
);
select set_config('bridgehive.allow_assignment_write', 'off', true);

select is(
  public.shift_active_assignment_count('e3500001-cccc-4000-8000-0000000000d2'),
  2,
  'rejected assignment does not consume capacity'
);

-- Role claims
reset role;
select pg_temp.auth_as('e3500001-0000-4000-8000-000000000001');
insert into public.shifts (
  id, organization_id, location_id, required_role, required_positions,
  starts_at, ends_at, break_minutes, rate_minor, currency, status, acceptance_deadline
) values
  (
    'e3500001-cccc-4000-8000-0000000000dw',
    'e3500001-cccc-4000-8000-0000000000o1',
    'e3500001-cccc-4000-8000-0000000000l1',
    'ward_assistant', 1,
    now() + interval '13 days', now() + interval '13 days 8 hours',
    30, 1800, 'EUR', 'published', now() + interval '12 days'
  ),
  (
    'e3500001-cccc-4000-8000-0000000000dp',
    'e3500001-cccc-4000-8000-0000000000o1',
    'e3500001-cccc-4000-8000-0000000000l1',
    'physiotherapist', 1,
    now() + interval '14 days', now() + interval '14 days 8 hours',
    30, 2800, 'EUR', 'published', now() + interval '13 days'
  ),
  (
    'e3500001-cccc-4000-8000-0000000000dr',
    'e3500001-cccc-4000-8000-0000000000o1',
    'e3500001-cccc-4000-8000-0000000000l1',
    'registered_nurse', 1,
    now() + interval '15 days', now() + interval '15 days 8 hours',
    30, 2500, 'EUR', 'published', now() + interval '14 days'
  );

reset role;
select pg_temp.auth_as('e3500001-0000-4000-8000-0000000000w1');
select lives_ok(
  $$ select public.claim_shift('e3500001-cccc-4000-8000-0000000000dw') $$,
  'ward assistant claims matching role'
);

reset role;
select pg_temp.auth_as('e3500001-0000-4000-8000-0000000000p1');
select lives_ok(
  $$ select public.claim_shift('e3500001-cccc-4000-8000-0000000000dp') $$,
  'physiotherapist claims matching role'
);

reset role;
select pg_temp.auth_as('e3500001-0000-4000-8000-0000000000w1');
select throws_ok(
  $$ select public.claim_shift('e3500001-cccc-4000-8000-0000000000dr') $$,
  'P0001',
  'NOT_ELIGIBLE:role_mismatch',
  'wrong role cannot claim'
);

reset role;
select pg_temp.auth_as('e3500001-0000-4000-8000-0000000000u1');
select throws_ok(
  $$ select public.claim_shift('e3500001-cccc-4000-8000-0000000000dr') $$,
  'P0001',
  'NOT_ELIGIBLE:not_verified',
  'unverified worker cannot claim'
);

-- Details RPC surfaces capacity fields consistently
reset role;
select pg_temp.auth_as('e3500001-0000-4000-8000-0000000000b1');
select is(
  (
    select open_positions
    from public.get_worker_shift_details('e3500001-cccc-4000-8000-0000000000d2')
  ),
  (
    select open_positions
    from public.worker_shift_claim_availability('e3500001-cccc-4000-8000-0000000000d2')
  ),
  'details and availability RPC agree on open_positions'
);

select is(
  (
    select filled_positions
    from public.get_worker_shift_details('e3500001-cccc-4000-8000-0000000000d2')
  ),
  2,
  'details reports filled_positions'
);

select * from finish();
rollback;
