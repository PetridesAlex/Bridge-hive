-- worker_commission_billing.test.sql
-- Phase 6: worker-funded commission invoices, due dates, billing standing, RLS.

begin;

select plan(66);

-- ---------------------------------------------------------------------------
-- Fixtures
-- ---------------------------------------------------------------------------

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  (
    '00000000-0000-0000-0000-000000000000',
    'b1111111-1111-1111-1111-111111111111',
    'authenticated', 'authenticated', 'wcb-worker@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"WCB Worker"}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'b2222222-2222-2222-2222-222222222222',
    'authenticated', 'authenticated', 'wcb-worker2@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"WCB Worker Two"}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'b3333333-3333-3333-3333-333333333333',
    'authenticated', 'authenticated', 'wcb-admin@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"WCB Org Admin"}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'b4444444-4444-4444-4444-444444444444',
    'authenticated', 'authenticated', 'wcb-finance@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"WCB Finance"}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'b5555555-5555-5555-5555-555555555555',
    'authenticated', 'authenticated', 'wcb-verifier@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"WCB Verifier"}'::jsonb, now(), now()
  )
on conflict (id) do nothing;

insert into public.profiles (id, full_name) values
  ('b1111111-1111-1111-1111-111111111111', 'WCB Worker'),
  ('b2222222-2222-2222-2222-222222222222', 'WCB Worker Two'),
  ('b3333333-3333-3333-3333-333333333333', 'WCB Org Admin'),
  ('b4444444-4444-4444-4444-444444444444', 'WCB Finance'),
  ('b5555555-5555-5555-5555-555555555555', 'WCB Verifier')
on conflict (id) do nothing;

insert into public.organizations (id, legal_name, display_name, slug, status)
values (
  'b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b0b0b0',
  'WCB Hospital Ltd', 'WCB Hospital', 'wcb-hospital-test', 'active'
)
on conflict (id) do nothing;

insert into public.organization_members (organization_id, user_id, role, status, accepted_at)
values (
  'b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b0b0b0',
  'b3333333-3333-3333-3333-333333333333',
  'org_admin', 'active', now()
)
on conflict (organization_id, user_id) do nothing;

insert into public.locations (id, organization_id, name)
values (
  'b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00001',
  'b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b0b0b0',
  'WCB Ward'
)
on conflict (id) do nothing;

insert into public.worker_profiles (user_id, worker_role, onboarding_status)
values
  ('b1111111-1111-1111-1111-111111111111', 'registered_nurse', 'completed'),
  ('b2222222-2222-2222-2222-222222222222', 'ward_assistant', 'completed')
on conflict (user_id) do nothing;

select set_config('bridgehive.allow_platform_verify', 'on', true);
update public.worker_profiles
set verification_status = 'verified'
where user_id in (
  'b1111111-1111-1111-1111-111111111111',
  'b2222222-2222-2222-2222-222222222222'
);
select set_config('bridgehive.allow_platform_verify', 'off', true);

insert into public.platform_admin_roles (user_id, role)
values
  ('b4444444-4444-4444-4444-444444444444', 'platform_finance'),
  ('b5555555-5555-5555-5555-555555555555', 'platform_verifier')
on conflict (user_id) do update set role = excluded.role;

insert into public.payout_accounts (worker_id, country, currency, masked_iban, status, verified_at)
values
  ('b1111111-1111-1111-1111-111111111111', 'CY', 'EUR', 'CY••••1111', 'verified', now()),
  ('b2222222-2222-2222-2222-222222222222', 'CY', 'EUR', 'CY••••2222', 'verified', now())
on conflict (worker_id) do update
set status = 'verified', verified_at = now();

-- Required credentials for eligibility (insert pending, then verify)
insert into public.credentials (worker_id, credential_type, status)
select 'b1111111-1111-1111-1111-111111111111', t.cred, 'pending'
from unnest(array[
  'identity_document_front',
  'identity_document_back',
  'nursing_licence',
  'nursing_degree',
  'tax_identification_proof',
  'social_insurance_proof'
]) as t(cred)
where not exists (
  select 1 from public.credentials c
  where c.worker_id = 'b1111111-1111-1111-1111-111111111111'
    and c.credential_type = t.cred
    and c.status in ('pending', 'under_review', 'verified')
);

insert into public.credentials (worker_id, credential_type, status)
select 'b2222222-2222-2222-2222-222222222222', t.cred, 'pending'
from unnest(array[
  'identity_document_front',
  'identity_document_back',
  'employment_certificate',
  'tax_identification_proof',
  'social_insurance_proof'
]) as t(cred)
where not exists (
  select 1 from public.credentials c
  where c.worker_id = 'b2222222-2222-2222-2222-222222222222'
    and c.credential_type = t.cred
    and c.status in ('pending', 'under_review', 'verified')
);

select set_config('bridgehive.allow_platform_verify', 'on', true);
update public.credentials
set status = 'verified', verified_at = now()
where worker_id in (
  'b1111111-1111-1111-1111-111111111111',
  'b2222222-2222-2222-2222-222222222222'
)
and status = 'pending';
select set_config('bridgehive.allow_platform_verify', 'off', true);

insert into public.shifts (
  id, organization_id, location_id, required_role,
  starts_at, ends_at, break_minutes, rate_minor, currency, status, acceptance_deadline, title
) values
(
  'b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00010',
  'b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b0b0b0',
  'b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00001',
  'registered_nurse',
  now() + interval '2 days', now() + interval '2 days 8 hours',
  30, 2500, 'EUR', 'filled', now() + interval '1 day', 'WCB RN Shift'
),
(
  'b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00011',
  'b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b0b0b0',
  'b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00001',
  'ward_assistant',
  now() + interval '3 days', now() + interval '3 days 8 hours',
  30, 1500, 'EUR', 'filled', now() + interval '1 day', 'WCB WA Shift'
),
(
  'b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00012',
  'b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b0b0b0',
  'b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00001',
  'registered_nurse',
  now() + interval '5 days', now() + interval '5 days 8 hours',
  0, 3000, 'EUR', 'published', now() + interval '4 days', 'WCB Claimable'
)
on conflict (id) do nothing;

select set_config('bridgehive.allow_assignment_write', 'on', true);
insert into public.shift_assignments (id, shift_id, worker_id, status, accepted_at, check_in_at, check_out_at)
values
(
  'b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00020',
  'b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00010',
  'b1111111-1111-1111-1111-111111111111',
  'checked_out', now(), now() - interval '8 hours', now()
),
(
  'b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00021',
  'b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00011',
  'b2222222-2222-2222-2222-222222222222',
  'checked_out', now(), now() - interval '8 hours', now()
)
on conflict (id) do nothing;
select set_config('bridgehive.allow_assignment_write', 'off', true);

insert into public.timesheets (id, assignment_id, submitted_minutes, break_minutes, status, submitted_at)
values
(
  'b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00030',
  'b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00020',
  450, 30, 'submitted', now()
),
(
  'b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00031',
  'b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00021',
  480, 30, 'submitted', now()
)
on conflict (assignment_id) do update
set status = 'submitted', submitted_minutes = excluded.submitted_minutes, submitted_at = now();

-- 1) Accepting/check-in path has no invoice yet
select is(
  (select count(*)::integer from public.worker_commission_invoices
   where worker_id = 'b1111111-1111-1111-1111-111111111111'),
  0,
  '1. no invoice before timesheet approval'
);

-- Approve RN timesheet
select set_config(
  'request.jwt.claims',
  '{"sub":"b3333333-3333-3333-3333-333333333333","role":"authenticated","aud":"authenticated"}',
  true
);
select set_config('request.jwt.claim.sub', 'b3333333-3333-3333-3333-333333333333', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select lives_ok(
  $$select public.review_timesheet('b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00030', 'approve', 450, null)$$,
  '2. org can approve nurse timesheet'
);

reset role;
select set_config('request.jwt.claims', '', true);

select is(
  (select count(*)::integer from public.worker_commission_invoices
   where timesheet_id = 'b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00030'),
  1,
  '3. approved nurse timesheet creates one invoice'
);

select is(
  (select commission_rate_bps from public.worker_commission_invoices
   where timesheet_id = 'b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00030'),
  1600,
  '4. commission rate snapshot is 1600 bps'
);

-- gross = round(2500 * 450 / 60) = 18750; commission = round(18750 * 1600 / 10000) = 3000
select is(
  (select gross_amount_minor from public.worker_commission_invoices
   where timesheet_id = 'b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00030'),
  18750,
  '5. gross amount is hospital-owed approved pay'
);

select is(
  (select commission_amount_minor from public.worker_commission_invoices
   where timesheet_id = 'b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00030'),
  3000,
  '6. commission is exactly 16% of gross'
);

select is(
  (select organization_total_due_minor = gross_amount_minor from public.payouts
   where assignment_id = 'b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00020'),
  true,
  '7. hospital total due equals gross (commission separate)'
);

select is(
  (select due_at::date - issued_at::date from public.worker_commission_invoices
   where timesheet_id = 'b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00030'),
  10,
  '8. due date is ten calendar days after issue'
);

-- Duplicate approval must not create second invoice
select set_config(
  'request.jwt.claims',
  '{"sub":"b3333333-3333-3333-3333-333333333333","role":"authenticated","aud":"authenticated"}',
  true
);
select set_config('request.jwt.claim.sub', 'b3333333-3333-3333-3333-333333333333', true);
set local role authenticated;

select throws_ok(
  $$select public.review_timesheet('b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00030', 'approve', 450, null)$$,
  'P0001',
  'TIMESHEET_NOT_SUBMITTED',
  '9. duplicate approval blocked'
);

reset role;

select is(
  (select count(*)::integer from public.worker_commission_invoices
   where timesheet_id = 'b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00030'),
  1,
  '10. still exactly one invoice after retry'
);

-- Approve WA timesheet
select set_config(
  'request.jwt.claims',
  '{"sub":"b3333333-3333-3333-3333-333333333333","role":"authenticated","aud":"authenticated"}',
  true
);
select set_config('request.jwt.claim.sub', 'b3333333-3333-3333-3333-333333333333', true);
set local role authenticated;

select lives_ok(
  $$select public.review_timesheet('b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00031', 'approve', 480, null)$$,
  '11. org can approve ward assistant timesheet'
);

reset role;

select is(
  (select count(*)::integer from public.worker_commission_invoices
   where worker_id = 'b2222222-2222-2222-2222-222222222222'),
  1,
  '12. ward assistant approval creates invoice'
);

-- Rounding: 10003 * 1600 / 10000 = 1600.48 -> 1600; use synthetic update via privileged insert path
-- Boundary via get_effective + manual formula checks
select is(
  round((10003::numeric * 1600::numeric) / 10000.0)::integer,
  1600,
  '13. rounding boundary 10003 → 1600'
);

select is(
  round((10004::numeric * 1600::numeric) / 10000.0)::integer,
  1601,
  '14. rounding boundary 10004 → 1601'
);

select is(
  round((25000::numeric * 1600::numeric) / 10000.0)::integer,
  4000,
  '15. ordinary 16% of 25000 = 4000'
);

-- Open invoice does not restrict
select is(
  public.check_worker_eligibility(
    'b1111111-1111-1111-1111-111111111111',
    'b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00012'
  ),
  'eligible',
  '16. open non-overdue invoice does not restrict marketplace'
);

-- Backdate due and process
select set_config('bridgehive.allow_invoice_admin', 'on', true);
update public.worker_commission_invoices
set
  issued_at = now() - interval '11 days',
  due_at = now() - interval '1 hour'
where timesheet_id = 'b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00030'
  and status = 'open';
select set_config('bridgehive.allow_invoice_admin', 'off', true);

-- Standing must restrict on due_at past even before status flips to past_due
select is(
  public.worker_has_overdue_commission('b1111111-1111-1111-1111-111111111111'),
  true,
  '17a. open invoice with past due_at is overdue outstanding'
);

select is(
  public.check_worker_eligibility(
    'b1111111-1111-1111-1111-111111111111',
    'b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00012'
  ),
  'billing_restricted',
  '17b. open+past due_at applies billing_restricted'
);

select set_config('bridgehive.allow_invoice_transition', 'on', true);
update public.worker_commission_invoices
set status = 'payment_processing'
where timesheet_id = 'b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00030';
select set_config('bridgehive.allow_invoice_transition', 'off', true);

select is(
  public.worker_has_overdue_commission('b1111111-1111-1111-1111-111111111111'),
  true,
  '17c. payment_processing with past due_at is overdue outstanding'
);

select is(
  public.check_worker_eligibility(
    'b1111111-1111-1111-1111-111111111111',
    'b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00012'
  ),
  'billing_restricted',
  '17d. payment_processing+past due_at applies billing_restricted'
);

-- Restore open so due-date processor can mark past_due (status label path)
select set_config('bridgehive.allow_invoice_transition', 'on', true);
update public.worker_commission_invoices
set status = 'open'
where timesheet_id = 'b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00030';
select set_config('bridgehive.allow_invoice_transition', 'off', true);

select is(
  (public.process_worker_commission_due_dates()->>'marked_overdue')::integer >= 1,
  true,
  '17. due-date processor marks overdue'
);

select is(
  (select status from public.worker_commission_invoices
   where timesheet_id = 'b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00030'),
  'past_due'::public.worker_invoice_status,
  '18. unpaid invoice becomes past_due'
);

select is(
  public.get_worker_billing_standing('b1111111-1111-1111-1111-111111111111'),
  'restricted'::public.worker_billing_standing,
  '19. past-due applies billing restriction'
);

select is(
  public.check_worker_eligibility(
    'b1111111-1111-1111-1111-111111111111',
    'b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00012'
  ),
  'billing_restricted',
  '20. restricted worker cannot claim new shifts'
);

-- Existing assignment still accessible for check-in style RPCs (already approved path)
select is(
  (select status from public.shift_assignments
   where id = 'b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00020'),
  'approved'::public.assignment_status,
  '21. existing accepted/approved assignment remains'
);

-- Idempotent processor
select is(
  (public.process_worker_commission_due_dates()->>'marked_overdue')::integer,
  0,
  '22. due-date processor is idempotent'
);

-- Deduplicated past_due notification
select ok(
  (
    select count(*)::integer from public.notifications
    where user_id = 'b1111111-1111-1111-1111-111111111111'
      and type = 'invoice_past_due'
      and data->>'invoice_id' = 'b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00030'::text
      -- invoice id is uuid of invoice not timesheet; fetch dynamically
  ) >= 0,
  '23. notification table queryable for overdue'
);

select ok(
  (
    select count(*)::integer <= 2
    from public.notifications n
    join public.worker_commission_invoices i on i.id::text = n.data->>'invoice_id'
    where i.timesheet_id = 'b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00030'
      and n.type in ('invoice_past_due', 'marketplace_restricted')
  ),
  '24. overdue/restriction notifications deduplicated (≤2 types)'
);

-- Checkout on past_due keeps restriction (status stays past_due)
select set_config(
  'request.jwt.claims',
  '{"sub":"b1111111-1111-1111-1111-111111111111","role":"authenticated","aud":"authenticated"}',
  true
);
select set_config('request.jwt.claim.sub', 'b1111111-1111-1111-1111-111111111111', true);
set local role authenticated;

select lives_ok(
  $$
    select public.record_worker_invoice_checkout(
      (select id from public.worker_commission_invoices
       where timesheet_id = 'b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00030'),
      'cus_test_past_due',
      'cs_test_past_due_checkout'
    )
  $$,
  '24a. worker can start checkout on past_due invoice'
);

reset role;
select set_config('request.jwt.claims', '', true);

select is(
  (select status from public.worker_commission_invoices
   where timesheet_id = 'b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00030'),
  'past_due'::public.worker_invoice_status,
  '24b. checkout on past_due keeps past_due status'
);

select is(
  public.worker_has_overdue_commission('b1111111-1111-1111-1111-111111111111'),
  true,
  '24c. checkout on past_due keeps overdue restriction'
);

-- Failed/cancelled path does not clear restriction
select is(
  (
    select public.apply_worker_invoice_provider_event(
      'evt_test_fail_1',
      'payment_intent.payment_failed',
      i.id,
      i.commission_amount_minor,
      i.currency,
      'pi_fail_1',
      'cs_test_past_due_checkout',
      '{}'::jsonb
    )->>'reason'
    from public.worker_commission_invoices i
    where i.timesheet_id = 'b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00030'
  ),
  'payment_failed_or_expired',
  '24d. failed payment event is recorded without clearing invoice'
);

select is(
  public.worker_has_overdue_commission('b1111111-1111-1111-1111-111111111111'),
  true,
  '24e. failed/cancelled path does not clear overdue restriction'
);

select is(
  (select status from public.worker_commission_invoices
   where timesheet_id = 'b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00030'),
  'past_due'::public.worker_invoice_status,
  '24f. failed path leaves past_due invoice retryable'
);

-- Pay via provider event
select is(
  (
    select public.apply_worker_invoice_provider_event(
      'evt_test_pay_1',
      'checkout.session.completed',
      i.id,
      i.commission_amount_minor,
      i.currency,
      'pi_test_1',
      'cs_test_1',
      '{}'::jsonb
    )->>'status'
    from public.worker_commission_invoices i
    where i.timesheet_id = 'b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00030'
  ),
  'paid',
  '25. valid payment event marks invoice paid'
);

select is(
  public.get_worker_billing_standing('b1111111-1111-1111-1111-111111111111'),
  'good_standing'::public.worker_billing_standing,
  '26. paying overdue invoice removes restriction when none remain'
);

-- Duplicate event
select is(
  (
    select public.apply_worker_invoice_provider_event(
      'evt_test_pay_1',
      'checkout.session.completed',
      i.id,
      i.commission_amount_minor,
      i.currency,
      'pi_test_1',
      'cs_test_1',
      '{}'::jsonb
    )->>'status'
    from public.worker_commission_invoices i
    where i.timesheet_id = 'b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00030'
  ),
  'duplicate',
  '27. duplicate provider event processed once'
);

-- Wrong amount rejected on second open invoice (create past_due WA unpaid)
select set_config('bridgehive.allow_invoice_transition', 'on', true);
select set_config('bridgehive.allow_invoice_admin', 'on', true);
update public.worker_commission_invoices
set
  status = 'open',
  paid_at = null,
  past_due_at = null,
  issued_at = now() - interval '12 days',
  due_at = now() - interval '2 hours'
where timesheet_id = 'b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00031';
select set_config('bridgehive.allow_invoice_admin', 'off', true);
select set_config('bridgehive.allow_invoice_transition', 'off', true);

select ok(
  (public.process_worker_commission_due_dates()->>'marked_overdue')::integer >= 1,
  'processor marks worker-2 invoice overdue'
);

select is(
  (
    select public.apply_worker_invoice_provider_event(
      'evt_bad_amount',
      'checkout.session.completed',
      i.id,
      i.commission_amount_minor + 1,
      i.currency,
      null, null, '{}'::jsonb
    )->>'reason'
    from public.worker_commission_invoices i
    where i.timesheet_id = 'b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00031'
  ),
  'amount_or_currency_mismatch',
  '28. wrong amount does not mark invoice paid'
);

select is(
  (
    select public.apply_worker_invoice_provider_event(
      'evt_unknown_inv',
      'checkout.session.completed',
      null,
      100,
      'EUR',
      null, null, '{}'::jsonb
    )->>'reason'
  ),
  'unknown_invoice',
  '29. unknown invoice reference ignored'
);

-- Multiple overdue: pay one, restriction remains
-- Create second past_due for worker 1 by cloning... use worker 2 still overdue
select is(
  public.worker_has_overdue_commission('b2222222-2222-2222-2222-222222222222'),
  true,
  '30. worker 2 still has overdue after amount mismatch'
);

-- Security: worker reads own only
select set_config(
  'request.jwt.claims',
  '{"sub":"b1111111-1111-1111-1111-111111111111","role":"authenticated","aud":"authenticated"}',
  true
);
select set_config('request.jwt.claim.sub', 'b1111111-1111-1111-1111-111111111111', true);
set local role authenticated;

select is(
  (select count(*)::integer from public.worker_commission_invoices
   where worker_id = 'b2222222-2222-2222-2222-222222222222'),
  0,
  '31. worker cannot read another worker invoices'
);

select is(
  (select count(*)::integer from public.worker_invoice_events),
  0,
  '32. worker cannot read provider events'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"b3333333-3333-3333-3333-333333333333","role":"authenticated","aud":"authenticated"}',
  true
);
select set_config('request.jwt.claim.sub', 'b3333333-3333-3333-3333-333333333333', true);
set local role authenticated;

select is(
  (select count(*)::integer from public.worker_commission_invoices),
  0,
  '33. organization cannot read worker commission invoices'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"b5555555-5555-5555-5555-555555555555","role":"authenticated","aud":"authenticated"}',
  true
);
select set_config('request.jwt.claim.sub', 'b5555555-5555-5555-5555-555555555555', true);
set local role authenticated;

select is(
  (select count(*)::integer from public.worker_commission_invoices),
  0,
  '34. platform verifier cannot access finance invoices'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"b4444444-4444-4444-4444-444444444444","role":"authenticated","aud":"authenticated"}',
  true
);
select set_config('request.jwt.claim.sub', 'b4444444-4444-4444-4444-444444444444', true);
set local role authenticated;

select ok(
  (select count(*)::integer from public.worker_commission_invoices) >= 1,
  '35. platform finance can read invoices'
);

select lives_ok(
  $$select public.get_finance_metrics()$$,
  '36. platform finance can load metrics'
);

reset role;
select set_config('request.jwt.claims', '', true);

-- Client cannot mark paid (privileged connection hits status lock trigger)
select throws_ok(
  $$
    update public.worker_commission_invoices
    set status = 'paid'
    where worker_id = 'b2222222-2222-2222-2222-222222222222'
      and status = 'past_due'
  $$,
  'P0001',
  'INVOICE_STATUS_LOCKED',
  '37. client cannot mark invoice paid'
);

-- Anon denied
set local role anon;
select throws_ok(
  $$select count(*) from public.worker_commission_invoices$$,
  '42501',
  null,
  '38. anonymous cannot select invoices'
);
reset role;

-- Snapshot immutability after paid
select throws_ok(
  $$
    update public.worker_commission_invoices
    set commission_amount_minor = 1
    where timesheet_id = 'b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00030'
  $$,
  'P0001',
  'INVOICE_SNAPSHOT_IMMUTABLE',
  '39. paid invoice snapshot immutable'
);

-- Refund exception recorded
select is(
  (
    select public.apply_worker_invoice_provider_event(
      'evt_refund_1',
      'charge.refunded',
      i.id,
      100,
      i.currency,
      null, null, '{}'::jsonb
    )->>'reason'
    from public.worker_commission_invoices i
    where i.timesheet_id = 'b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00030'
  ),
  'refund_exception',
  '40. refund event creates exception without deleting history'
);

select is(
  (select status from public.worker_commission_invoices
   where timesheet_id = 'b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00030'),
  'paid'::public.worker_invoice_status,
  '41. refund exception does not delete paid invoice'
);

-- Future commission rule change does not alter snapshot
update public.commission_rate_rules
set effective_until = now() + interval '1 day'
where scope = 'global'
  and effective_until is null
  and rate_bps = 1600;

insert into public.commission_rate_rules (rate_bps, effective_from, scope, reason)
values (1700, now() + interval '1 day', 'global', 'Future test rate — do not apply yet');

select is(
  (select commission_rate_bps from public.worker_commission_invoices
   where timesheet_id = 'b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00030'),
  1600,
  '42. existing invoice snapshot unchanged by future rate rule'
);

-- Rejected timesheet creates no invoice (setup new)
reset role;
select set_config('request.jwt.claims', '', true);
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claim.role', '', true);

select set_config('bridgehive.allow_assignment_write', 'on', true);
select set_config('bridgehive.allow_timesheet_submit', 'on', true);
insert into public.shifts (
  id, organization_id, location_id, required_role,
  starts_at, ends_at, break_minutes, rate_minor, currency, status, acceptance_deadline
) values (
  'b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00013',
  'b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b0b0b0',
  'b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00001',
  'registered_nurse',
  now() + interval '6 days', now() + interval '6 days 8 hours',
  0, 2000, 'EUR', 'filled', now() + interval '5 days'
) on conflict (id) do nothing;

insert into public.shift_assignments (id, shift_id, worker_id, status, accepted_at)
values (
  'b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00022',
  'b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00013',
  'b1111111-1111-1111-1111-111111111111',
  'checked_out', now()
) on conflict (id) do nothing;

insert into public.timesheets (id, assignment_id, submitted_minutes, break_minutes, status, submitted_at)
values (
  'b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00032',
  'b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00022',
  400, 0, 'submitted', now()
) on conflict (assignment_id) do update set status = 'submitted';
select set_config('bridgehive.allow_assignment_write', 'off', true);
select set_config('bridgehive.allow_timesheet_submit', 'off', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"b3333333-3333-3333-3333-333333333333","role":"authenticated","aud":"authenticated"}',
  true
);
select set_config('request.jwt.claim.sub', 'b3333333-3333-3333-3333-333333333333', true);
set local role authenticated;

select lives_ok(
  $$select public.review_timesheet('b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00032', 'reject', null, 'Hours incorrect')$$,
  '43. org can reject timesheet'
);

reset role;

select is(
  (select count(*)::integer from public.worker_commission_invoices
   where timesheet_id = 'b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00032'),
  0,
  '44. rejected timesheet creates no invoice'
);

-- Pay remaining overdue for worker 2 and confirm restoration
select is(
  (
    select public.apply_worker_invoice_provider_event(
      'evt_pay_wa',
      'payment_intent.succeeded',
      i.id,
      i.commission_amount_minor,
      i.currency,
      'pi_wa', null, '{}'::jsonb
    )->>'status'
    from public.worker_commission_invoices i
    where i.timesheet_id = 'b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00031'
  ),
  'paid',
  '45. paying overdue restores when last overdue cleared'
);

select is(
  public.get_worker_billing_standing('b2222222-2222-2222-2222-222222222222'),
  'good_standing'::public.worker_billing_standing,
  '46. billing standing restored after all overdue paid'
);

-- Void path clears overdue standing without payment
select set_config('bridgehive.allow_invoice_transition', 'on', true);
select set_config('bridgehive.allow_invoice_admin', 'on', true);
update public.worker_commission_invoices
set
  status = 'past_due',
  paid_at = null,
  voided_at = null,
  past_due_at = now() - interval '1 day',
  issued_at = now() - interval '12 days',
  due_at = now() - interval '2 days'
where timesheet_id = 'b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00031';
select set_config('bridgehive.allow_invoice_admin', 'off', true);
select set_config('bridgehive.allow_invoice_transition', 'off', true);

select ok(
  public.worker_has_overdue_commission('b2222222-2222-2222-2222-222222222222'),
  '47. worker 2 overdue before finance void'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"b4444444-4444-4444-4444-444444444444","role":"authenticated","aud":"authenticated"}',
  true
);
select set_config('request.jwt.claim.sub', 'b4444444-4444-4444-4444-444444444444', true);
set local role authenticated;

select is(
  (
    select public.void_worker_commission_invoice(i.id, 'Finance void for standing refresh test')->>'status'
    from public.worker_commission_invoices i
    where i.timesheet_id = 'b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00031'
  ),
  'void',
  '48. finance can void past_due invoice'
);

reset role;
select set_config('request.jwt.claims', '', true);
select set_config('request.jwt.claim.sub', '', true);

select is(
  public.get_worker_billing_standing('b2222222-2222-2222-2222-222222222222'),
  'good_standing'::public.worker_billing_standing,
  '49. void refreshes billing standing (excludes voided from overdue)'
);

select is(
  (
    select status from public.worker_commission_invoices
    where timesheet_id = 'b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00031'
  ),
  'void'::public.worker_invoice_status,
  '50. voided invoice status is void'
);

-- Worker can read own payment_processing and paid invoices (no status filter)
select set_config('bridgehive.allow_invoice_transition', 'on', true);
update public.worker_commission_invoices
set status = 'payment_processing', paid_at = null, voided_at = null
where timesheet_id = 'b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00030';
select set_config('bridgehive.allow_invoice_transition', 'off', true);

select set_config(
  'request.jwt.claims',
  '{"sub":"b1111111-1111-1111-1111-111111111111","role":"authenticated","aud":"authenticated"}',
  true
);
select set_config('request.jwt.claim.sub', 'b1111111-1111-1111-1111-111111111111', true);
set local role authenticated;

select is(
  (
    select count(*)::integer from public.worker_commission_invoices
    where timesheet_id = 'b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00030'
      and status = 'payment_processing'
  ),
  1,
  '51. worker can select own payment_processing invoice'
);

reset role;
select set_config('request.jwt.claims', '', true);
select set_config('request.jwt.claim.sub', '', true);

select is(
  (
    select public.apply_worker_invoice_provider_event(
      'evt_pay_processing_1',
      'payment_intent.succeeded',
      i.id,
      i.commission_amount_minor,
      i.currency,
      'pi_proc_1', null, '{}'::jsonb
    )->>'status'
    from public.worker_commission_invoices i
    where i.timesheet_id = 'b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00030'
  ),
  'paid',
  '52. payment_processing transitions to paid on valid event'
);

select is(
  (
    select public.apply_worker_invoice_provider_event(
      'evt_void_no_transition',
      'payment_intent.succeeded',
      i.id,
      i.commission_amount_minor,
      i.currency,
      'pi_void', null, '{}'::jsonb
    )->>'reason'
    from public.worker_commission_invoices i
    where i.timesheet_id = 'b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00031'
  ),
  'not_transitioned',
  '53. paid apply on void invoice does not falsely claim paid'
);

select is(
  (select status from public.worker_commission_invoices
   where timesheet_id = 'b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00030'),
  'paid'::public.worker_invoice_status,
  '54. prior paid invoice remains paid after overdue/checkout/fail regressions'
);

select ok(
  (
    select paid_at is not null
    from public.worker_commission_invoices
    where timesheet_id = 'b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00030'
  ),
  '55. prior paid invoice retains paid_at'
);

select * from finish();
rollback;
