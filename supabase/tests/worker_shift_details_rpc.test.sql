-- worker_shift_details_rpc.test.sql
-- Test the get_worker_shift_details RPC from migration 014.

begin;

select plan(7);

-- Setup: Create test organization, location, worker
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  (
    '00000000-0000-0000-0000-000000000000',
    '11111111-1111-1111-1111-111111111111'::uuid,
    'authenticated', 'authenticated', 'org-owner@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Org Owner"}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '22222222-2222-2222-2222-222222222222'::uuid,
    'authenticated', 'authenticated', 'worker@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Test Worker"}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '33333333-3333-3333-3333-333333333333'::uuid,
    'authenticated', 'authenticated', 'other-worker@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Other Worker"}'::jsonb, now(), now()
  )
on conflict (id) do nothing;

insert into public.profiles (id, full_name) values
  ('11111111-1111-1111-1111-111111111111'::uuid, 'Org Owner'),
  ('22222222-2222-2222-2222-222222222222'::uuid, 'Test Worker'),
  ('33333333-3333-3333-3333-333333333333'::uuid, 'Other Worker')
on conflict (id) do nothing;

insert into public.organizations (id, legal_name, display_name, slug, status)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'Test Org Ltd', 'Test Org', 'test-org-rpc', 'active')
on conflict (id) do nothing;

insert into public.locations (id, organization_id, name)
values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'Test Location')
on conflict (id) do nothing;

insert into public.worker_profiles (user_id, worker_role, onboarding_status)
values
  ('22222222-2222-2222-2222-222222222222'::uuid, 'registered_nurse', 'completed'),
  ('33333333-3333-3333-3333-333333333333'::uuid, 'registered_nurse', 'completed')
on conflict (user_id) do nothing;

-- Privileged role can set verification (client guard skips non-authenticated)
update public.worker_profiles
set verification_status = 'verified'
where user_id in ('22222222-2222-2222-2222-222222222222'::uuid, '33333333-3333-3333-3333-333333333333'::uuid);

-- Test 1: Anonymous user cannot call the RPC
set local role anon;
set local request.jwt.claims to '{}';

prepare anon_call as
  select * from public.get_worker_shift_details('cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid);

select throws_ok(
  'anon_call',
  'NOT_AUTHENTICATED',
  'Anonymous users cannot call get_worker_shift_details'
);

-- Test 2: Authenticated worker can read a published shift
reset role;
select set_config('request.jwt.claims', '', true);
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claim.role', '', true);

insert into public.shifts (
  id, organization_id, location_id, ward_id, title, starts_at, ends_at,
  required_role, rate_minor, currency, status, break_minutes
)
values (
  'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid,
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid,
  null,
  'Published Shift',
  now() + interval '1 day',
  now() + interval '1 day' + interval '8 hours',
  'registered_nurse',
  5000,
  'EUR',
  'published',
  30
)
on conflict (id) do nothing;

select set_config(
  'request.jwt.claims',
  '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated","aud":"authenticated"}',
  true
);
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select results_eq(
  $$select shift_id, organization_name, location_name, title, status
    from public.get_worker_shift_details('cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid)$$,
  $$values ('cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid, 'Test Org'::text, 'Test Location'::text, 'Published Shift'::text, 'published'::public.shift_status)$$,
  'Authenticated worker can read published shift details'
);

-- Test 3: Worker cannot read a draft shift they are not assigned to
reset role;
select set_config('request.jwt.claims', '', true);
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claim.role', '', true);

insert into public.shifts (
  id, organization_id, location_id, title, starts_at, ends_at,
  required_role, rate_minor, currency, status, break_minutes
)
values (
  'dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid,
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid,
  'Draft Shift',
  now() + interval '2 days',
  now() + interval '2 days' + interval '8 hours',
  'registered_nurse',
  5000,
  'EUR',
  'draft',
  30
)
on conflict (id) do nothing;

select set_config(
  'request.jwt.claims',
  '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated","aud":"authenticated"}',
  true
);
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select is_empty(
  $$select * from public.get_worker_shift_details('dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid)$$,
  'Worker cannot read draft shift they are not assigned to'
);

-- Test 4: Worker cannot read a cancelled shift
reset role;
select set_config('request.jwt.claims', '', true);
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claim.role', '', true);

insert into public.shifts (
  id, organization_id, location_id, title, starts_at, ends_at,
  required_role, rate_minor, currency, status, break_minutes
)
values (
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'::uuid,
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid,
  'Cancelled Shift',
  now() + interval '3 days',
  now() + interval '3 days' + interval '8 hours',
  'registered_nurse',
  5000,
  'EUR',
  'cancelled',
  30
)
on conflict (id) do nothing;

select set_config(
  'request.jwt.claims',
  '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated","aud":"authenticated"}',
  true
);
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select is_empty(
  $$select * from public.get_worker_shift_details('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'::uuid)$$,
  'Worker cannot read cancelled shift'
);

-- Test 5: Worker can read a shift they are assigned to (even if not published)
reset role;
select set_config('request.jwt.claims', '', true);
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claim.role', '', true);

insert into public.shifts (
  id, organization_id, location_id, title, starts_at, ends_at,
  required_role, rate_minor, currency, status, break_minutes
)
values (
  'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid,
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid,
  'Assigned Shift',
  now() + interval '4 days',
  now() + interval '4 days' + interval '8 hours',
  'registered_nurse',
  5000,
  'EUR',
  'filled',
  30
)
on conflict (id) do nothing;

insert into public.shift_assignments (shift_id, worker_id, status)
values ('ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid, '22222222-2222-2222-2222-222222222222'::uuid, 'accepted');

select set_config(
  'request.jwt.claims',
  '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated","aud":"authenticated"}',
  true
);
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select results_eq(
  $$select shift_id, title
    from public.get_worker_shift_details('ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid)$$,
  $$values ('ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid, 'Assigned Shift'::text)$$,
  'Worker can read shift they are assigned to'
);

-- Test 6: Worker cannot read another worker's assigned shift that is not published
reset role;
select set_config('request.jwt.claims', '', true);
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claim.role', '', true);

select set_config(
  'request.jwt.claims',
  '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated","aud":"authenticated"}',
  true
);
select set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select is_empty(
  $$select * from public.get_worker_shift_details('ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid)$$,
  'Worker cannot read another worker''s assigned shift that is not published'
);

-- Test 7: Worker cannot read expired published shift
reset role;
select set_config('request.jwt.claims', '', true);
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claim.role', '', true);

insert into public.shifts (
  id, organization_id, location_id, title, starts_at, ends_at,
  required_role, rate_minor, currency, status, break_minutes, acceptance_deadline
)
values (
  'aaaabbbb-aaaa-bbbb-aaaa-bbbbaaaabbbb'::uuid,
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid,
  'Expired Published Shift',
  now() + interval '5 days',
  now() + interval '5 days' + interval '8 hours',
  'registered_nurse',
  5000,
  'EUR',
  'published',
  30,
  now() - interval '1 hour'
)
on conflict (id) do nothing;

select set_config(
  'request.jwt.claims',
  '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated","aud":"authenticated"}',
  true
);
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select is_empty(
  $$select * from public.get_worker_shift_details('aaaabbbb-aaaa-bbbb-aaaa-bbbbaaaabbbb'::uuid)$$,
  'Worker cannot read expired published shift'
);

select * from finish();

rollback;
