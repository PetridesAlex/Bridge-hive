-- submit_completed_hours.test.sql
-- Post-end completed-hours submission; invoice only after org approval at 17%.

begin;

select plan(10);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  (
    '00000000-0000-0000-0000-000000000000',
    'c1111111-1111-1111-1111-111111111111',
    'authenticated', 'authenticated', 'hours-worker@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Hours Worker"}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'c3333333-3333-3333-3333-333333333333',
    'authenticated', 'authenticated', 'hours-admin@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Hours Admin"}'::jsonb, now(), now()
  )
on conflict (id) do nothing;

insert into public.profiles (id, full_name) values
  ('c1111111-1111-1111-1111-111111111111', 'Hours Worker'),
  ('c3333333-3333-3333-3333-333333333333', 'Hours Admin')
on conflict (id) do nothing;

insert into public.organizations (id, legal_name, display_name, slug, status)
values (
  'c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c0c0c0',
  'Hours Org Ltd', 'Hours Org', 'hours-org-test', 'active'
)
on conflict (id) do nothing;

insert into public.organization_members (organization_id, user_id, role, status, accepted_at)
values (
  'c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c0c0c0',
  'c3333333-3333-3333-3333-333333333333',
  'org_admin', 'active', now()
)
on conflict (organization_id, user_id) do nothing;

insert into public.locations (id, organization_id, name)
values (
  'c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00001',
  'c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c0c0c0',
  'Hours Site'
)
on conflict (id) do nothing;

insert into public.worker_profiles (user_id, worker_role, onboarding_status)
values ('c1111111-1111-1111-1111-111111111111', 'registered_nurse', 'completed')
on conflict (user_id) do nothing;

update public.worker_profiles
set verification_status = 'verified'
where user_id = 'c1111111-1111-1111-1111-111111111111';

-- Shift still in progress (not ended)
insert into public.shifts (
  id, organization_id, location_id, required_role,
  starts_at, ends_at, break_minutes, rate_minor, currency, status, acceptance_deadline, title
) values (
  'c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00010',
  'c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c0c0c0',
  'c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00001',
  'registered_nurse',
  now() - interval '1 hour',
  now() + interval '6 hours',
  30, 2500, 'EUR', 'filled', now() - interval '1 day', 'Hours Open'
)
on conflict (id) do nothing;

-- Shift already ended
insert into public.shifts (
  id, organization_id, location_id, required_role,
  starts_at, ends_at, break_minutes, rate_minor, currency, status, acceptance_deadline, title
) values (
  'c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00011',
  'c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c0c0c0',
  'c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00001',
  'registered_nurse',
  now() - interval '9 hours',
  now() - interval '1 hour',
  30, 2500, 'EUR', 'filled', now() - interval '2 days', 'Hours Ended'
)
on conflict (id) do nothing;

select set_config('bridgehive.allow_assignment_write', 'on', true);
insert into public.shift_assignments (id, shift_id, worker_id, status, accepted_at)
values
(
  'c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00020',
  'c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00010',
  'c1111111-1111-1111-1111-111111111111',
  'accepted', now()
),
(
  'c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00021',
  'c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00011',
  'c1111111-1111-1111-1111-111111111111',
  'accepted', now()
)
on conflict (id) do nothing;
select set_config('bridgehive.allow_assignment_write', 'off', true);

select set_config(
  'request.jwt.claims',
  '{"sub":"c1111111-1111-1111-1111-111111111111","role":"authenticated","aud":"authenticated"}',
  true
);
select set_config('request.jwt.claim.sub', 'c1111111-1111-1111-1111-111111111111', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select throws_ok(
  $$ select public.submit_timesheet('c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00020', 420) $$,
  'P0001',
  'SHIFT_NOT_ENDED',
  '1. submit before ends_at fails'
);

select throws_ok(
  $$ select public.submit_timesheet('c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00021', 0) $$,
  'P0001',
  'INVALID_SUBMITTED_MINUTES',
  '2. zero minutes rejected'
);

select lives_ok(
  $$ select public.submit_timesheet('c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00021', 420) $$,
  '3. submit after ends_at with entered minutes succeeds'
);

select is(
  (
    select submitted_minutes
    from public.timesheets
    where assignment_id = 'c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00021'
  ),
  420,
  '4. timesheet stores worker-entered minutes (no stamp math)'
);

select is(
  (
    select status
    from public.shift_assignments
    where id = 'c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00021'
  ),
  'submitted'::public.assignment_status,
  '5. assignment moves to submitted'
);

select is(
  (
    select count(*)::integer
    from public.worker_commission_invoices
    where assignment_id = 'c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00021'
  ),
  0,
  '6. no invoice until org approval'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"c3333333-3333-3333-3333-333333333333","role":"authenticated","aud":"authenticated"}',
  true
);
select set_config('request.jwt.claim.sub', 'c3333333-3333-3333-3333-333333333333', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select lives_ok(
  $$
    select public.review_timesheet(
      (select id from public.timesheets where assignment_id = 'c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00021'),
      'approve',
      420,
      null
    )
  $$,
  '7. org can approve submitted hours'
);

reset role;
select set_config('request.jwt.claims', '', true);

select is(
  (
    select count(*)::integer
    from public.worker_commission_invoices
    where assignment_id = 'c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00021'
  ),
  1,
  '8. approval creates one commission invoice'
);

select is(
  (
    select commission_rate_bps
    from public.worker_commission_invoices
    where assignment_id = 'c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00021'
  ),
  1700,
  '9. new invoice snapshots 1700 bps (17%)'
);

-- gross = round(2500 * 420 / 60) = 17500; commission = round(17500 * 1700 / 10000) = 2975
select is(
  (
    select commission_amount_minor
    from public.worker_commission_invoices
    where assignment_id = 'c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00021'
  ),
  2975,
  '10. commission is 17% of approved gross'
);

select * from finish();
rollback;
