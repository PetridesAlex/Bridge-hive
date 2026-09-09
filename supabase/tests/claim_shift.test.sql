-- claim_shift.test.sql
-- Eligibility, deadline, successful claim, conflict, and already-filled.

begin;

select plan(7);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  (
    '00000000-0000-0000-0000-000000000000',
    '33333333-3333-3333-3333-333333333333',
    'authenticated', 'authenticated', 'verified-nurse@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Verified Nurse"}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '44444444-4444-4444-4444-444444444444',
    'authenticated', 'authenticated', 'unverified-nurse@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Unverified Nurse"}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '55555555-5555-5555-5555-555555555555',
    'authenticated', 'authenticated', 'claim-org-admin@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Claim Org Admin"}'::jsonb, now(), now()
  )
on conflict (id) do nothing;

insert into public.profiles (id, full_name) values
  ('33333333-3333-3333-3333-333333333333', 'Verified Nurse'),
  ('44444444-4444-4444-4444-444444444444', 'Unverified Nurse'),
  ('55555555-5555-5555-5555-555555555555', 'Claim Org Admin')
on conflict (id) do nothing;

insert into public.organizations (id, legal_name, display_name, slug, status)
values (
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  'Claim Org Ltd', 'Claim Org', 'claim-org-test', 'active'
)
on conflict (id) do nothing;

insert into public.organization_members (organization_id, user_id, role, status, accepted_at)
values (
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  '55555555-5555-5555-5555-555555555555',
  'org_admin', 'active', now()
)
on conflict (organization_id, user_id) do nothing;

insert into public.locations (id, organization_id, name)
values (
  'cccccccc-cccc-cccc-cccc-cccccccc0001',
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  'Claim Site'
)
on conflict (id) do nothing;

insert into public.worker_profiles (user_id, worker_role, onboarding_status)
values
  ('33333333-3333-3333-3333-333333333333', 'registered_nurse', 'completed'),
  ('44444444-4444-4444-4444-444444444444', 'registered_nurse', 'in_progress')
on conflict (user_id) do nothing;

-- Privileged role can set verification (client guard skips non-authenticated)
update public.worker_profiles
set verification_status = 'verified'
where user_id = '33333333-3333-3333-3333-333333333333';

insert into public.shifts (
  id, organization_id, location_id, required_role,
  starts_at, ends_at, break_minutes, rate_minor, currency, status, acceptance_deadline
) values
  (
    'cccccccc-cccc-cccc-cccc-cccccccc0002',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'cccccccc-cccc-cccc-cccc-cccccccc0001',
    'registered_nurse',
    now() + interval '5 days', now() + interval '5 days 8 hours',
    30, 2800, 'EUR', 'published', now() + interval '4 days'
  ),
  (
    'cccccccc-cccc-cccc-cccc-cccccccc0003',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'cccccccc-cccc-cccc-cccc-cccccccc0001',
    'registered_nurse',
    now() + interval '5 days 2 hours', now() + interval '5 days 10 hours',
    30, 2800, 'EUR', 'published', now() + interval '4 days'
  ),
  (
    'cccccccc-cccc-cccc-cccc-cccccccc0004',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'cccccccc-cccc-cccc-cccc-cccccccc0001',
    'registered_nurse',
    now() + interval '10 days', now() + interval '10 days 8 hours',
    30, 2800, 'EUR', 'published', now() - interval '1 hour'
  )
on conflict (id) do nothing;

-- Unverified worker blocked
select set_config(
  'request.jwt.claims',
  '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated","aud":"authenticated"}',
  true
);
select set_config('request.jwt.claim.sub', '44444444-4444-4444-4444-444444444444', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select throws_ok(
  $$ select public.claim_shift('cccccccc-cccc-cccc-cccc-cccccccc0002') $$,
  'P0001',
  'NOT_ELIGIBLE:not_verified',
  'unverified worker cannot claim'
);

-- Verified worker: deadline
reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated","aud":"authenticated"}',
  true
);
select set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select throws_ok(
  $$ select public.claim_shift('cccccccc-cccc-cccc-cccc-cccccccc0004') $$,
  'P0001',
  'SHIFT_DEADLINE_PASSED',
  'past deadline cannot claim'
);

-- Successful claim + idempotent retry
select lives_ok(
  $$ select public.claim_shift('cccccccc-cccc-cccc-cccc-cccccccc0002') $$,
  'verified worker can claim open shift'
);

select is(
  (select status from public.shifts where id = 'cccccccc-cccc-cccc-cccc-cccccccc0002'),
  'filled'::public.shift_status,
  'claimed shift becomes filled'
);

select is(
  (
    select count(*)::integer
    from public.shift_assignments
    where shift_id = 'cccccccc-cccc-cccc-cccc-cccccccc0002'
      and worker_id = '33333333-3333-3333-3333-333333333333'
      and status = 'accepted'
  ),
  1,
  'one accepted assignment exists'
);

select throws_ok(
  $$ select public.claim_shift('cccccccc-cccc-cccc-cccc-cccccccc0003') $$,
  'P0001',
  'SCHEDULE_CONFLICT',
  'overlapping shift is blocked'
);

-- Second worker cannot claim filled shift
reset role;
select set_config('request.jwt.claims', '', true);
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claim.role', '', true);

update public.worker_profiles
set verification_status = 'verified'
where user_id = '44444444-4444-4444-4444-444444444444';

select set_config(
  'request.jwt.claims',
  '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated","aud":"authenticated"}',
  true
);
select set_config('request.jwt.claim.sub', '44444444-4444-4444-4444-444444444444', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select throws_ok(
  $$ select public.claim_shift('cccccccc-cccc-cccc-cccc-cccccccc0002') $$,
  'P0001',
  'SHIFT_NOT_AVAILABLE',
  'second worker cannot claim filled shift'
);

select * from finish();
rollback;
