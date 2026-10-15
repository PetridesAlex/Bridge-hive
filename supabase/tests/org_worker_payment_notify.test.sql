-- org_worker_payment_notify.test.sql
-- Org admins/billing receive in-app notice when a payout is created.

begin;

select plan(3);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  (
    '00000000-0000-0000-0000-000000000000',
    'd1111111-1111-1111-1111-111111111111',
    'authenticated', 'authenticated', 'pay-worker@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Pay Worker"}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'd3333333-3333-3333-3333-333333333333',
    'authenticated', 'authenticated', 'pay-admin@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Pay Admin"}'::jsonb, now(), now()
  )
on conflict (id) do nothing;

insert into public.profiles (id, full_name) values
  ('d1111111-1111-1111-1111-111111111111', 'Pay Worker'),
  ('d3333333-3333-3333-3333-333333333333', 'Pay Admin')
on conflict (id) do nothing;

insert into public.organizations (id, legal_name, display_name, slug, status)
values (
  'd0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d0d0d0',
  'Pay Org Ltd', 'Pay Org', 'pay-org-notify-test', 'active'
)
on conflict (id) do nothing;

insert into public.organization_members (organization_id, user_id, role, status, accepted_at)
values (
  'd0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d0d0d0',
  'd3333333-3333-3333-3333-333333333333',
  'org_admin', 'active', now()
)
on conflict (organization_id, user_id) do nothing;

insert into public.locations (id, organization_id, name)
values (
  'd0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d00001',
  'd0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d0d0d0',
  'Pay Site'
)
on conflict (id) do nothing;

insert into public.worker_profiles (user_id, worker_role, onboarding_status, verification_status)
values (
  'd1111111-1111-1111-1111-111111111111',
  'registered_nurse',
  'completed',
  'verified'
)
on conflict (user_id) do nothing;

insert into public.shifts (
  id, organization_id, location_id, required_role,
  starts_at, ends_at, break_minutes, rate_minor, currency, status, acceptance_deadline, title
) values (
  'd0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d00010',
  'd0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d0d0d0',
  'd0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d00001',
  'registered_nurse',
  now() - interval '9 hours',
  now() - interval '1 hour',
  0, 2500, 'EUR', 'completed', now() - interval '2 days', 'Pay Notify Shift'
)
on conflict (id) do nothing;

select set_config('bridgehive.allow_assignment_write', 'on', true);
insert into public.shift_assignments (id, shift_id, worker_id, status, accepted_at)
values (
  'd0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d00020',
  'd0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d00010',
  'd1111111-1111-1111-1111-111111111111',
  'approved',
  now() - interval '1 day'
)
on conflict (id) do nothing;
select set_config('bridgehive.allow_assignment_write', 'off', true);

select set_config('bridgehive.allow_timesheet_submit', 'on', true);
select set_config('bridgehive.allow_timesheet_review', 'on', true);
insert into public.timesheets (
  id, assignment_id, submitted_minutes, approved_minutes, break_minutes, status, submitted_at, reviewed_at, reviewed_by
) values (
  'd0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d00030',
  'd0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d00020',
  480, 480, 0, 'approved', now(), now(), 'd3333333-3333-3333-3333-333333333333'
)
on conflict (assignment_id) do update
set status = 'approved', approved_minutes = 480, reviewed_at = now();
select set_config('bridgehive.allow_timesheet_submit', 'off', true);
select set_config('bridgehive.allow_timesheet_review', 'off', true);

-- Act as org admin so create_financial_snapshot is authorized
select set_config(
  'request.jwt.claims',
  '{"sub":"d3333333-3333-3333-3333-333333333333","role":"authenticated","aud":"authenticated"}',
  true
);
select set_config('request.jwt.claim.sub', 'd3333333-3333-3333-3333-333333333333', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
select set_config('bridgehive.allow_timesheet_review', 'on', true);

select lives_ok(
  $$ select public.create_financial_snapshot('d0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d00020') $$,
  '1. financial snapshot creates payout'
);

reset role;
select set_config('request.jwt.claims', '', true);

select is(
  (
    select count(*)::integer
    from public.notifications
    where user_id = 'd3333333-3333-3333-3333-333333333333'
      and type = 'org_worker_payment_due'
      and data->>'assignment_id' = 'd0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d00020'
  ),
  1,
  '2. org admin receives worker payment due notification'
);

select ok(
  (
    select body ilike '%worker payment obligation%'
    from public.notifications
    where user_id = 'd3333333-3333-3333-3333-333333333333'
      and type = 'org_worker_payment_due'
      and data->>'assignment_id' = 'd0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d00020'
    limit 1
  ),
  '3. notification body mentions payment obligation'
);

select * from finish();
rollback;
