-- financial_workflow.test.sql
-- Payout account submit/verify and RLS on financial tables.

begin;

select plan(10);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  (
    '00000000-0000-0000-0000-000000000000',
    '99999999-9999-9999-9999-999999999999',
    'authenticated', 'authenticated', 'finance-admin@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Finance Admin"}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa',
    'authenticated', 'authenticated', 'finance-worker@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Finance Worker"}'::jsonb, now(), now()
  )
on conflict (id) do nothing;

insert into public.profiles (id, full_name) values
  ('99999999-9999-9999-9999-999999999999', 'Finance Admin'),
  ('aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa', 'Finance Worker')
on conflict (id) do nothing;

insert into public.worker_profiles (user_id, worker_role)
values ('aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa', 'ward_assistant')
on conflict (user_id) do nothing;

insert into public.platform_admin_roles (user_id, role)
values ('99999999-9999-9999-9999-999999999999', 'platform_super_admin')
on conflict (user_id) do update set role = excluded.role;

-- Dummy private proof object for local submit tests.
insert into storage.objects (bucket_id, name, owner, metadata)
values (
  'payout-proofs',
  'aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa/proof_local.pdf',
  'aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa',
  '{"mimetype":"application/pdf","size":12}'::jsonb
)
on conflict do nothing;

-- Financial tables have RLS
select ok(
  not exists (
    select 1
    from unnest(array[
      'payout_accounts',
      'payout_account_events',
      'payouts',
      'commission_obligations',
      'organization_payment_reports',
      'payment_adjustments',
      'pay_runs',
      'platform_admin_roles',
      'platform_settings'
    ]) as t(relname)
    where not exists (
      select 1
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = t.relname
        and c.relrowsecurity = true
    )
  ),
  'financial tables have RLS enabled'
);

-- Worker submits payout account
select set_config(
  'request.jwt.claims',
  '{"sub":"aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa","role":"authenticated","aud":"authenticated"}',
  true
);
select set_config('request.jwt.claim.sub', 'aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select throws_ok(
  $$ select public.submit_payout_account(
       'CY', 'EUR', 'CY00902000010000000000000000',
       'Test Worker',
       'aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa/proof_local.pdf',
       'application/pdf'
     ) $$,
  'P0001',
  'INVALID_IBAN',
  'invalid IBAN checksum is rejected server-side'
);

select lives_ok(
  $$ select public.submit_payout_account(
       'CY', 'EUR', 'CY17 0020 0128 0000 0012 0052 7600',
       'Test Worker',
       'aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa/proof_local.pdf',
       'application/pdf'
     ) $$,
  'worker can submit payout account with valid IBAN and proof'
);

select is(
  (
    select status
    from public.payout_accounts
    where worker_id = 'aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa'
  ),
  'pending'::public.payout_account_status,
  'submitted payout account is pending'
);

select is(
  (
    select masked_iban
    from public.payout_accounts
    where worker_id = 'aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa'
  ),
  'CY••••7600',
  'only masked IBAN is persisted'
);

select ok(
  not exists (
    select 1 from public.audit_events
    where entity_type = 'payout_account'
      and (
        after ? 'iban'
        or after ? 'masked_iban'
        or after ? 'account_holder_name'
        or after ? 'proof_storage_path'
      )
  ),
  'submit audit metadata contains no IBAN or proof path'
);

-- Super admin verifies (Phase 4: finance cannot approve payout accounts)
reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"99999999-9999-9999-9999-999999999999","role":"authenticated","aud":"authenticated"}',
  true
);
select set_config('request.jwt.claim.sub', '99999999-9999-9999-9999-999999999999', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select lives_ok(
  $$
    select public.verify_payout_account(
      (select id from public.payout_accounts where worker_id = 'aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa'),
      'approve',
      'Local test approval for platform use'
    )
  $$,
  'platform super admin can verify payout account'
);

select is(
  (
    select status
    from public.payout_accounts
    where worker_id = 'aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa'
  ),
  'verified'::public.payout_account_status,
  'payout account becomes verified'
);

select lives_ok(
  $$ select public.audit_payout_proof_document_view(
       (select id from public.payout_accounts where worker_id = 'aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa')
     ) $$,
  'super admin can audit payout proof document view'
);

-- Worker cannot reconcile arbitrary payout
reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa","role":"authenticated","aud":"authenticated"}',
  true
);
select set_config('request.jwt.claim.sub', 'aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select throws_ok(
  $$ select public.reconcile_direct_transfer('00000000-0000-0000-0000-000000000001', 'nope') $$,
  'P0001',
  'NOT_AUTHORIZED',
  'worker cannot reconcile payouts'
);

select * from finish();
rollback;
