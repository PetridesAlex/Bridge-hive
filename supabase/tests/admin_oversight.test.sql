-- admin_oversight.test.sql
-- Platform admin authorization matrix: profiles RLS, credential review,
-- worker verification, suspension, eligibility, and audit events.

begin;

select plan(80);

-- ---------------------------------------------------------------------------
-- Seed users
-- ---------------------------------------------------------------------------

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  (
    '00000000-0000-0000-0000-000000000000',
    'a1000001-0000-4000-8000-000000000001',
    'authenticated', 'authenticated', 'admin-support@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Support Admin"}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'a1000001-0000-4000-8000-000000000002',
    'authenticated', 'authenticated', 'admin-verifier@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Verifier Admin"}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'a1000001-0000-4000-8000-000000000003',
    'authenticated', 'authenticated', 'admin-finance@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Finance Admin"}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'a1000001-0000-4000-8000-000000000004',
    'authenticated', 'authenticated', 'admin-super@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Super Admin"}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'a1000001-0000-4000-8000-000000000005',
    'authenticated', 'authenticated', 'admin-worker@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Oversight Worker"}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'a1000001-0000-4000-8000-000000000006',
    'authenticated', 'authenticated', 'admin-org@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Org Admin Only"}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'a1000001-0000-4000-8000-000000000007',
    'authenticated', 'authenticated', 'dual-verifier-worker@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Dual Role Verifier"}'::jsonb, now(), now()
  )
on conflict (id) do nothing;

insert into public.profiles (id, full_name) values
  ('a1000001-0000-4000-8000-000000000001', 'Support Admin'),
  ('a1000001-0000-4000-8000-000000000002', 'Verifier Admin'),
  ('a1000001-0000-4000-8000-000000000003', 'Finance Admin'),
  ('a1000001-0000-4000-8000-000000000004', 'Super Admin'),
  ('a1000001-0000-4000-8000-000000000005', 'Oversight Worker'),
  ('a1000001-0000-4000-8000-000000000006', 'Org Admin Only'),
  ('a1000001-0000-4000-8000-000000000007', 'Dual Role Verifier')
on conflict (id) do nothing;

insert into public.platform_admin_roles (user_id, role) values
  ('a1000001-0000-4000-8000-000000000001', 'platform_support'),
  ('a1000001-0000-4000-8000-000000000002', 'platform_verifier'),
  ('a1000001-0000-4000-8000-000000000003', 'platform_finance'),
  ('a1000001-0000-4000-8000-000000000004', 'platform_super_admin'),
  ('a1000001-0000-4000-8000-000000000007', 'platform_verifier')
on conflict (user_id) do update set role = excluded.role;

insert into public.worker_profiles (user_id, worker_role, onboarding_status)
values
  ('a1000001-0000-4000-8000-000000000005', 'registered_nurse', 'completed'),
  ('a1000001-0000-4000-8000-000000000007', 'registered_nurse', 'completed')
on conflict (user_id) do nothing;

insert into public.organizations (id, legal_name, display_name, slug, status)
values (
  'a1000001-cccc-4000-8000-0000000000a1',
  'Admin Oversight Org Ltd', 'Admin Oversight Org', 'admin-oversight-org', 'active'
)
on conflict (id) do nothing;

insert into public.organization_members (organization_id, user_id, role, status, accepted_at)
values (
  'a1000001-cccc-4000-8000-0000000000a1',
  'a1000001-0000-4000-8000-000000000006',
  'org_admin', 'active', now()
)
on conflict (organization_id, user_id) do nothing;

insert into public.locations (id, organization_id, name)
values (
  'a1000001-cccc-4000-8000-0000000000b1',
  'a1000001-cccc-4000-8000-0000000000a1',
  'Oversight Site'
)
on conflict (id) do nothing;

insert into public.shifts (
  id, organization_id, location_id, required_role,
  starts_at, ends_at, break_minutes, rate_minor, currency, status, acceptance_deadline
) values (
  'a1000001-cccc-4000-8000-0000000000c1',
  'a1000001-cccc-4000-8000-0000000000a1',
  'a1000001-cccc-4000-8000-0000000000b1',
  'registered_nurse',
  now() + interval '7 days', now() + interval '7 days 8 hours',
  30, 2800, 'EUR', 'published', now() + interval '6 days'
)
on conflict (id) do nothing;

insert into public.credentials (
  id, worker_id, credential_type, status, expires_at, storage_path, storage_paths
) values
  (
    'a1000001-cccc-4000-8000-0000000000d1',
    'a1000001-0000-4000-8000-000000000005',
    'nursing_licence',
    'pending',
    now() + interval '1 year',
    'a1000001-0000-4000-8000-000000000005/nursing_licence/seed.pdf',
    '["a1000001-0000-4000-8000-000000000005/nursing_licence/seed.pdf"]'::jsonb
  ),
  (
    'a1000001-cccc-4000-8000-0000000000d2',
    'a1000001-0000-4000-8000-000000000005',
    'identity_document_front',
    'pending',
    now() + interval '1 year',
    'a1000001-0000-4000-8000-000000000005/identity_document_front/seed.pdf',
    '["a1000001-0000-4000-8000-000000000005/identity_document_front/seed.pdf"]'::jsonb
  ),
  (
    'a1000001-cccc-4000-8000-0000000000d3',
    'a1000001-0000-4000-8000-000000000007',
    'nursing_licence',
    'pending',
    now() + interval '1 year',
    'a1000001-0000-4000-8000-000000000007/nursing_licence/seed.pdf',
    '["a1000001-0000-4000-8000-000000000007/nursing_licence/seed.pdf"]'::jsonb
  )
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function pg_temp.auth_as(p_uid uuid)
returns void
language plpgsql
as $$
begin
  perform set_config(
    'request.jwt.claims',
    json_build_object(
      'sub', p_uid::text,
      'role', 'authenticated',
      'aud', 'authenticated'
    )::text,
    true
  );
  perform set_config('request.jwt.claim.sub', p_uid::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  execute 'set local role authenticated';
end;
$$;

-- ---------------------------------------------------------------------------
-- 1. Anonymous / non-admin denied
-- ---------------------------------------------------------------------------

reset role;
select set_config('request.jwt.claims', '', true);
select set_config('request.jwt.claim.sub', '', true);
set local role anon;

select throws_ok(
  $$ select public.suspend_worker_account(
       'a1000001-0000-4000-8000-000000000005',
       'anonymous attempt'
     ) $$,
  'P0001',
  'NOT_AUTHENTICATED',
  'anonymous cannot suspend accounts'
);

reset role;
select pg_temp.auth_as('a1000001-0000-4000-8000-000000000005');

select throws_ok(
  $$ select public.suspend_worker_account(
       'a1000001-0000-4000-8000-000000000006',
       'worker attempt'
     ) $$,
  'P0001',
  'NOT_AUTHORIZED',
  'ordinary worker cannot suspend accounts'
);

select throws_ok(
  $$ select public.verify_credential(
       'a1000001-cccc-4000-8000-0000000000d1',
       'approve'
     ) $$,
  'P0001',
  'NOT_AUTHORIZED',
  'ordinary worker cannot verify credentials'
);

reset role;
select pg_temp.auth_as('a1000001-0000-4000-8000-000000000006');

select throws_ok(
  $$ select public.set_worker_verification(
       'a1000001-0000-4000-8000-000000000005',
       'verified'
     ) $$,
  'P0001',
  'NOT_AUTHORIZED',
  'organization admin cannot set worker verification'
);

select throws_ok(
  $$ select public.suspend_worker_account(
       'a1000001-0000-4000-8000-000000000005',
       'org attempt'
     ) $$,
  'P0001',
  'NOT_AUTHORIZED',
  'organization admin cannot suspend accounts'
);

-- ---------------------------------------------------------------------------
-- 2. Profiles RLS: support has no direct access, must use functions
-- ---------------------------------------------------------------------------

reset role;
select pg_temp.auth_as('a1000001-0000-4000-8000-000000000001');

select is_empty(
  $$ select id from public.profiles
     where id = 'a1000001-0000-4000-8000-000000000005' $$,
  'platform_support cannot read profiles directly'
);

reset role;
select pg_temp.auth_as('a1000001-0000-4000-8000-000000000005');

select is_empty(
  $$ select id from public.profiles
     where id = 'a1000001-0000-4000-8000-000000000001' $$,
  'ordinary worker cannot read other profiles'
);

-- ---------------------------------------------------------------------------
-- 3. platform_support permissions
-- ---------------------------------------------------------------------------

reset role;
select pg_temp.auth_as('a1000001-0000-4000-8000-000000000001');

select isnt_empty(
  $$ select user_id from public.worker_support_view()
     where user_id = 'a1000001-0000-4000-8000-000000000005' $$,
  'platform_support can read worker profiles via view'
);

select isnt_empty(
  $$ select id from public.credential_support_view()
     where id = 'a1000001-cccc-4000-8000-0000000000d1' $$,
  'platform_support can read credential metadata via view'
);

select throws_ok(
  $$ select public.verify_credential(
       'a1000001-cccc-4000-8000-0000000000d1',
       'approve'
     ) $$,
  'P0001',
  'NOT_AUTHORIZED',
  'platform_support cannot verify credentials'
);

select throws_ok(
  $$ select public.set_worker_verification(
       'a1000001-0000-4000-8000-000000000005',
       'verified'
     ) $$,
  'P0001',
  'NOT_AUTHORIZED',
  'platform_support cannot verify workers'
);

select throws_ok(
  $$ select public.suspend_worker_account(
       'a1000001-0000-4000-8000-000000000005',
       'support attempt'
     ) $$,
  'P0001',
  'NOT_AUTHORIZED',
  'platform_support cannot suspend accounts'
);

-- ---------------------------------------------------------------------------
-- 4. platform_finance permissions (Phase 4: no worker/credential access)
-- ---------------------------------------------------------------------------

reset role;
select pg_temp.auth_as('a1000001-0000-4000-8000-000000000003');

select throws_ok(
  $$ select public.verify_credential(
       'a1000001-cccc-4000-8000-0000000000d1',
       'approve'
     ) $$,
  'P0001',
  'NOT_AUTHORIZED',
  'platform_finance cannot verify credentials'
);

select throws_ok(
  $$ select public.suspend_worker_account(
       'a1000001-0000-4000-8000-000000000005',
       'finance attempt'
     ) $$,
  'P0001',
  'NOT_AUTHORIZED',
  'platform_finance cannot suspend accounts'
);

select is_empty(
  $$ select id from public.profiles
     where id = 'a1000001-0000-4000-8000-000000000005' $$,
  'platform_finance cannot read worker profiles in Phase 4'
);

-- ---------------------------------------------------------------------------
-- 5. Credential submit + verify/reject
-- ---------------------------------------------------------------------------

reset role;
select pg_temp.auth_as('a1000001-0000-4000-8000-000000000005');

select lives_ok(
  $$ select public.submit_credential_for_review(
       'a1000001-cccc-4000-8000-0000000000d1'
     ) $$,
  'worker can submit own pending credential for review'
);

select is(
  (
    select status from public.credentials
    where id = 'a1000001-cccc-4000-8000-0000000000d1'
  ),
  'under_review'::public.credential_status,
  'submitted credential is under_review'
);

select throws_ok(
  $$ select public.submit_credential_for_review(
       'a1000001-cccc-4000-8000-0000000000d1'
     ) $$,
  'P0001',
  'INVALID_TRANSITION',
  'cannot re-submit non-pending credential'
);

select throws_ok(
  $$ select public.submit_credential_for_review(
       'a1000001-cccc-4000-8000-0000000000d3'
     ) $$,
  'P0001',
  'NOT_AUTHORIZED',
  'worker cannot submit another worker credential'
);

reset role;
select pg_temp.auth_as('a1000001-0000-4000-8000-000000000002');

select lives_ok(
  $$ select public.submit_credential_for_review(
       'a1000001-cccc-4000-8000-0000000000d2'
     ) $$,
  'platform_verifier can begin review on pending credential'
);

select lives_ok(
  $$ select public.verify_credential(
       'a1000001-cccc-4000-8000-0000000000d1',
       'approve'
     ) $$,
  'platform_verifier can approve under_review credential'
);

select is(
  (
    select status from public.credentials
    where id = 'a1000001-cccc-4000-8000-0000000000d1'
  ),
  'verified'::public.credential_status,
  'approved credential is verified'
);

select throws_ok(
  $$ select public.verify_credential(
       'a1000001-cccc-4000-8000-0000000000d2',
       'reject',
       null
     ) $$,
  'P0001',
  'REJECTION_REASON_REQUIRED',
  'rejecting credential without reason fails'
);

select lives_ok(
  $$ select public.verify_credential(
       'a1000001-cccc-4000-8000-0000000000d2',
       'reject',
       'Document illegible'
     ) $$,
  'platform_verifier can reject under_review credential with reason'
);

select is(
  (
    select status from public.credentials
    where id = 'a1000001-cccc-4000-8000-0000000000d2'
  ),
  'rejected'::public.credential_status,
  'rejected credential remains with rejected status'
);

select throws_ok(
  $$ select public.verify_credential(
       'a1000001-cccc-4000-8000-0000000000d1',
       'approve'
     ) $$,
  'P0001',
  'INVALID_TRANSITION',
  'cannot re-approve already verified credential'
);

-- ---------------------------------------------------------------------------
-- 6. Self-verification denied
-- ---------------------------------------------------------------------------

reset role;
select pg_temp.auth_as('a1000001-0000-4000-8000-000000000007');

select throws_ok(
  $$ select public.verify_credential(
       'a1000001-cccc-4000-8000-0000000000d3',
       'approve'
     ) $$,
  'P0001',
  'CANNOT_SELF_VERIFY',
  'verifier cannot approve own credential'
);

select throws_ok(
  $$ select public.set_worker_verification(
       'a1000001-0000-4000-8000-000000000007',
       'verified'
     ) $$,
  'P0001',
  'CANNOT_SELF_VERIFY',
  'verifier cannot verify own worker profile'
);

-- ---------------------------------------------------------------------------
-- 7. Worker verification blocked without required credentials
-- ---------------------------------------------------------------------------

reset role;
select pg_temp.auth_as('a1000001-0000-4000-8000-000000000002');

select throws_ok(
  $$ select public.set_worker_verification(
       'a1000001-0000-4000-8000-000000000005',
       'verified'
     ) $$,
  'P0001',
  'MISSING_REQUIRED_CREDENTIAL:identity_document_front',
  'cannot verify worker without all required credentials'
);

-- Seed remaining required RN credentials as pending, then approve + payout
reset role;
insert into public.credentials (
  id, worker_id, credential_type, status, expires_at, storage_path, storage_paths
) values
  (
    'a1000001-cccc-4000-8000-0000000000d4',
    'a1000001-0000-4000-8000-000000000005',
    'identity_document_front',
    'pending',
    now() + interval '1 year',
    'a1000001-0000-4000-8000-000000000005/identity_document_front/v2.pdf',
    '["a1000001-0000-4000-8000-000000000005/identity_document_front/v2.pdf"]'::jsonb
  ),
  (
    'a1000001-cccc-4000-8000-0000000000d5',
    'a1000001-0000-4000-8000-000000000005',
    'identity_document_back',
    'pending',
    now() + interval '1 year',
    'a1000001-0000-4000-8000-000000000005/identity_document_back/seed.pdf',
    '["a1000001-0000-4000-8000-000000000005/identity_document_back/seed.pdf"]'::jsonb
  ),
  (
    'a1000001-cccc-4000-8000-0000000000d6',
    'a1000001-0000-4000-8000-000000000005',
    'nursing_degree',
    'pending',
    now() + interval '1 year',
    'a1000001-0000-4000-8000-000000000005/nursing_degree/seed.pdf',
    '["a1000001-0000-4000-8000-000000000005/nursing_degree/seed.pdf"]'::jsonb
  ),
  (
    'a1000001-cccc-4000-8000-0000000000d7',
    'a1000001-0000-4000-8000-000000000005',
    'tax_identification_proof',
    'pending',
    null,
    'a1000001-0000-4000-8000-000000000005/tax_identification_proof/seed.pdf',
    '["a1000001-0000-4000-8000-000000000005/tax_identification_proof/seed.pdf"]'::jsonb
  ),
  (
    'a1000001-cccc-4000-8000-0000000000d8',
    'a1000001-0000-4000-8000-000000000005',
    'social_insurance_proof',
    'pending',
    null,
    'a1000001-0000-4000-8000-000000000005/social_insurance_proof/seed.pdf',
    '["a1000001-0000-4000-8000-000000000005/social_insurance_proof/seed.pdf"]'::jsonb
  )
on conflict (id) do nothing;

insert into public.payout_accounts (
  worker_id, country, currency, masked_iban, status
) values (
  'a1000001-0000-4000-8000-000000000005',
  'CY',
  'EUR',
  'CY••••9999',
  'pending'
)
on conflict (worker_id) do update
set masked_iban = excluded.masked_iban,
    status = 'pending';

select pg_temp.auth_as('a1000001-0000-4000-8000-000000000002');

select lives_ok(
  $$ select public.verify_credential(
       'a1000001-cccc-4000-8000-0000000000d4',
       'approve'
     ) $$,
  'platform_verifier can approve replacement identity front'
);

select lives_ok(
  $$ select public.verify_credential(
       'a1000001-cccc-4000-8000-0000000000d5',
       'approve'
     ) $$,
  'platform_verifier can approve identity back'
);

select lives_ok(
  $$ select public.verify_credential(
       'a1000001-cccc-4000-8000-0000000000d6',
       'approve'
     ) $$,
  'platform_verifier can approve nursing degree'
);

select lives_ok(
  $$ select public.verify_credential(
       'a1000001-cccc-4000-8000-0000000000d7',
       'approve'
     ) $$,
  'platform_verifier can approve tax proof'
);

select lives_ok(
  $$ select public.verify_credential(
       'a1000001-cccc-4000-8000-0000000000d8',
       'approve'
     ) $$,
  'platform_verifier can approve social insurance proof'
);

select is(
  (
    select verification_status from public.worker_profiles
    where user_id = 'a1000001-0000-4000-8000-000000000005'
  ),
  'draft'::public.verification_status,
  'final worker approval is not automatic after last credential approve'
);

select throws_ok(
  $$ select public.set_worker_verification(
       'a1000001-0000-4000-8000-000000000005',
       'verified'
     ) $$,
  'P0001',
  'PAYOUT_ACCOUNT_REQUIRED',
  'pending payout blocks final worker verification'
);

select throws_ok(
  $$ select public.verify_payout_account(
       (select id from public.payout_accounts
        where worker_id = 'a1000001-0000-4000-8000-000000000005'),
       'approve',
       'verifier attempt'
     ) $$,
  'P0001',
  'NOT_AUTHORIZED',
  'platform_verifier cannot approve payout accounts'
);

reset role;
select pg_temp.auth_as('a1000001-0000-4000-8000-000000000003');

select throws_ok(
  $$ select public.verify_payout_account(
       (select id from public.payout_accounts
        where worker_id = 'a1000001-0000-4000-8000-000000000005'),
       'approve',
       'finance attempt'
     ) $$,
  'P0001',
  'NOT_AUTHORIZED',
  'platform_finance cannot approve payout accounts in Phase 4'
);

reset role;
select pg_temp.auth_as('a1000001-0000-4000-8000-000000000004');

select throws_ok(
  $$ select public.verify_payout_account(
       (select id from public.payout_accounts
        where worker_id = 'a1000001-0000-4000-8000-000000000005'),
       'approve',
       null
     ) $$,
  'P0001',
  'REASON_REQUIRED',
  'payout approval requires a reason'
);

select lives_ok(
  $$ select public.verify_payout_account(
       (select id from public.payout_accounts
        where worker_id = 'a1000001-0000-4000-8000-000000000005'),
       'approve',
       'Dummy local bank details look consistent'
     ) $$,
  'platform_super_admin can approve payout account for platform use'
);

select ok(
  not exists (
    select 1 from public.audit_events
    where entity_type = 'payout_account'
      and (
        after ? 'masked_iban'
        or after ? 'iban'
        or before ? 'masked_iban'
        or before ? 'iban'
      )
  ),
  'payout verify audit metadata contains no IBAN fields'
);

reset role;
select pg_temp.auth_as('a1000001-0000-4000-8000-000000000002');

select lives_ok(
  $$ select public.set_worker_verification(
       'a1000001-0000-4000-8000-000000000005',
       'verified'
     ) $$,
  'platform_verifier can verify worker with required credentials and verified payout'
);

select is(
  (
    select verification_status from public.worker_profiles
    where user_id = 'a1000001-0000-4000-8000-000000000005'
  ),
  'verified'::public.verification_status,
  'worker verification_status is verified'
);

select throws_ok(
  $$ select public.set_worker_verification(
       'a1000001-0000-4000-8000-000000000005',
       'rejected',
       null
     ) $$,
  'P0001',
  'REASON_REQUIRED',
  'rejecting worker without reason fails'
);

-- ---------------------------------------------------------------------------
-- 8. Suspension / reactivation
-- ---------------------------------------------------------------------------

reset role;
select pg_temp.auth_as('a1000001-0000-4000-8000-000000000002');

select throws_ok(
  $$ select public.suspend_worker_account(
       'a1000001-0000-4000-8000-000000000005',
       'verifier attempt'
     ) $$,
  'P0001',
  'NOT_AUTHORIZED',
  'platform_verifier cannot suspend accounts'
);

reset role;
select pg_temp.auth_as('a1000001-0000-4000-8000-000000000004');

select throws_ok(
  $$ select public.suspend_worker_account(
       'a1000001-0000-4000-8000-000000000005',
       ''
     ) $$,
  'P0001',
  'REASON_REQUIRED',
  'suspend without reason fails'
);

select lives_ok(
  $$ select public.suspend_worker_account(
       'a1000001-0000-4000-8000-000000000005',
       'Policy violation'
     ) $$,
  'platform_super_admin can suspend with reason'
);

select is(
  (
    select account_status from public.profiles
    where id = 'a1000001-0000-4000-8000-000000000005'
  ),
  'suspended'::public.account_status,
  'suspended worker has account_status suspended'
);

select throws_ok(
  $$ select public.suspend_worker_account(
       'a1000001-0000-4000-8000-000000000005',
       'again'
     ) $$,
  'P0001',
  'ALREADY_SUSPENDED',
  'cannot suspend already suspended account'
);

-- ---------------------------------------------------------------------------
-- 9. Suspended worker cannot claim a shift
-- ---------------------------------------------------------------------------

reset role;
select pg_temp.auth_as('a1000001-0000-4000-8000-000000000005');

select is(
  public.check_worker_eligibility(
    'a1000001-0000-4000-8000-000000000005',
    'a1000001-cccc-4000-8000-0000000000c1'
  ),
  'account_not_active',
  'suspended worker is not eligible'
);

select throws_ok(
  $$ select public.claim_shift('a1000001-cccc-4000-8000-0000000000c1') $$,
  'P0001',
  'NOT_ELIGIBLE:account_not_active',
  'suspended worker cannot claim a shift'
);

-- ---------------------------------------------------------------------------
-- 10. Reactivation
-- ---------------------------------------------------------------------------

reset role;
select pg_temp.auth_as('a1000001-0000-4000-8000-000000000004');

select lives_ok(
  $$ select public.reactivate_worker_account(
       'a1000001-0000-4000-8000-000000000005',
       'Appeal accepted'
     ) $$,
  'platform_super_admin can reactivate with reason'
);

select is(
  (
    select account_status from public.profiles
    where id = 'a1000001-0000-4000-8000-000000000005'
  ),
  'active'::public.account_status,
  'reactivated worker is active'
);

select throws_ok(
  $$ select public.reactivate_worker_account(
       'a1000001-0000-4000-8000-000000000005',
       'again'
     ) $$,
  'P0001',
  'ALREADY_ACTIVE',
  'cannot reactivate already active account'
);

-- ---------------------------------------------------------------------------
-- 11. Audit events for sensitive actions
-- ---------------------------------------------------------------------------

reset role;
select pg_temp.auth_as('a1000001-0000-4000-8000-000000000004');

select ok(
  exists (
    select 1 from public.audit_events
    where action = 'suspend_account'
      and entity_id = 'a1000001-0000-4000-8000-000000000005'
      and actor_user_id = 'a1000001-0000-4000-8000-000000000004'
  ),
  'suspend creates audit event'
);

select ok(
  exists (
    select 1 from public.audit_events
    where action = 'reactivate_account'
      and entity_id = 'a1000001-0000-4000-8000-000000000005'
  ),
  'reactivate creates audit event'
);

select ok(
  exists (
    select 1 from public.audit_events
    where action = 'verify_credential_approve'
      and entity_id = 'a1000001-cccc-4000-8000-0000000000d1'
  ),
  'credential approve creates audit event'
);

select ok(
  exists (
    select 1 from public.audit_events
    where action = 'verify_credential_reject'
      and entity_id = 'a1000001-cccc-4000-8000-0000000000d2'
  ),
  'credential reject creates audit event'
);

select ok(
  exists (
    select 1 from public.audit_events
    where action = 'set_worker_verification'
      and entity_id = 'a1000001-0000-4000-8000-000000000005'
  ),
  'worker verification creates audit event'
);

select ok(
  exists (
    select 1 from public.audit_events
    where action = 'submit_credential'
      and entity_id = 'a1000001-cccc-4000-8000-0000000000d1'
  ),
  'credential submit creates audit event'
);

-- ---------------------------------------------------------------------------
-- 12. Direct protected status updates remain blocked
-- ---------------------------------------------------------------------------

reset role;
select pg_temp.auth_as('a1000001-0000-4000-8000-000000000002');

select throws_ok(
  $$ update public.credentials
     set status = 'verified'
     where id = 'a1000001-cccc-4000-8000-0000000000d3' $$,
  'P0001',
  'CREDENTIAL_STATUS_LOCKED',
  'direct credential status update remains blocked for verifiers'
);

select throws_ok(
  $$ update public.worker_profiles
     set verification_status = 'verified'
     where user_id = 'a1000001-0000-4000-8000-000000000007' $$,
  'P0001',
  'WORKER_VERIFICATION_LOCKED',
  'direct worker verification update remains blocked'
);

-- ---------------------------------------------------------------------------
-- 13. Audit metadata never contains storage_path or sensitive fields
-- ---------------------------------------------------------------------------

reset role;
select pg_temp.auth_as('a1000001-0000-4000-8000-000000000002');

select ok(
  not exists (
    select 1 from public.audit_events
    where after::text like '%storage_path%'
       or before::text like '%storage_path%'
  ),
  'audit metadata never contains storage_path'
);

select ok(
  not exists (
    select 1 from public.audit_events
    where after::text like '%masked_iban%'
       or before::text like '%masked_iban%'
  ),
  'audit metadata never contains masked_iban'
);

-- ---------------------------------------------------------------------------
-- 14. platform_support cannot access credential storage_path via table
-- ---------------------------------------------------------------------------

reset role;
select pg_temp.auth_as('a1000001-0000-4000-8000-000000000001');

select is_empty(
  $$ select id from public.credentials
     where id = 'a1000001-cccc-4000-8000-0000000000d1' $$,
  'platform_support cannot select credentials directly'
);

select isnt_empty(
  $$ select user_id from public.worker_support_view()
     where user_id = 'a1000001-0000-4000-8000-000000000005' $$,
  'platform_support can use worker_support_view'
);

select isnt_empty(
  $$ select id from public.credential_support_view()
     where id = 'a1000001-cccc-4000-8000-0000000000d1' $$,
  'platform_support can use credential_support_view'
);

-- ---------------------------------------------------------------------------
-- 15. platform_finance has no worker/credential access in Phase 4
-- ---------------------------------------------------------------------------

reset role;
select pg_temp.auth_as('a1000001-0000-4000-8000-000000000003');

select is_empty(
  $$ select id from public.profiles
     where id = 'a1000001-0000-4000-8000-000000000005' $$,
  'platform_finance cannot select profiles'
);

select is_empty(
  $$ select user_id from public.worker_profiles
     where user_id = 'a1000001-0000-4000-8000-000000000005' $$,
  'platform_finance cannot select worker_profiles'
);

select is_empty(
  $$ select id from public.credentials
     where id = 'a1000001-cccc-4000-8000-0000000000d1' $$,
  'platform_finance cannot select credentials'
);

select is_empty(
  $$ select user_id from public.worker_support_view()
     where user_id = 'a1000001-0000-4000-8000-000000000005' $$,
  'platform_finance cannot access worker_support_view'
);

-- ---------------------------------------------------------------------------
-- 16. Suspended worker cannot check in / check out / submit timesheet
-- ---------------------------------------------------------------------------

-- Worker 005 was reactivated earlier, suspend again for these tests
reset role;
select pg_temp.auth_as('a1000001-0000-4000-8000-000000000004');

select lives_ok(
  $$ select public.suspend_worker_account(
       'a1000001-0000-4000-8000-000000000005',
       'Test suspension for RPC enforcement'
     ) $$,
  'suspend worker 005 for RPC tests'
);

-- Create an accepted assignment for worker 005
reset role;
set local role postgres;
select set_config('bridgehive.allow_assignment_write', 'on', true);
insert into public.shift_assignments (id, shift_id, worker_id, status, accepted_at)
values (
  'a1000001-cccc-4000-8000-0000000000f1',
  'a1000001-cccc-4000-8000-0000000000c1',
  'a1000001-0000-4000-8000-000000000005',
  'accepted',
  now()
)
on conflict (id) do nothing;
select set_config('bridgehive.allow_assignment_write', 'off', true);

reset role;
select pg_temp.auth_as('a1000001-0000-4000-8000-000000000005');

select throws_ok(
  $$ select public.check_in_assignment(
       'a1000001-cccc-4000-8000-0000000000f1'
     ) $$,
  'P0001',
  'ACCOUNT_NOT_ACTIVE',
  'suspended worker cannot check in'
);

-- Manually set check_in for check_out test
reset role;
set local role postgres;
select set_config('bridgehive.allow_assignment_write', 'on', true);
update public.shift_assignments
set status = 'checked_in', check_in_at = now()
where id = 'a1000001-cccc-4000-8000-0000000000f1';
select set_config('bridgehive.allow_assignment_write', 'off', true);

reset role;
select pg_temp.auth_as('a1000001-0000-4000-8000-000000000005');

select throws_ok(
  $$ select public.check_out_assignment(
       'a1000001-cccc-4000-8000-0000000000f1'
     ) $$,
  'P0001',
  'ACCOUNT_NOT_ACTIVE',
  'suspended worker cannot check out'
);

-- Manually set check_out for submit_timesheet test
reset role;
set local role postgres;
select set_config('bridgehive.allow_assignment_write', 'on', true);
update public.shift_assignments
set status = 'checked_out', check_out_at = now() + interval '1 hour'
where id = 'a1000001-cccc-4000-8000-0000000000f1';
select set_config('bridgehive.allow_assignment_write', 'off', true);

reset role;
select pg_temp.auth_as('a1000001-0000-4000-8000-000000000005');

select throws_ok(
  $$ select public.submit_timesheet(
       'a1000001-cccc-4000-8000-0000000000f1'
     ) $$,
  'P0001',
  'ACCOUNT_NOT_ACTIVE',
  'suspended worker cannot submit timesheet'
);

select throws_ok(
  $$ select public.submit_credential_for_review(
       'a1000001-cccc-4000-8000-0000000000d3'
     ) $$,
  'P0001',
  'ACCOUNT_NOT_ACTIVE',
  'suspended worker cannot submit credential for review'
);

-- ---------------------------------------------------------------------------
-- 17. Self-suspension and self-reactivation are blocked
-- ---------------------------------------------------------------------------

reset role;
select pg_temp.auth_as('a1000001-0000-4000-8000-000000000004');

select throws_ok(
  $$ select public.suspend_worker_account(
       'a1000001-0000-4000-8000-000000000004',
       'self-suspend attempt'
     ) $$,
  'P0001',
  'CANNOT_SUSPEND_SELF',
  'super admin cannot suspend themselves'
);

-- Suspend super admin externally
reset role;
set local role postgres;
update public.profiles
set account_status = 'suspended'
where id = 'a1000001-0000-4000-8000-000000000004';

reset role;
select pg_temp.auth_as('a1000001-0000-4000-8000-000000000004');

select throws_ok(
  $$ select public.reactivate_worker_account(
       'a1000001-0000-4000-8000-000000000004',
       'self-reactivate attempt'
     ) $$,
  'P0001',
  'CANNOT_REACTIVATE_SELF',
  'suspended super admin cannot reactivate themselves'
);

-- ---------------------------------------------------------------------------
-- 18. Suspended admin cannot use platform admin functions
-- ---------------------------------------------------------------------------

select throws_ok(
  $$ select public.suspend_worker_account(
       'a1000001-0000-4000-8000-000000000005',
       'attempt while suspended'
     ) $$,
  'P0001',
  'NOT_AUTHORIZED',
  'suspended super admin cannot suspend others'
);

select throws_ok(
  $$ select public.verify_credential(
       'a1000001-cccc-4000-8000-0000000000d3',
       'approve'
     ) $$,
  'P0001',
  'NOT_AUTHORIZED',
  'suspended admin cannot verify credentials'
);

-- Reactivate super admin for cleanup
reset role;
set local role postgres;
update public.profiles
set account_status = 'active'
where id = 'a1000001-0000-4000-8000-000000000004';

select * from finish();
rollback;
