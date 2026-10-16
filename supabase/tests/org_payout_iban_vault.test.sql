-- org_payout_iban_vault.test.sql
-- Encrypted IBAN at submit; org billing reveal after payout exists.

begin;

select plan(9);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  (
    '00000000-0000-0000-0000-000000000000',
    'e1111111-1111-1111-1111-111111111111',
    'authenticated', 'authenticated', 'iban-worker@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Iban Worker"}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'e3333333-3333-3333-3333-333333333333',
    'authenticated', 'authenticated', 'iban-admin@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Iban Admin"}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'e4444444-4444-4444-4444-444444444444',
    'authenticated', 'authenticated', 'iban-other@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Other Org Admin"}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'e9999999-9999-9999-9999-999999999999',
    'authenticated', 'authenticated', 'iban-super@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Iban Super"}'::jsonb, now(), now()
  )
on conflict (id) do nothing;

insert into public.profiles (id, full_name) values
  ('e1111111-1111-1111-1111-111111111111', 'Iban Worker'),
  ('e3333333-3333-3333-3333-333333333333', 'Iban Admin'),
  ('e4444444-4444-4444-4444-444444444444', 'Other Org Admin'),
  ('e9999999-9999-9999-9999-999999999999', 'Iban Super')
on conflict (id) do nothing;

insert into public.platform_admin_roles (user_id, role)
values ('e9999999-9999-9999-9999-999999999999', 'platform_super_admin')
on conflict (user_id) do update set role = excluded.role;

insert into public.organizations (id, legal_name, display_name, slug, status)
values
  (
    'e0e0e0e0-e0e0-e0e0-e0e0-e0e0e0e0e0e0',
    'Iban Org Ltd', 'Iban Org', 'iban-org-vault-test', 'active'
  ),
  (
    'e0e0e0e0-e0e0-e0e0-e0e0-e0e0e0e0eeee',
    'Other Org Ltd', 'Other Org', 'iban-other-org-test', 'active'
  )
on conflict (id) do nothing;

insert into public.organization_members (organization_id, user_id, role, status, accepted_at)
values
  (
    'e0e0e0e0-e0e0-e0e0-e0e0-e0e0e0e0e0e0',
    'e3333333-3333-3333-3333-333333333333',
    'org_admin', 'active', now()
  ),
  (
    'e0e0e0e0-e0e0-e0e0-e0e0-e0e0e0e0eeee',
    'e4444444-4444-4444-4444-444444444444',
    'org_admin', 'active', now()
  )
on conflict (organization_id, user_id) do nothing;

insert into public.locations (id, organization_id, name)
values (
  'e0e0e0e0-e0e0-e0e0-e0e0-e0e0e0e00001',
  'e0e0e0e0-e0e0-e0e0-e0e0-e0e0e0e0e0e0',
  'Iban Site'
)
on conflict (id) do nothing;

insert into public.worker_profiles (user_id, worker_role, onboarding_status, verification_status)
values (
  'e1111111-1111-1111-1111-111111111111',
  'registered_nurse',
  'completed',
  'verified'
)
on conflict (user_id) do nothing;

insert into storage.objects (bucket_id, name, owner, metadata)
values (
  'payout-proofs',
  'e1111111-1111-1111-1111-111111111111/proof_iban.pdf',
  'e1111111-1111-1111-1111-111111111111',
  '{"mimetype":"application/pdf","size":12}'::jsonb
)
on conflict do nothing;

insert into public.shifts (
  id, organization_id, location_id, required_role,
  starts_at, ends_at, break_minutes, rate_minor, currency, status, acceptance_deadline, title
) values (
  'e0e0e0e0-e0e0-e0e0-e0e0-e0e0e0e00010',
  'e0e0e0e0-e0e0-e0e0-e0e0-e0e0e0e0e0e0',
  'e0e0e0e0-e0e0-e0e0-e0e0-e0e0e0e00001',
  'registered_nurse',
  now() - interval '9 hours',
  now() - interval '1 hour',
  0, 2500, 'EUR', 'completed', now() - interval '2 days', 'Iban Vault Shift'
)
on conflict (id) do nothing;

select set_config('bridgehive.allow_assignment_write', 'on', true);
insert into public.shift_assignments (id, shift_id, worker_id, status, accepted_at)
values (
  'e0e0e0e0-e0e0-e0e0-e0e0-e0e0e0e00020',
  'e0e0e0e0-e0e0-e0e0-e0e0-e0e0e0e00010',
  'e1111111-1111-1111-1111-111111111111',
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
  'e0e0e0e0-e0e0-e0e0-e0e0-e0e0e0e00030',
  'e0e0e0e0-e0e0-e0e0-e0e0-e0e0e0e00020',
  480, 480, 0, 'approved', now(), now(), 'e3333333-3333-3333-3333-333333333333'
)
on conflict (assignment_id) do update
set status = 'approved', approved_minutes = 480, reviewed_at = now();
select set_config('bridgehive.allow_timesheet_submit', 'off', true);
select set_config('bridgehive.allow_timesheet_review', 'off', true);

-- Worker submits payout account with encrypted IBAN
select set_config(
  'request.jwt.claims',
  '{"sub":"e1111111-1111-1111-1111-111111111111","role":"authenticated","aud":"authenticated"}',
  true
);
select set_config('request.jwt.claim.sub', 'e1111111-1111-1111-1111-111111111111', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select lives_ok(
  $$ select public.submit_payout_account(
       'CY', 'EUR', 'CY17 0020 0128 0000 0012 0052 7600',
       'Iban Worker',
       'e1111111-1111-1111-1111-111111111111/proof_iban.pdf',
       'application/pdf'
     ) $$,
  '1. worker can submit payout account'
);

select ok(
  (
    select iban_ciphertext is not null and masked_iban = 'CY••••7600'
    from public.payout_accounts
    where worker_id = 'e1111111-1111-1111-1111-111111111111'
  ),
  '2. submit stores ciphertext and masked IBAN'
);

-- Super admin verifies
reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"e9999999-9999-9999-9999-999999999999","role":"authenticated","aud":"authenticated"}',
  true
);
select set_config('request.jwt.claim.sub', 'e9999999-9999-9999-9999-999999999999', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select lives_ok(
  $$
    select public.verify_payout_account(
      (select id from public.payout_accounts where worker_id = 'e1111111-1111-1111-1111-111111111111'),
      'approve',
      'Vault test approval'
    )
  $$,
  '3. super admin verifies payout account'
);

-- Org admin creates payout snapshot
reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"e3333333-3333-3333-3333-333333333333","role":"authenticated","aud":"authenticated"}',
  true
);
select set_config('request.jwt.claim.sub', 'e3333333-3333-3333-3333-333333333333', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
select set_config('bridgehive.allow_timesheet_review', 'on', true);

select lives_ok(
  $$ select public.create_financial_snapshot('e0e0e0e0-e0e0-e0e0-e0e0-e0e0e0e00020') $$,
  '4. financial snapshot creates payout'
);

select is(
  (
    select full_iban
    from public.get_org_payout_transfer_details(
      (select id from public.payouts where assignment_id = 'e0e0e0e0-e0e0-e0e0-e0e0-e0e0e0e00020')
    )
  ),
  'CY17002001280000001200527600',
  '5. org admin can reveal full IBAN for own payout'
);

select is(
  (
    select worker_full_name
    from public.get_org_payout_transfer_details(
      (select id from public.payouts where assignment_id = 'e0e0e0e0-e0e0-e0e0-e0e0-e0e0e0e00020')
    )
  ),
  'Iban Worker',
  '6. reveal includes worker full name'
);

select ok(
  (
    select after ? 'payout_id'
       and after ? 'worker_id'
       and after ? 'organization_id'
       and not (after ? 'full_iban')
       and not (after ? 'iban')
       and not (after ? 'masked_iban')
       and not (after ? 'account_holder_name')
    from public.audit_events
    where action = 'org_view_payout_transfer_details'
      and entity_id = (
        select id from public.payouts
        where assignment_id = 'e0e0e0e0-e0e0-e0e0-e0e0-e0e0e0e00020'
      )
    order by created_at desc
    limit 1
  ),
  '7. audit logs view without IBAN or holder fields'
);

-- Other org admin denied
reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"e4444444-4444-4444-4444-444444444444","role":"authenticated","aud":"authenticated"}',
  true
);
select set_config('request.jwt.claim.sub', 'e4444444-4444-4444-4444-444444444444', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select throws_ok(
  $$ select public.get_org_payout_transfer_details(
       (select id from public.payouts where assignment_id = 'e0e0e0e0-e0e0-e0e0-e0e0-e0e0e0e00020')
     ) $$,
  'P0001',
  'NOT_AUTHORIZED',
  '8. other org admin cannot reveal payout IBAN'
);

-- Worker denied for org reveal RPC
reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"e1111111-1111-1111-1111-111111111111","role":"authenticated","aud":"authenticated"}',
  true
);
select set_config('request.jwt.claim.sub', 'e1111111-1111-1111-1111-111111111111', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select throws_ok(
  $$ select public.get_org_payout_transfer_details(
       (select id from public.payouts where assignment_id = 'e0e0e0e0-e0e0-e0e0-e0e0-e0e0e0e00020')
     ) $$,
  'P0001',
  'NOT_AUTHORIZED',
  '9. worker cannot call org transfer details RPC'
);

select * from finish();
rollback;
