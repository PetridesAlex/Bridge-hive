-- shift_positions_four_capacity.test.sql
-- Four-position sequential claims, overflow, occupancy statuses, withdraw,
-- ended/cancelled guards, capacity floor, no invoice on claim.
-- Sequential only — see shift_positions_last_seat_race.test.sql for concurrency.

begin;

select plan(22);

create extension if not exists pgtap with schema extensions;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  (
    '00000000-0000-0000-0000-000000000000',
    'd3140001-0000-4000-8000-000000000001',
    'authenticated', 'authenticated', 'four-admin@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Four Admin"}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'd3140001-0000-4000-8000-000000000002',
    'authenticated', 'authenticated', 'four-nurse-a@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Four Nurse A"}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'd3140001-0000-4000-8000-000000000003',
    'authenticated', 'authenticated', 'four-nurse-b@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Four Nurse B"}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'd3140001-0000-4000-8000-000000000004',
    'authenticated', 'authenticated', 'four-nurse-c@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Four Nurse C"}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'd3140001-0000-4000-8000-000000000005',
    'authenticated', 'authenticated', 'four-nurse-d@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Four Nurse D"}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'd3140001-0000-4000-8000-000000000006',
    'authenticated', 'authenticated', 'four-nurse-e@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Four Nurse E"}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'd3140001-0000-4000-8000-000000000007',
    'authenticated', 'authenticated', 'four-wa@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Four WA"}'::jsonb, now(), now()
  )
on conflict (id) do nothing;

insert into public.profiles (id, full_name, account_status) values
  ('d3140001-0000-4000-8000-000000000001', 'Four Admin', 'active'),
  ('d3140001-0000-4000-8000-000000000002', 'Four Nurse A', 'active'),
  ('d3140001-0000-4000-8000-000000000003', 'Four Nurse B', 'active'),
  ('d3140001-0000-4000-8000-000000000004', 'Four Nurse C', 'active'),
  ('d3140001-0000-4000-8000-000000000005', 'Four Nurse D', 'active'),
  ('d3140001-0000-4000-8000-000000000006', 'Four Nurse E', 'active'),
  ('d3140001-0000-4000-8000-000000000007', 'Four WA', 'active')
on conflict (id) do update set account_status = excluded.account_status;

insert into public.organizations (id, legal_name, display_name, slug, status)
values (
  'd3140001-cccc-4000-8000-0000000000a1',
  'Four Cap Org Ltd', 'Four Cap Org', 'four-cap-org', 'active'
)
on conflict (id) do nothing;

insert into public.organization_members (organization_id, user_id, role, status, accepted_at)
values (
  'd3140001-cccc-4000-8000-0000000000a1',
  'd3140001-0000-4000-8000-000000000001',
  'org_admin', 'active', now()
)
on conflict (organization_id, user_id) do nothing;

insert into public.locations (id, organization_id, name)
values (
  'd3140001-cccc-4000-8000-0000000000c1',
  'd3140001-cccc-4000-8000-0000000000a1',
  'Four Cap Site'
)
on conflict (id) do nothing;

insert into public.worker_profiles (user_id, worker_role, onboarding_status)
values
  ('d3140001-0000-4000-8000-000000000002', 'registered_nurse', 'completed'),
  ('d3140001-0000-4000-8000-000000000003', 'registered_nurse', 'completed'),
  ('d3140001-0000-4000-8000-000000000004', 'registered_nurse', 'completed'),
  ('d3140001-0000-4000-8000-000000000005', 'registered_nurse', 'completed'),
  ('d3140001-0000-4000-8000-000000000006', 'registered_nurse', 'completed'),
  ('d3140001-0000-4000-8000-000000000007', 'ward_assistant', 'completed')
on conflict (user_id) do update
set worker_role = excluded.worker_role,
    onboarding_status = excluded.onboarding_status;

select set_config('bridgehive.allow_platform_verify', 'on', true);

update public.worker_profiles
set verification_status = 'verified'
where user_id in (
  'd3140001-0000-4000-8000-000000000002',
  'd3140001-0000-4000-8000-000000000003',
  'd3140001-0000-4000-8000-000000000004',
  'd3140001-0000-4000-8000-000000000005',
  'd3140001-0000-4000-8000-000000000006',
  'd3140001-0000-4000-8000-000000000007'
);

insert into public.payout_accounts (
  worker_id, country, currency, masked_iban, status, verified_at, last_verified_at
)
select
  u.id, 'CY', 'EUR', 'CY••••' || right(u.id::text, 4), 'verified', now(), now()
from (
  values
    ('d3140001-0000-4000-8000-000000000002'::uuid),
    ('d3140001-0000-4000-8000-000000000003'::uuid),
    ('d3140001-0000-4000-8000-000000000004'::uuid),
    ('d3140001-0000-4000-8000-000000000005'::uuid),
    ('d3140001-0000-4000-8000-000000000006'::uuid),
    ('d3140001-0000-4000-8000-000000000007'::uuid)
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
    ('d3140001-0000-4000-8000-000000000002'::uuid),
    ('d3140001-0000-4000-8000-000000000003'::uuid),
    ('d3140001-0000-4000-8000-000000000004'::uuid),
    ('d3140001-0000-4000-8000-000000000005'::uuid),
    ('d3140001-0000-4000-8000-000000000006'::uuid)
) as w(id)
cross join unnest(public.worker_required_credential_types('registered_nurse')) as t(cred_type);

insert into public.credentials (
  worker_id, credential_type, status, expires_at, storage_path, storage_paths
)
select
  'd3140001-0000-4000-8000-000000000007'::uuid,
  t.cred_type,
  'pending',
  now() + interval '1 year',
  'd3140001-0000-4000-8000-000000000007/' || t.cred_type || '/seed.pdf',
  jsonb_build_array('d3140001-0000-4000-8000-000000000007/' || t.cred_type || '/seed.pdf')
from unnest(public.worker_required_credential_types('ward_assistant')) as t(cred_type);

update public.credentials
set status = 'verified', verified_at = now()
where worker_id in (
  'd3140001-0000-4000-8000-000000000002',
  'd3140001-0000-4000-8000-000000000003',
  'd3140001-0000-4000-8000-000000000004',
  'd3140001-0000-4000-8000-000000000005',
  'd3140001-0000-4000-8000-000000000006',
  'd3140001-0000-4000-8000-000000000007'
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

-- Four-position published shift
reset role;
select pg_temp.auth_as('d3140001-0000-4000-8000-000000000001');
select lives_ok(
  $$ insert into public.shifts (
       id, organization_id, location_id, required_role, required_positions,
       starts_at, ends_at, break_minutes, rate_minor, currency, status, acceptance_deadline
     ) values (
       'd3140001-cccc-4000-8000-0000000000s1',
       'd3140001-cccc-4000-8000-0000000000a1',
       'd3140001-cccc-4000-8000-0000000000c1',
       'registered_nurse',
       4,
       now() + interval '6 days', now() + interval '6 days 8 hours',
       30, 2500, 'EUR', 'published', now() + interval '5 days'
     ) $$,
  'admin creates four-position published shift'
);

-- Four distinct eligible nurses claim
reset role;
select pg_temp.auth_as('d3140001-0000-4000-8000-000000000002');
select lives_ok(
  $$ select public.claim_shift('d3140001-cccc-4000-8000-0000000000s1') $$,
  'nurse A claims position 1/4'
);

reset role;
select pg_temp.auth_as('d3140001-0000-4000-8000-000000000003');
select lives_ok(
  $$ select public.claim_shift('d3140001-cccc-4000-8000-0000000000s1') $$,
  'nurse B claims position 2/4'
);

reset role;
select pg_temp.auth_as('d3140001-0000-4000-8000-000000000004');
select lives_ok(
  $$ select public.claim_shift('d3140001-cccc-4000-8000-0000000000s1') $$,
  'nurse C claims position 3/4'
);

reset role;
select pg_temp.auth_as('d3140001-0000-4000-8000-000000000005');
select lives_ok(
  $$ select public.claim_shift('d3140001-cccc-4000-8000-0000000000s1') $$,
  'nurse D claims position 4/4'
);

select is(
  (select status::text from public.shifts where id = 'd3140001-cccc-4000-8000-0000000000s1'),
  'filled',
  'shift becomes filled after fourth claim'
);

select is(
  public.shift_active_assignment_count('d3140001-cccc-4000-8000-0000000000s1'),
  4,
  'occupancy equals required_positions'
);

-- Fifth rejected
reset role;
select pg_temp.auth_as('d3140001-0000-4000-8000-000000000006');
select throws_ok(
  $$ select public.claim_shift('d3140001-cccc-4000-8000-0000000000s1') $$,
  'P0001',
  'SHIFT_ALREADY_FILLED',
  'fifth nurse rejected when capacity full'
);

-- Same worker cannot occupy two positions (idempotent)
reset role;
select pg_temp.auth_as('d3140001-0000-4000-8000-000000000002');
select lives_ok(
  $$ select public.claim_shift('d3140001-cccc-4000-8000-0000000000s1') $$,
  'repeat claim by nurse A is idempotent'
);

select is(
  (
    select count(*)::integer
    from public.shift_assignments
    where shift_id = 'd3140001-cccc-4000-8000-0000000000s1'
      and worker_id = 'd3140001-0000-4000-8000-000000000002'
      and status in ('accepted', 'checked_in', 'checked_out', 'submitted', 'approved')
  ),
  1,
  'retries do not duplicate occupying assignments for the same worker'
);

select is(
  public.shift_active_assignment_count('d3140001-cccc-4000-8000-0000000000s1'),
  4,
  'idempotent retry does not change occupancy'
);

-- No invoice on claim
select is(
  (
    select count(*)::integer
    from public.worker_commission_invoices i
    join public.shift_assignments a on a.id = i.assignment_id
    where a.shift_id = 'd3140001-cccc-4000-8000-0000000000s1'
  ),
  0,
  'claim does not generate commission invoices'
);

-- Role guard still applies
reset role;
select pg_temp.auth_as('d3140001-0000-4000-8000-000000000007');
select throws_ok(
  $$ select public.claim_shift('d3140001-cccc-4000-8000-0000000000s1') $$,
  'P0001',
  'NOT_ELIGIBLE:role_mismatch',
  'ward assistant cannot claim nurse four-position shift'
);

-- Withdraw restores one seat when still future
reset role;
select set_config('bridgehive.allow_assignment_write', 'on', true);
update public.shift_assignments
set status = 'withdrawn'
where shift_id = 'd3140001-cccc-4000-8000-0000000000s1'
  and worker_id = 'd3140001-0000-4000-8000-000000000005';
select set_config('bridgehive.allow_assignment_write', 'off', true);

select is(
  (select status::text from public.shifts where id = 'd3140001-cccc-4000-8000-0000000000s1'),
  'published',
  'withdrawing an active assignment reopens a filled future shift'
);

select is(
  public.shift_open_positions('d3140001-cccc-4000-8000-0000000000s1'),
  1,
  'one open position remains after permitted withdraw'
);

-- Occupancy statuses: withdrawn does not occupy; rejected/no_show do not occupy
select is(
  public.shift_active_assignment_count('d3140001-cccc-4000-8000-0000000000s1'),
  3,
  'withdrawn assignment no longer occupies capacity'
);

-- Capacity cannot drop below occupied (requires 043 guard)
reset role;
select pg_temp.auth_as('d3140001-0000-4000-8000-000000000001');
select throws_ok(
  $$ update public.shifts
     set required_positions = 2
     where id = 'd3140001-cccc-4000-8000-0000000000s1' $$,
  'P0001',
  'CAPACITY_BELOW_OCCUPIED',
  'reducing positions below occupied assignments is rejected'
);

-- Ended shift does not reopen on withdraw
reset role;
select pg_temp.auth_as('d3140001-0000-4000-8000-000000000001');
select lives_ok(
  $$ insert into public.shifts (
       id, organization_id, location_id, required_role, required_positions,
       starts_at, ends_at, break_minutes, rate_minor, currency, status, acceptance_deadline
     ) values (
       'd3140001-cccc-4000-8000-0000000000s2',
       'd3140001-cccc-4000-8000-0000000000a1',
       'd3140001-cccc-4000-8000-0000000000c1',
       'registered_nurse',
       1,
       now() - interval '2 days', now() - interval '2 days' + interval '8 hours',
       0, 2500, 'EUR', 'filled', now() - interval '3 days'
     ) $$,
  'admin seeds ended filled shift'
);

reset role;
select set_config('bridgehive.allow_assignment_write', 'on', true);
insert into public.shift_assignments (shift_id, worker_id, status, accepted_at)
values (
  'd3140001-cccc-4000-8000-0000000000s2',
  'd3140001-0000-4000-8000-000000000002',
  'accepted',
  now() - interval '3 days'
);
update public.shift_assignments
set status = 'withdrawn'
where shift_id = 'd3140001-cccc-4000-8000-0000000000s2'
  and worker_id = 'd3140001-0000-4000-8000-000000000002';
select set_config('bridgehive.allow_assignment_write', 'off', true);

select is(
  (select status::text from public.shifts where id = 'd3140001-cccc-4000-8000-0000000000s2'),
  'filled',
  'ended filled shift does not reopen on withdraw'
);

-- Cancelled shift is not claimable
reset role;
select pg_temp.auth_as('d3140001-0000-4000-8000-000000000001');
select lives_ok(
  $$ insert into public.shifts (
       id, organization_id, location_id, required_role, required_positions,
       starts_at, ends_at, break_minutes, rate_minor, currency, status, acceptance_deadline
     ) values (
       'd3140001-cccc-4000-8000-0000000000s3',
       'd3140001-cccc-4000-8000-0000000000a1',
       'd3140001-cccc-4000-8000-0000000000c1',
       'registered_nurse',
       2,
       now() + interval '8 days', now() + interval '8 days 8 hours',
       0, 2500, 'EUR', 'cancelled', now() + interval '7 days'
     ) $$,
  'admin seeds cancelled multi-position shift'
);

reset role;
select pg_temp.auth_as('d3140001-0000-4000-8000-000000000006');
select throws_ok(
  $$ select public.claim_shift('d3140001-cccc-4000-8000-0000000000s3') $$,
  'P0001',
  'SHIFT_NOT_AVAILABLE',
  'cancelled shift cannot be claimed'
);

select * from finish();
rollback;
