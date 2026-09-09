-- check_in_out.test.sql
-- Check-in window, ownership, anonymity, check-out, idempotency, direct-write lock.

begin;

select plan(13);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  (
    '00000000-0000-0000-0000-000000000000',
    'a1111111-1111-1111-1111-111111111111',
    'authenticated', 'authenticated', 'checkin-owner@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Checkin Owner"}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'a2222222-2222-2222-2222-222222222222',
    'authenticated', 'authenticated', 'checkin-other@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Checkin Other"}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'a3333333-3333-3333-3333-333333333333',
    'authenticated', 'authenticated', 'checkin-admin@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Checkin Admin"}'::jsonb, now(), now()
  )
on conflict (id) do nothing;

insert into public.profiles (id, full_name) values
  ('a1111111-1111-1111-1111-111111111111', 'Checkin Owner'),
  ('a2222222-2222-2222-2222-222222222222', 'Checkin Other'),
  ('a3333333-3333-3333-3333-333333333333', 'Checkin Admin')
on conflict (id) do nothing;

insert into public.organizations (id, legal_name, display_name, slug, status)
values (
  'aeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  'Checkin Org Ltd', 'Checkin Org', 'checkin-org-test', 'active'
)
on conflict (id) do nothing;

insert into public.organization_members (organization_id, user_id, role, status, accepted_at)
values (
  'aeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  'a3333333-3333-3333-3333-333333333333',
  'org_admin', 'active', now()
)
on conflict (organization_id, user_id) do nothing;

insert into public.locations (id, organization_id, name)
values (
  'aeeeeeee-eeee-eeee-eeee-eeeeeeee0001',
  'aeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  'Checkin Site'
)
on conflict (id) do nothing;

insert into public.worker_profiles (user_id, worker_role, onboarding_status)
values
  ('a1111111-1111-1111-1111-111111111111', 'registered_nurse', 'completed'),
  ('a2222222-2222-2222-2222-222222222222', 'registered_nurse', 'completed')
on conflict (user_id) do nothing;

update public.worker_profiles
set verification_status = 'verified'
where user_id in (
  'a1111111-1111-1111-1111-111111111111',
  'a2222222-2222-2222-2222-222222222222'
);

-- Shift A: currently within the pilot check-in window (started 5 minutes ago).
-- Shift B: starts tomorrow (too early for check-in).
insert into public.shifts (
  id, organization_id, location_id, required_role,
  starts_at, ends_at, break_minutes, rate_minor, currency, status, acceptance_deadline
) values
  (
    'aeeeeeee-eeee-eeee-eeee-eeeeeeee0002',
    'aeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    'aeeeeeee-eeee-eeee-eeee-eeeeeeee0001',
    'registered_nurse',
    now() - interval '5 minutes',
    now() + interval '7 hours 55 minutes',
    30, 2800, 'EUR', 'filled', now() - interval '1 day'
  ),
  (
    'aeeeeeee-eeee-eeee-eeee-eeeeeeee0003',
    'aeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    'aeeeeeee-eeee-eeee-eeee-eeeeeeee0001',
    'registered_nurse',
    now() + interval '1 day',
    now() + interval '1 day 8 hours',
    30, 2800, 'EUR', 'filled', now() + interval '12 hours'
  )
on conflict (id) do nothing;

select set_config('bridgehive.allow_assignment_write', 'on', true);
insert into public.shift_assignments (id, shift_id, worker_id, status, accepted_at)
values
  (
    'aeeeeeee-eeee-eeee-eeee-eeeeeeee0004',
    'aeeeeeee-eeee-eeee-eeee-eeeeeeee0002',
    'a1111111-1111-1111-1111-111111111111',
    'accepted',
    now() - interval '1 day'
  ),
  (
    'aeeeeeee-eeee-eeee-eeee-eeeeeeee0005',
    'aeeeeeee-eeee-eeee-eeee-eeeeeeee0003',
    'a1111111-1111-1111-1111-111111111111',
    'accepted',
    now() - interval '1 hour'
  )
on conflict (id) do nothing;
select set_config('bridgehive.allow_assignment_write', 'off', true);

-- ---------------------------------------------------------------------------
-- Anonymous check-in rejected
-- ---------------------------------------------------------------------------
reset role;
select set_config('request.jwt.claims', '', true);
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claim.role', '', true);

select throws_ok(
  $$ select public.check_in_assignment('aeeeeeee-eeee-eeee-eeee-eeeeeeee0004') $$,
  'P0001',
  'NOT_AUTHENTICATED',
  'anonymous check-in is rejected'
);

-- ---------------------------------------------------------------------------
-- Other worker cannot check in
-- ---------------------------------------------------------------------------
select set_config(
  'request.jwt.claims',
  '{"sub":"a2222222-2222-2222-2222-222222222222","role":"authenticated","aud":"authenticated"}',
  true
);
select set_config('request.jwt.claim.sub', 'a2222222-2222-2222-2222-222222222222', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select throws_ok(
  $$ select public.check_in_assignment('aeeeeeee-eeee-eeee-eeee-eeeeeeee0004') $$,
  'P0001',
  'NOT_AUTHORIZED',
  'another worker cannot check in'
);

-- ---------------------------------------------------------------------------
-- Check-in one day early is rejected
-- ---------------------------------------------------------------------------
select set_config(
  'request.jwt.claims',
  '{"sub":"a1111111-1111-1111-1111-111111111111","role":"authenticated","aud":"authenticated"}',
  true
);
select set_config('request.jwt.claim.sub', 'a1111111-1111-1111-1111-111111111111', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select throws_ok(
  $$ select public.check_in_assignment('aeeeeeee-eeee-eeee-eeee-eeeeeeee0005') $$,
  'P0001',
  'CHECK_IN_TOO_EARLY',
  'check-in one day early is rejected'
);

-- ---------------------------------------------------------------------------
-- Direct protected status update remains blocked
-- ---------------------------------------------------------------------------
select throws_ok(
  $$
    update public.shift_assignments
    set status = 'checked_in', check_in_at = now()
    where id = 'aeeeeeee-eeee-eeee-eeee-eeeeeeee0004'
  $$,
  'P0001',
  'ASSIGNMENT_TIMESTAMPS_LOCKED',
  'direct protected timestamp/status updates remain blocked'
);

-- Status-only direct update also blocked
select throws_ok(
  $$
    update public.shift_assignments
    set status = 'checked_in'
    where id = 'aeeeeeee-eeee-eeee-eeee-eeeeeeee0004'
  $$,
  'P0001',
  'ASSIGNMENT_STATUS_LOCKED',
  'direct checked_in status update remains blocked'
);

-- ---------------------------------------------------------------------------
-- Check-out before check-in is rejected
-- ---------------------------------------------------------------------------
select throws_ok(
  $$ select public.check_out_assignment('aeeeeeee-eeee-eeee-eeee-eeeeeeee0004') $$,
  'P0001',
  'ASSIGNMENT_NOT_CHECKED_IN',
  'check-out before check-in is rejected'
);

-- ---------------------------------------------------------------------------
-- Owner checks in successfully within the allowed window
-- ---------------------------------------------------------------------------
select lives_ok(
  $$ select public.check_in_assignment('aeeeeeee-eeee-eeee-eeee-eeeeeeee0004') $$,
  'owner checks in successfully within the allowed window'
);

select is(
  (
    select status
    from public.shift_assignments
    where id = 'aeeeeeee-eeee-eeee-eeee-eeeeeeee0004'
  ),
  'checked_in'::public.assignment_status,
  'assignment status is checked_in after RPC'
);

select ok(
  (
    select check_in_at is not null
    from public.shift_assignments
    where id = 'aeeeeeee-eeee-eeee-eeee-eeeeeeee0004'
  ),
  'server recorded check_in_at'
);

-- ---------------------------------------------------------------------------
-- Repeated check-in is idempotent
-- ---------------------------------------------------------------------------
select is(
  (
    select status
    from public.check_in_assignment('aeeeeeee-eeee-eeee-eeee-eeeeeeee0004')
  ),
  'checked_in'::public.assignment_status,
  'repeated check-in is idempotent'
);

-- ---------------------------------------------------------------------------
-- Owner checks out after check-in
-- ---------------------------------------------------------------------------
select lives_ok(
  $$ select public.check_out_assignment('aeeeeeee-eeee-eeee-eeee-eeeeeeee0004') $$,
  'owner checks out after check-in'
);

select is(
  (
    select status
    from public.shift_assignments
    where id = 'aeeeeeee-eeee-eeee-eeee-eeeeeeee0004'
  ),
  'checked_out'::public.assignment_status,
  'assignment status is checked_out after RPC'
);

-- ---------------------------------------------------------------------------
-- Repeated check-out is idempotent
-- ---------------------------------------------------------------------------
select is(
  (
    select status
    from public.check_out_assignment('aeeeeeee-eeee-eeee-eeee-eeeeeeee0004')
  ),
  'checked_out'::public.assignment_status,
  'repeated check-out is idempotent'
);

select * from finish();
rollback;
