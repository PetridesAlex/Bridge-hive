-- multi_position_pay_independence.test.sql
-- Two workers on a two-position shift: independent accept, timesheet,
-- approval, payout, and commission invoice amounts. Parent shift completes
-- only after every in-flight assignment is settled.

begin;

select plan(18);

create extension if not exists pgtap with schema extensions;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  (
    '00000000-0000-0000-0000-000000000000',
    'd3200001-0000-4000-8000-000000000001',
    'authenticated', 'authenticated', 'mpay-admin@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Multi Pay Admin"}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'd3200001-0000-4000-8000-000000000002',
    'authenticated', 'authenticated', 'mpay-nurse-a@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Multi Pay Nurse A"}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'd3200001-0000-4000-8000-000000000003',
    'authenticated', 'authenticated', 'mpay-nurse-b@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Multi Pay Nurse B"}'::jsonb, now(), now()
  )
on conflict (id) do nothing;

insert into public.profiles (id, full_name, account_status) values
  ('d3200001-0000-4000-8000-000000000001', 'Multi Pay Admin', 'active'),
  ('d3200001-0000-4000-8000-000000000002', 'Multi Pay Nurse A', 'active'),
  ('d3200001-0000-4000-8000-000000000003', 'Multi Pay Nurse B', 'active')
on conflict (id) do update set account_status = excluded.account_status;

insert into public.organizations (id, legal_name, display_name, slug, status)
values (
  'd3200001-cccc-4000-8000-0000000000a1',
  'Multi Pay Org Ltd', 'Multi Pay Org', 'multi-pay-org', 'active'
)
on conflict (id) do nothing;

insert into public.organization_members (organization_id, user_id, role, status, accepted_at)
values (
  'd3200001-cccc-4000-8000-0000000000a1',
  'd3200001-0000-4000-8000-000000000001',
  'org_admin', 'active', now()
)
on conflict (organization_id, user_id) do nothing;

insert into public.locations (id, organization_id, name)
values (
  'd3200001-cccc-4000-8000-0000000000c1',
  'd3200001-cccc-4000-8000-0000000000a1',
  'Multi Pay Site'
)
on conflict (id) do nothing;

insert into public.worker_profiles (user_id, worker_role, onboarding_status)
values
  ('d3200001-0000-4000-8000-000000000002', 'registered_nurse', 'completed'),
  ('d3200001-0000-4000-8000-000000000003', 'registered_nurse', 'completed')
on conflict (user_id) do update
set
  worker_role = excluded.worker_role,
  onboarding_status = excluded.onboarding_status;

select set_config('bridgehive.allow_platform_verify', 'on', true);

update public.worker_profiles
set verification_status = 'verified'
where user_id in (
  'd3200001-0000-4000-8000-000000000002',
  'd3200001-0000-4000-8000-000000000003'
);

insert into public.payout_accounts (
  worker_id, country, currency, masked_iban, status, verified_at, last_verified_at
)
select
  u.id, 'CY', 'EUR', 'CY••••' || right(u.id::text, 4), 'verified', now(), now()
from (
  values
    ('d3200001-0000-4000-8000-000000000002'::uuid),
    ('d3200001-0000-4000-8000-000000000003'::uuid)
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
    ('d3200001-0000-4000-8000-000000000002'::uuid),
    ('d3200001-0000-4000-8000-000000000003'::uuid)
) as w(id)
cross join unnest(public.worker_required_credential_types('registered_nurse')) as t(cred_type);

update public.credentials
set status = 'verified', verified_at = now()
where worker_id in (
  'd3200001-0000-4000-8000-000000000002',
  'd3200001-0000-4000-8000-000000000003'
);

select set_config('bridgehive.allow_platform_verify', 'off', true);

-- 2 positions, €25/h, 8h paid window, no break → €200 each when full.
insert into public.shifts (
  id, organization_id, location_id, required_role,
  starts_at, ends_at, break_minutes, rate_minor, currency, status,
  acceptance_deadline, required_positions, title
) values (
  'd3200001-cccc-4000-8000-0000000000s1',
  'd3200001-cccc-4000-8000-0000000000a1',
  'd3200001-cccc-4000-8000-0000000000c1',
  'registered_nurse',
  now() + interval '2 days',
  now() + interval '2 days 8 hours',
  0, 2500, 'EUR', 'published',
  now() + interval '1 day',
  2,
  'Multi Pay Dual Position'
)
on conflict (id) do nothing;

-- Worker A claims
select set_config(
  'request.jwt.claims',
  '{"sub":"d3200001-0000-4000-8000-000000000002","role":"authenticated","aud":"authenticated"}',
  true
);
select set_config('request.jwt.claim.sub', 'd3200001-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select lives_ok(
  $$select public.claim_shift('d3200001-cccc-4000-8000-0000000000s1')$$,
  'worker A can accept one position'
);

reset role;

-- Worker B claims
select set_config(
  'request.jwt.claims',
  '{"sub":"d3200001-0000-4000-8000-000000000003","role":"authenticated","aud":"authenticated"}',
  true
);
select set_config('request.jwt.claim.sub', 'd3200001-0000-4000-8000-000000000003', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select lives_ok(
  $$select public.claim_shift('d3200001-cccc-4000-8000-0000000000s1')$$,
  'worker B can accept the second position'
);

reset role;
select set_config('request.jwt.claims', '', true);

select is(
  (select status from public.shifts where id = 'd3200001-cccc-4000-8000-0000000000s1'),
  'filled'::public.shift_status,
  'shift is filled when both positions are accepted'
);

select is(
  public.shift_active_assignment_count('d3200001-cccc-4000-8000-0000000000s1'),
  2,
  'two independent active assignments exist'
);

-- Advance both assignments to submitted timesheets (480 minutes = 8h).
select set_config('bridgehive.allow_assignment_write', 'on', true);
update public.shift_assignments
set
  status = 'checked_out',
  check_in_at = now() - interval '8 hours',
  check_out_at = now(),
  updated_at = now()
where shift_id = 'd3200001-cccc-4000-8000-0000000000s1';
select set_config('bridgehive.allow_assignment_write', 'off', true);

insert into public.timesheets (
  id, assignment_id, submitted_minutes, break_minutes, status, submitted_at
)
select
  gen_random_uuid(),
  a.id,
  480,
  0,
  'submitted',
  now()
from public.shift_assignments a
where a.shift_id = 'd3200001-cccc-4000-8000-0000000000s1'
on conflict (assignment_id) do update
set
  status = 'submitted',
  submitted_minutes = 480,
  break_minutes = 0,
  submitted_at = now();

select set_config('bridgehive.allow_assignment_write', 'on', true);
update public.shift_assignments
set status = 'submitted', updated_at = now()
where shift_id = 'd3200001-cccc-4000-8000-0000000000s1';
select set_config('bridgehive.allow_assignment_write', 'off', true);

select set_config('bridgehive.allow_timesheet_submit', 'on', true);
update public.shifts
set status = 'awaiting_approval', updated_at = now()
where id = 'd3200001-cccc-4000-8000-0000000000s1';
select set_config('bridgehive.allow_timesheet_submit', 'off', true);

-- Approve worker A only
select set_config(
  'request.jwt.claims',
  '{"sub":"d3200001-0000-4000-8000-000000000001","role":"authenticated","aud":"authenticated"}',
  true
);
select set_config('request.jwt.claim.sub', 'd3200001-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select lives_ok(
  $$
    select public.review_timesheet(
      (
        select t.id
        from public.timesheets t
        join public.shift_assignments a on a.id = t.assignment_id
        where a.shift_id = 'd3200001-cccc-4000-8000-0000000000s1'
          and a.worker_id = 'd3200001-0000-4000-8000-000000000002'
      ),
      'approve',
      480,
      null
    )
  $$,
  'org can approve worker A timesheet independently'
);

reset role;
select set_config('request.jwt.claims', '', true);

select is(
  (
    select status
    from public.shifts
    where id = 'd3200001-cccc-4000-8000-0000000000s1'
  ),
  'awaiting_approval'::public.shift_status,
  'parent shift stays awaiting_approval until worker B is settled'
);

select is(
  (
    select gross_amount_minor
    from public.payouts
    where assignment_id = (
      select id from public.shift_assignments
      where shift_id = 'd3200001-cccc-4000-8000-0000000000s1'
        and worker_id = 'd3200001-0000-4000-8000-000000000002'
    )
  ),
  20000,
  'worker A payout is €200 (rate × 8h), not split across positions'
);

select is(
  (
    select count(*)::integer
    from public.payouts p
    join public.shift_assignments a on a.id = p.assignment_id
    where a.shift_id = 'd3200001-cccc-4000-8000-0000000000s1'
  ),
  1,
  'approving A does not create a payout for B'
);

select is(
  (
    select count(*)::integer
    from public.worker_commission_invoices i
    join public.shift_assignments a on a.id = i.assignment_id
    where a.shift_id = 'd3200001-cccc-4000-8000-0000000000s1'
  ),
  1,
  'commission invoice created only for the approved assignment'
);

-- Approve worker B
select set_config(
  'request.jwt.claims',
  '{"sub":"d3200001-0000-4000-8000-000000000001","role":"authenticated","aud":"authenticated"}',
  true
);
select set_config('request.jwt.claim.sub', 'd3200001-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select lives_ok(
  $$
    select public.review_timesheet(
      (
        select t.id
        from public.timesheets t
        join public.shift_assignments a on a.id = t.assignment_id
        where a.shift_id = 'd3200001-cccc-4000-8000-0000000000s1'
          and a.worker_id = 'd3200001-0000-4000-8000-000000000003'
      ),
      'approve',
      480,
      null
    )
  $$,
  'org can approve worker B timesheet independently'
);

reset role;
select set_config('request.jwt.claims', '', true);

select is(
  (
    select status
    from public.shifts
    where id = 'd3200001-cccc-4000-8000-0000000000s1'
  ),
  'completed'::public.shift_status,
  'parent shift completes only after every filled position is approved'
);

select is(
  (
    select gross_amount_minor
    from public.payouts
    where assignment_id = (
      select id from public.shift_assignments
      where shift_id = 'd3200001-cccc-4000-8000-0000000000s1'
        and worker_id = 'd3200001-0000-4000-8000-000000000003'
    )
  ),
  20000,
  'worker B payout is also €200 for their own assignment'
);

select is(
  (
    select coalesce(sum(p.gross_amount_minor), 0)::integer
    from public.payouts p
    join public.shift_assignments a on a.id = p.assignment_id
    where a.shift_id = 'd3200001-cccc-4000-8000-0000000000s1'
  ),
  40000,
  'organization worker-pay total is €400 when both positions complete'
);

select is(
  (
    select count(*)::integer
    from public.worker_commission_invoices i
    join public.shift_assignments a on a.id = i.assignment_id
    where a.shift_id = 'd3200001-cccc-4000-8000-0000000000s1'
  ),
  2,
  'each completed position gets its own commission invoice'
);

select is(
  (
    select count(distinct i.gross_amount_minor)::integer
    from public.worker_commission_invoices i
    join public.shift_assignments a on a.id = i.assignment_id
    where a.shift_id = 'd3200001-cccc-4000-8000-0000000000s1'
  ),
  1,
  'commission invoices are based on each worker gross (€200), not × positions at create'
);

select is(
  (
    select i.commission_amount_minor
    from public.worker_commission_invoices i
    join public.shift_assignments a on a.id = i.assignment_id
    where a.worker_id = 'd3200001-0000-4000-8000-000000000002'
      and a.shift_id = 'd3200001-cccc-4000-8000-0000000000s1'
  ),
  3400,
  'commission for A is 17% of €200 (3400 minor), not of €400'
);

-- Partial fill: only one of two positions accepted and completed after end.
insert into public.shifts (
  id, organization_id, location_id, required_role,
  starts_at, ends_at, break_minutes, rate_minor, currency, status,
  acceptance_deadline, required_positions, title
) values (
  'd3200001-cccc-4000-8000-0000000000s2',
  'd3200001-cccc-4000-8000-0000000000a1',
  'd3200001-cccc-4000-8000-0000000000c1',
  'registered_nurse',
  now() - interval '9 hours',
  now() - interval '1 hour',
  0, 2500, 'EUR', 'awaiting_approval',
  now() - interval '2 days',
  2,
  'Multi Pay Partial'
)
on conflict (id) do nothing;

select set_config('bridgehive.allow_assignment_write', 'on', true);
insert into public.shift_assignments (
  id, shift_id, worker_id, status, accepted_at, check_in_at, check_out_at
) values (
  'd3200001-cccc-4000-8000-0000000000a2',
  'd3200001-cccc-4000-8000-0000000000s2',
  'd3200001-0000-4000-8000-000000000002',
  'submitted',
  now() - interval '2 days',
  now() - interval '9 hours',
  now() - interval '1 hour'
)
on conflict (id) do nothing;
select set_config('bridgehive.allow_assignment_write', 'off', true);

insert into public.timesheets (
  id, assignment_id, submitted_minutes, break_minutes, status, submitted_at
) values (
  'd3200001-cccc-4000-8000-0000000000t2',
  'd3200001-cccc-4000-8000-0000000000a2',
  480, 0, 'submitted', now() - interval '30 minutes'
)
on conflict (assignment_id) do update
set status = 'submitted', submitted_minutes = 480, submitted_at = now();

select set_config(
  'request.jwt.claims',
  '{"sub":"d3200001-0000-4000-8000-000000000001","role":"authenticated","aud":"authenticated"}',
  true
);
select set_config('request.jwt.claim.sub', 'd3200001-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select lives_ok(
  $$
    select public.review_timesheet(
      'd3200001-cccc-4000-8000-0000000000t2',
      'approve',
      480,
      null
    )
  $$,
  'partial fill: single accepted worker can be approved alone'
);

reset role;
select set_config('request.jwt.claims', '', true);

select is(
  (
    select status
    from public.shifts
    where id = 'd3200001-cccc-4000-8000-0000000000s2'
  ),
  'completed'::public.shift_status,
  'ended shift with one filled position completes after that approval'
);

select is(
  public.shift_open_positions('d3200001-cccc-4000-8000-0000000000s2'),
  1,
  'unfilled second position remains open in capacity accounting'
);

select is(
  (
    select count(*)::integer
    from public.payouts
    where assignment_id = 'd3200001-cccc-4000-8000-0000000000a2'
  ),
  1,
  'only the completed worker receives a payout on a partial fill'
);

select * from finish();
rollback;
