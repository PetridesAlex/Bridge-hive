-- review_timesheet.test.sql
-- Org approval creates immutable financial snapshot; report is not reconciled.

begin;

select plan(8);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  (
    '00000000-0000-0000-0000-000000000000',
    '77777777-7777-7777-7777-777777777777',
    'authenticated', 'authenticated', 'review-worker@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Review Worker"}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '88888888-8888-8888-8888-888888888888',
    'authenticated', 'authenticated', 'review-admin@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Review Admin"}'::jsonb, now(), now()
  )
on conflict (id) do nothing;

insert into public.profiles (id, full_name) values
  ('77777777-7777-7777-7777-777777777777', 'Review Worker'),
  ('88888888-8888-8888-8888-888888888888', 'Review Admin')
on conflict (id) do nothing;

insert into public.organizations (id, legal_name, display_name, slug, status)
values (
  'dddddddd-dddd-dddd-dddd-dddddddddddd',
  'Review Org Ltd', 'Review Org', 'review-org-test', 'active'
)
on conflict (id) do nothing;

insert into public.organization_members (organization_id, user_id, role, status, accepted_at)
values (
  'dddddddd-dddd-dddd-dddd-dddddddddddd',
  '88888888-8888-8888-8888-888888888888',
  'org_admin', 'active', now()
)
on conflict (organization_id, user_id) do nothing;

insert into public.locations (id, organization_id, name)
values (
  'dddddddd-dddd-dddd-dddd-dddddddd0001',
  'dddddddd-dddd-dddd-dddd-dddddddddddd',
  'Review Site'
)
on conflict (id) do nothing;

insert into public.worker_profiles (user_id, worker_role, onboarding_status)
values ('77777777-7777-7777-7777-777777777777', 'registered_nurse', 'completed')
on conflict (user_id) do nothing;

update public.worker_profiles
set verification_status = 'verified'
where user_id = '77777777-7777-7777-7777-777777777777';

insert into public.shifts (
  id, organization_id, location_id, required_role,
  starts_at, ends_at, break_minutes, rate_minor, currency, status, acceptance_deadline
) values (
  'dddddddd-dddd-dddd-dddd-dddddddd0002',
  'dddddddd-dddd-dddd-dddd-dddddddddddd',
  'dddddddd-dddd-dddd-dddd-dddddddd0001',
  'registered_nurse',
  now() + interval '1 day', now() + interval '1 day 8 hours',
  30, 3000, 'EUR', 'filled', now() + interval '12 hours'
)
on conflict (id) do nothing;

-- Seed assignment with privileged write flag
select set_config('bridgehive.allow_assignment_write', 'on', true);
insert into public.shift_assignments (id, shift_id, worker_id, status, accepted_at)
values (
  'dddddddd-dddd-dddd-dddd-dddddddd0003',
  'dddddddd-dddd-dddd-dddd-dddddddd0002',
  '77777777-7777-7777-7777-777777777777',
  'checked_out',
  now()
)
on conflict (id) do nothing;
select set_config('bridgehive.allow_assignment_write', 'off', true);

insert into public.timesheets (
  id, assignment_id, submitted_minutes, break_minutes, status, submitted_at
) values (
  'dddddddd-dddd-dddd-dddd-dddddddd0004',
  'dddddddd-dddd-dddd-dddd-dddddddd0003',
  450, 30, 'submitted', now()
)
on conflict (assignment_id) do update
set status = 'submitted', submitted_minutes = 450, submitted_at = now();

-- Org admin approves
select set_config(
  'request.jwt.claims',
  '{"sub":"88888888-8888-8888-8888-888888888888","role":"authenticated","aud":"authenticated"}',
  true
);
select set_config('request.jwt.claim.sub', '88888888-8888-8888-8888-888888888888', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select lives_ok(
  $$
    select public.review_timesheet(
      'dddddddd-dddd-dddd-dddd-dddddddd0004',
      'approve',
      450,
      'Looks good'
    )
  $$,
  'org admin can approve timesheet'
);

select is(
  (
    select status
    from public.timesheets
    where id = 'dddddddd-dddd-dddd-dddd-dddddddd0004'
  ),
  'approved'::public.timesheet_status,
  'timesheet status is approved'
);

select is(
  (
    select gross_amount_minor
    from public.payouts
    where assignment_id = 'dddddddd-dddd-dddd-dddd-dddddddd0003'
  ),
  22500,
  'financial snapshot gross is rate_minor * minutes / 60'
);

select is(
  (
    select worker_transfer_amount_minor = gross_amount_minor
    from public.payouts
    where assignment_id = 'dddddddd-dddd-dddd-dddd-dddddddd0003'
  ),
  true,
  'pilot model: worker transfer equals gross'
);

select is(
  (
    select payer_type
    from public.commission_obligations
    where assignment_id = 'dddddddd-dddd-dddd-dddd-dddddddd0003'
  ),
  'organization'::public.commission_payer_type,
  'commission payer is organization'
);

-- Snapshot immutability (privileged role; RLS would otherwise hide the update)
reset role;
select set_config('request.jwt.claims', '', true);
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claim.role', '', true);

select throws_ok(
  $$
    update public.payouts
    set gross_amount_minor = 1
    where assignment_id = 'dddddddd-dddd-dddd-dddd-dddddddd0003'
  $$,
  'P0001',
  'PAYOUT_SNAPSHOT_IMMUTABLE',
  'payout snapshot amounts are immutable'
);

-- Attach verified account and report payment
insert into public.payout_accounts (
  worker_id, country, currency, masked_iban, status, verified_at
) values (
  '77777777-7777-7777-7777-777777777777',
  'CY', 'EUR', 'CY••••9999', 'verified', now()
)
on conflict (worker_id) do update
set status = 'verified', masked_iban = excluded.masked_iban, verified_at = now();

update public.payouts
set
  payout_account_id = (
    select id from public.payout_accounts
    where worker_id = '77777777-7777-7777-7777-777777777777'
  ),
  status = 'payment_instruction_ready'
where assignment_id = 'dddddddd-dddd-dddd-dddd-dddddddd0003';

select set_config(
  'request.jwt.claims',
  '{"sub":"88888888-8888-8888-8888-888888888888","role":"authenticated","aud":"authenticated"}',
  true
);
select set_config('request.jwt.claim.sub', '88888888-8888-8888-8888-888888888888', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select lives_ok(
  $$
    select public.report_organization_payment(
      (
        select id from public.payouts
        where assignment_id = 'dddddddd-dddd-dddd-dddd-dddddddd0003'
      ),
      'BANK-REF-123',
      null
    )
  $$,
  'org can report a bank transfer'
);

select is(
  (
    select status
    from public.payouts
    where assignment_id = 'dddddddd-dddd-dddd-dddd-dddddddd0003'
  ),
  'reconciliation_pending'::public.payout_status,
  'report moves payout to reconciliation_pending, not reconciled'
);

select * from finish();
rollback;
