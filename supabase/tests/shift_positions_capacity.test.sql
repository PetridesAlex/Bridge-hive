-- shift_positions_capacity.test.sql
-- Multi-position claims, overflow reject, reopen on withdraw, legacy default 1.

begin;

select plan(12);

create extension if not exists pgtap with schema extensions;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  (
    '00000000-0000-0000-0000-000000000000',
    'd3100001-0000-4000-8000-000000000001',
    'authenticated', 'authenticated', 'pos-admin@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Positions Admin"}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'd3100001-0000-4000-8000-000000000002',
    'authenticated', 'authenticated', 'pos-nurse-a@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Positions Nurse A"}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'd3100001-0000-4000-8000-000000000003',
    'authenticated', 'authenticated', 'pos-nurse-b@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Positions Nurse B"}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'd3100001-0000-4000-8000-000000000004',
    'authenticated', 'authenticated', 'pos-nurse-c@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Positions Nurse C"}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'd3100001-0000-4000-8000-000000000005',
    'authenticated', 'authenticated', 'pos-nurse-d@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Positions Nurse D"}'::jsonb, now(), now()
  )
on conflict (id) do nothing;

insert into public.profiles (id, full_name, account_status) values
  ('d3100001-0000-4000-8000-000000000001', 'Positions Admin', 'active'),
  ('d3100001-0000-4000-8000-000000000002', 'Positions Nurse A', 'active'),
  ('d3100001-0000-4000-8000-000000000003', 'Positions Nurse B', 'active'),
  ('d3100001-0000-4000-8000-000000000004', 'Positions Nurse C', 'active'),
  ('d3100001-0000-4000-8000-000000000005', 'Positions Nurse D', 'active')
on conflict (id) do update set account_status = excluded.account_status;

insert into public.organizations (id, legal_name, display_name, slug, status)
values (
  'd3100001-cccc-4000-8000-0000000000a1',
  'Positions Org Ltd', 'Positions Org', 'positions-org', 'active'
)
on conflict (id) do nothing;

insert into public.organization_members (organization_id, user_id, role, status, accepted_at)
values (
  'd3100001-cccc-4000-8000-0000000000a1',
  'd3100001-0000-4000-8000-000000000001',
  'org_admin', 'active', now()
)
on conflict (organization_id, user_id) do nothing;

insert into public.locations (id, organization_id, name)
values (
  'd3100001-cccc-4000-8000-0000000000c1',
  'd3100001-cccc-4000-8000-0000000000a1',
  'Positions Site'
)
on conflict (id) do nothing;

insert into public.worker_profiles (user_id, worker_role, onboarding_status)
values
  ('d3100001-0000-4000-8000-000000000002', 'registered_nurse', 'completed'),
  ('d3100001-0000-4000-8000-000000000003', 'registered_nurse', 'completed'),
  ('d3100001-0000-4000-8000-000000000004', 'registered_nurse', 'completed'),
  ('d3100001-0000-4000-8000-000000000005', 'registered_nurse', 'completed')
on conflict (user_id) do update
set worker_role = excluded.worker_role,
    onboarding_status = excluded.onboarding_status;

select set_config('bridgehive.allow_platform_verify', 'on', true);

update public.worker_profiles
set verification_status = 'verified'
where user_id in (
  'd3100001-0000-4000-8000-000000000002',
  'd3100001-0000-4000-8000-000000000003',
  'd3100001-0000-4000-8000-000000000004',
  'd3100001-0000-4000-8000-000000000005'
);

insert into public.payout_accounts (
  worker_id, country, currency, masked_iban, status, verified_at, last_verified_at
)
select
  u.id, 'CY', 'EUR', 'CY••••' || right(u.id::text, 4), 'verified', now(), now()
from (
  values
    ('d3100001-0000-4000-8000-000000000002'::uuid),
    ('d3100001-0000-4000-8000-000000000003'::uuid),
    ('d3100001-0000-4000-8000-000000000004'::uuid),
    ('d3100001-0000-4000-8000-000000000005'::uuid)
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
    ('d3100001-0000-4000-8000-000000000002'::uuid),
    ('d3100001-0000-4000-8000-000000000003'::uuid),
    ('d3100001-0000-4000-8000-000000000004'::uuid),
    ('d3100001-0000-4000-8000-000000000005'::uuid)
) as w(id)
cross join unnest(public.worker_required_credential_types('registered_nurse')) as t(cred_type);

update public.credentials
set status = 'verified', verified_at = now()
where worker_id in (
  'd3100001-0000-4000-8000-000000000002',
  'd3100001-0000-4000-8000-000000000003',
  'd3100001-0000-4000-8000-000000000004',
  'd3100001-0000-4000-8000-000000000005'
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

-- Legacy insert without required_positions defaults to 1
reset role;
select pg_temp.auth_as('d3100001-0000-4000-8000-000000000001');

select lives_ok(
  $$ insert into public.shifts (
       id, organization_id, location_id, required_role,
       starts_at, ends_at, break_minutes, rate_minor, currency, status, acceptance_deadline
     ) values (
       'd3100001-cccc-4000-8000-0000000000d0',
       'd3100001-cccc-4000-8000-0000000000a1',
       'd3100001-cccc-4000-8000-0000000000c1',
       'registered_nurse',
       now() + interval '4 days', now() + interval '4 days 8 hours',
       30, 2500, 'EUR', 'published', now() + interval '3 days'
     ) $$,
  'legacy insert without required_positions succeeds'
);

select is(
  (
    select required_positions
    from public.shifts
    where id = 'd3100001-cccc-4000-8000-0000000000d0'
  ),
  1,
  'legacy rows default required_positions to 1'
);

select lives_ok(
  $$ insert into public.shifts (
       id, organization_id, location_id, required_role, required_positions,
       starts_at, ends_at, break_minutes, rate_minor, currency, status, acceptance_deadline
     ) values (
       'd3100001-cccc-4000-8000-0000000000d1',
       'd3100001-cccc-4000-8000-0000000000a1',
       'd3100001-cccc-4000-8000-0000000000c1',
       'registered_nurse',
       3,
       now() + interval '5 days', now() + interval '5 days 8 hours',
       30, 2500, 'EUR', 'published', now() + interval '4 days'
     ) $$,
  'admin can create published shift with 3 positions'
);

-- Three claims succeed; status stays published until the third
reset role;
select pg_temp.auth_as('d3100001-0000-4000-8000-000000000002');
select lives_ok(
  $$ select public.claim_shift('d3100001-cccc-4000-8000-0000000000d1') $$,
  'first claim succeeds'
);

select is(
  (select status::text from public.shifts where id = 'd3100001-cccc-4000-8000-0000000000d1'),
  'published',
  'shift stays published after first of three claims'
);

reset role;
select pg_temp.auth_as('d3100001-0000-4000-8000-000000000003');
select lives_ok(
  $$ select public.claim_shift('d3100001-cccc-4000-8000-0000000000d1') $$,
  'second claim succeeds'
);

reset role;
select pg_temp.auth_as('d3100001-0000-4000-8000-000000000004');
select lives_ok(
  $$ select public.claim_shift('d3100001-cccc-4000-8000-0000000000d1') $$,
  'third claim succeeds'
);

select is(
  (select status::text from public.shifts where id = 'd3100001-cccc-4000-8000-0000000000d1'),
  'filled',
  'shift becomes filled when capacity is exhausted'
);

select is(
  public.shift_active_assignment_count('d3100001-cccc-4000-8000-0000000000d1'),
  3,
  'active assignment count equals required_positions'
);

-- Fourth claim rejected
reset role;
select pg_temp.auth_as('d3100001-0000-4000-8000-000000000005');
select throws_ok(
  $$ select public.claim_shift('d3100001-cccc-4000-8000-0000000000d1') $$,
  'P0001',
  'SHIFT_ALREADY_FILLED',
  'fourth claim is rejected when capacity is full'
);

-- Withdraw reopens capacity
reset role;
select set_config('bridgehive.allow_assignment_write', 'on', true);
update public.shift_assignments
set status = 'withdrawn'
where shift_id = 'd3100001-cccc-4000-8000-0000000000d1'
  and worker_id = 'd3100001-0000-4000-8000-000000000002';
select set_config('bridgehive.allow_assignment_write', 'off', true);

select is(
  (select status::text from public.shifts where id = 'd3100001-cccc-4000-8000-0000000000d1'),
  'published',
  'withdrawing an active assignment reopens a filled future shift'
);

select is(
  public.shift_open_positions('d3100001-cccc-4000-8000-0000000000d1'),
  1,
  'one open position remains after withdraw'
);

select * from finish();
rollback;
