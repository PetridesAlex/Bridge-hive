-- check_in_out.test.sql
-- Check-in / check-out RPCs are retired; completed hours replace them.

begin;

select plan(5);

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
    'a3333333-3333-3333-3333-333333333333',
    'authenticated', 'authenticated', 'checkin-admin@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Checkin Admin"}'::jsonb, now(), now()
  )
on conflict (id) do nothing;

insert into public.profiles (id, full_name) values
  ('a1111111-1111-1111-1111-111111111111', 'Checkin Owner'),
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
values ('a1111111-1111-1111-1111-111111111111', 'registered_nurse', 'completed')
on conflict (user_id) do nothing;

update public.worker_profiles
set verification_status = 'verified'
where user_id = 'a1111111-1111-1111-1111-111111111111';

insert into public.shifts (
  id, organization_id, location_id, required_role,
  starts_at, ends_at, break_minutes, rate_minor, currency, status, acceptance_deadline
) values (
  'aeeeeeee-eeee-eeee-eeee-eeeeeeee0002',
  'aeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  'aeeeeeee-eeee-eeee-eeee-eeeeeeee0001',
  'registered_nurse',
  now() - interval '5 minutes',
  now() + interval '7 hours 55 minutes',
  30, 2800, 'EUR', 'filled', now() - interval '1 day'
)
on conflict (id) do nothing;

select set_config('bridgehive.allow_assignment_write', 'on', true);
insert into public.shift_assignments (id, shift_id, worker_id, status, accepted_at)
values (
  'aeeeeeee-eeee-eeee-eeee-eeeeeeee0004',
  'aeeeeeee-eeee-eeee-eeee-eeeeeeee0002',
  'a1111111-1111-1111-1111-111111111111',
  'accepted',
  now() - interval '1 day'
)
on conflict (id) do nothing;
select set_config('bridgehive.allow_assignment_write', 'off', true);

select set_config(
  'request.jwt.claims',
  '{"sub":"a1111111-1111-1111-1111-111111111111","role":"authenticated","aud":"authenticated"}',
  true
);
select set_config('request.jwt.claim.sub', 'a1111111-1111-1111-1111-111111111111', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select throws_ok(
  $$ select public.check_in_assignment('aeeeeeee-eeee-eeee-eeee-eeeeeeee0004') $$,
  'P0001',
  'CHECK_IN_RETIRED',
  'check_in_assignment is retired'
);

select throws_ok(
  $$ select public.check_out_assignment('aeeeeeee-eeee-eeee-eeee-eeeeeeee0004') $$,
  'P0001',
  'CHECK_IN_RETIRED',
  'check_out_assignment is retired'
);

-- Direct protected status update remains blocked
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

-- Submit before shift end is rejected (even with minutes)
select throws_ok(
  $$ select public.submit_timesheet('aeeeeeee-eeee-eeee-eeee-eeeeeeee0004', 480) $$,
  'P0001',
  'SHIFT_NOT_ENDED',
  'submit before scheduled end is rejected'
);

select * from finish();
rollback;
