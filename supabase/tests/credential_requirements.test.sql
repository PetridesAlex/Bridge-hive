-- credential_requirements.test.sql
-- Role-specific credential requirements, payout gating, file locks,
-- and notification metadata safety.

begin;

select plan(48);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  (
    '00000000-0000-0000-0000-000000000000',
    'b1000001-0000-4000-8000-000000000001',
    'authenticated', 'authenticated', 'cred-rn@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"RN Worker"}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'b1000001-0000-4000-8000-000000000002',
    'authenticated', 'authenticated', 'cred-ward@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Ward Worker"}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'b1000001-0000-4000-8000-000000000003',
    'authenticated', 'authenticated', 'cred-verifier@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Cred Verifier"}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'b1000001-0000-4000-8000-000000000004',
    'authenticated', 'authenticated', 'cred-support@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Cred Support"}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'b1000001-0000-4000-8000-000000000005',
    'authenticated', 'authenticated', 'cred-finance@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Cred Finance"}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'b1000001-0000-4000-8000-000000000006',
    'authenticated', 'authenticated', 'cred-org@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Cred Org"}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'b1000001-0000-4000-8000-000000000007',
    'authenticated', 'authenticated', 'cred-super@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Cred Super"}'::jsonb, now(), now()
  )
on conflict (id) do nothing;

insert into public.profiles (id, full_name) values
  ('b1000001-0000-4000-8000-000000000001', 'RN Worker'),
  ('b1000001-0000-4000-8000-000000000002', 'Ward Worker'),
  ('b1000001-0000-4000-8000-000000000003', 'Cred Verifier'),
  ('b1000001-0000-4000-8000-000000000004', 'Cred Support'),
  ('b1000001-0000-4000-8000-000000000005', 'Cred Finance'),
  ('b1000001-0000-4000-8000-000000000006', 'Cred Org'),
  ('b1000001-0000-4000-8000-000000000007', 'Cred Super')
on conflict (id) do nothing;

insert into public.platform_admin_roles (user_id, role) values
  ('b1000001-0000-4000-8000-000000000003', 'platform_verifier'),
  ('b1000001-0000-4000-8000-000000000004', 'platform_support'),
  ('b1000001-0000-4000-8000-000000000005', 'platform_finance'),
  ('b1000001-0000-4000-8000-000000000007', 'platform_super_admin')
on conflict (user_id) do update set role = excluded.role;

insert into public.worker_profiles (user_id, worker_role, onboarding_status, verification_status)
values
  ('b1000001-0000-4000-8000-000000000001', 'registered_nurse', 'completed', 'draft'),
  ('b1000001-0000-4000-8000-000000000002', 'ward_assistant', 'completed', 'draft')
on conflict (user_id) do nothing;

insert into public.organizations (id, legal_name, display_name, slug, status)
values (
  'b1000001-cccc-4000-8000-0000000000a1',
  'Cred Org Ltd', 'Cred Org', 'cred-req-org', 'active'
)
on conflict (id) do nothing;

insert into public.organization_members (organization_id, user_id, role, status, accepted_at)
values (
  'b1000001-cccc-4000-8000-0000000000a1',
  'b1000001-0000-4000-8000-000000000006',
  'org_admin', 'active', now()
)
on conflict (organization_id, user_id) do nothing;

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
-- Requirement mapping
-- ---------------------------------------------------------------------------

select is(
  public.worker_required_credential_types('registered_nurse'),
  array[
    'identity_document_front',
    'identity_document_back',
    'nursing_licence',
    'nursing_degree',
    'tax_identification_proof',
    'social_insurance_proof'
  ]::text[],
  'registered nurse required credential types'
);

select results_eq(
  $$ select credential_type from public.worker_credential_requirements('registered_nurse')
     where not is_required $$,
  $$ values ('cv') $$,
  'CV optional for nurses'
);

select is(
  public.worker_required_credential_types('ward_assistant'),
  array[
    'identity_document_front',
    'identity_document_back',
    'employment_certificate',
    'tax_identification_proof',
    'social_insurance_proof'
  ]::text[],
  'ward assistant required credential types'
);

select is(
  (
    select count(*)::integer
    from public.worker_credential_requirements('ward_assistant')
    where credential_type in ('nursing_licence', 'nursing_degree')
  ),
  0,
  'nursing licence and degree not required for ward assistants'
);

select ok(
  exists (
    select 1 from public.worker_credential_requirements('ward_assistant')
    where credential_type = 'employment_certificate' and is_required
  ),
  'employment certificate required for ward assistants'
);

select ok(
  exists (
    select 1 from public.worker_credential_requirements('registered_nurse')
    where credential_type = 'identity_document_front' and is_required
  )
  and exists (
    select 1 from public.worker_credential_requirements('registered_nurse')
    where credential_type = 'identity_document_back' and is_required
  ),
  'identity front and back required for nurses'
);

select ok(
  exists (
    select 1 from public.worker_credential_requirements('ward_assistant')
    where credential_type = 'identity_document_front' and is_required
  )
  and exists (
    select 1 from public.worker_credential_requirements('ward_assistant')
    where credential_type = 'identity_document_back' and is_required
  ),
  'identity front and back required for ward assistants'
);

select ok(
  exists (
    select 1 from public.worker_credential_requirements('registered_nurse')
    where credential_type = 'tax_identification_proof' and is_required
  )
  and exists (
    select 1 from public.worker_credential_requirements('ward_assistant')
    where credential_type = 'tax_identification_proof' and is_required
  ),
  'tax proof required for both roles'
);

select ok(
  exists (
    select 1 from public.worker_credential_requirements('registered_nurse')
    where credential_type = 'social_insurance_proof' and is_required
  )
  and exists (
    select 1 from public.worker_credential_requirements('ward_assistant')
    where credential_type = 'social_insurance_proof' and is_required
  ),
  'social-insurance proof required for both roles'
);

select is(
  public.worker_has_satisfied_payout_account('b1000001-0000-4000-8000-000000000001'),
  false,
  'payout account requirement unchecked until submitted'
);

-- Current draft worker awaiting documents (not review queue)
select is(
  (
    select verification_status from public.worker_profiles
    where user_id = 'b1000001-0000-4000-8000-000000000001'
  ),
  'draft'::public.verification_status,
  'current draft worker remains draft'
);

select is(
  (
    select count(*)::integer from public.credentials
    where worker_id = 'b1000001-0000-4000-8000-000000000001'
      and status in ('pending', 'under_review')
  ),
  0,
  'draft worker has no review-queue credentials'
);

-- ---------------------------------------------------------------------------
-- Upload / submit / lock behavior
-- ---------------------------------------------------------------------------

reset role;
select pg_temp.auth_as('b1000001-0000-4000-8000-000000000001');

select lives_ok(
  $$ insert into public.credentials (
       id, worker_id, credential_type, status, storage_path, storage_paths
     ) values (
       'b1000001-cccc-4000-8000-0000000000d1',
       'b1000001-0000-4000-8000-000000000001',
       'nursing_licence',
       'pending',
       'b1000001-0000-4000-8000-000000000001/nursing_licence/a.pdf',
       '["b1000001-0000-4000-8000-000000000001/nursing_licence/a.pdf"]'::jsonb
     ) $$,
  'worker can create own pending credential with file metadata'
);

select throws_ok(
  $$ insert into public.credentials (
       id, worker_id, credential_type, status, storage_path
     ) values (
       'b1000001-cccc-4000-8000-0000000000d2',
       'b1000001-0000-4000-8000-000000000002',
       'employment_certificate',
       'pending',
       'x'
     ) $$,
  '42501',
  null,
  'worker cannot create credential for another worker'
);

reset role;
insert into public.credentials (
  id, worker_id, credential_type, status
) values (
  'b1000001-cccc-4000-8000-0000000000d0',
  'b1000001-0000-4000-8000-000000000001',
  'cv',
  'pending'
);

select pg_temp.auth_as('b1000001-0000-4000-8000-000000000001');

select throws_ok(
  $$ select public.submit_credential_for_review(
       'b1000001-cccc-4000-8000-0000000000d0'
     ) $$,
  'P0001',
  'CREDENTIAL_FILE_REQUIRED',
  'credential without file cannot be submitted'
);

select lives_ok(
  $$ select public.submit_credential_for_review(
       'b1000001-cccc-4000-8000-0000000000d1'
     ) $$,
  'worker can submit pending credential with file'
);

select throws_ok(
  $$ update public.credentials
     set storage_path = 'b1000001-0000-4000-8000-000000000001/nursing_licence/replaced.pdf'
     where id = 'b1000001-cccc-4000-8000-0000000000d1' $$,
  'P0001',
  'CREDENTIAL_FILE_LOCKED',
  'submitted documents cannot be silently replaced'
);

select throws_ok(
  $$ update public.credentials
     set status = 'verified'
     where id = 'b1000001-cccc-4000-8000-0000000000d1' $$,
  'P0001',
  'CREDENTIAL_STATUS_LOCKED',
  'worker cannot directly verify credentials'
);

-- Rejected resubmission: approve path via verifier then reject, then new pending
reset role;
select pg_temp.auth_as('b1000001-0000-4000-8000-000000000003');

select lives_ok(
  $$ select public.verify_credential(
       'b1000001-cccc-4000-8000-0000000000d1',
       'reject',
       'Unreadable scan'
     ) $$,
  'verifier can reject submitted credential'
);

reset role;
select pg_temp.auth_as('b1000001-0000-4000-8000-000000000001');

select lives_ok(
  $$ insert into public.credentials (
       id, worker_id, credential_type, status, storage_path, storage_paths
     ) values (
       'b1000001-cccc-4000-8000-0000000000d3',
       'b1000001-0000-4000-8000-000000000001',
       'nursing_licence',
       'pending',
       'b1000001-0000-4000-8000-000000000001/nursing_licence/resubmit.pdf',
       '["b1000001-0000-4000-8000-000000000001/nursing_licence/resubmit.pdf"]'::jsonb
     ) $$,
  'rejected document resubmission creates a new pending credential'
);

-- ---------------------------------------------------------------------------
-- Final verification gating
-- ---------------------------------------------------------------------------

reset role;
select pg_temp.auth_as('b1000001-0000-4000-8000-000000000003');

select throws_ok(
  $$ select public.set_worker_verification(
       'b1000001-0000-4000-8000-000000000001',
       'verified'
     ) $$,
  'P0001',
  'MISSING_REQUIRED_CREDENTIAL:identity_document_front',
  'missing required document blocks final verification'
);

-- Insert remaining required docs (licence already pending as d3 from resubmit)
reset role;
-- Make the pending licence expired before approval
update public.credentials
set expires_at = now() - interval '1 day'
where id = 'b1000001-cccc-4000-8000-0000000000d3';

insert into public.credentials (
  id, worker_id, credential_type, status, expires_at, storage_path, storage_paths
) values
  ('b1000001-cccc-4000-8000-0000000000e1', 'b1000001-0000-4000-8000-000000000001', 'identity_document_front', 'pending', now() + interval '1 year', 'p/front.pdf', '["p/front.pdf"]'::jsonb),
  ('b1000001-cccc-4000-8000-0000000000e2', 'b1000001-0000-4000-8000-000000000001', 'identity_document_back', 'pending', now() + interval '1 year', 'p/back.pdf', '["p/back.pdf"]'::jsonb),
  ('b1000001-cccc-4000-8000-0000000000e3', 'b1000001-0000-4000-8000-000000000001', 'nursing_degree', 'pending', null, 'p/degree.pdf', '["p/degree.pdf"]'::jsonb),
  ('b1000001-cccc-4000-8000-0000000000e4', 'b1000001-0000-4000-8000-000000000001', 'tax_identification_proof', 'pending', null, 'p/tax.pdf', '["p/tax.pdf"]'::jsonb),
  ('b1000001-cccc-4000-8000-0000000000e5', 'b1000001-0000-4000-8000-000000000001', 'social_insurance_proof', 'pending', null, 'p/si.pdf', '["p/si.pdf"]'::jsonb);

select pg_temp.auth_as('b1000001-0000-4000-8000-000000000003');
select lives_ok($$ select public.verify_credential('b1000001-cccc-4000-8000-0000000000e1', 'approve') $$, 'approve front');
select lives_ok($$ select public.verify_credential('b1000001-cccc-4000-8000-0000000000e2', 'approve') $$, 'approve back');
select lives_ok($$ select public.verify_credential('b1000001-cccc-4000-8000-0000000000e3', 'approve') $$, 'approve degree');
select lives_ok($$ select public.verify_credential('b1000001-cccc-4000-8000-0000000000e4', 'approve') $$, 'approve tax');
select lives_ok($$ select public.verify_credential('b1000001-cccc-4000-8000-0000000000e5', 'approve') $$, 'approve social');
select lives_ok($$ select public.verify_credential('b1000001-cccc-4000-8000-0000000000d3', 'approve') $$, 'approve expired licence row');

select throws_ok(
  $$ select public.set_worker_verification(
       'b1000001-0000-4000-8000-000000000001',
       'verified'
     ) $$,
  'P0001',
  'MISSING_REQUIRED_CREDENTIAL:nursing_licence',
  'expired nursing licence blocks nurse verification'
);

-- Fix licence expiry + payout; CV remains optional
reset role;
select set_config('bridgehive.allow_platform_verify', 'on', true);
update public.credentials
set expires_at = now() + interval '1 year'
where id = 'b1000001-cccc-4000-8000-0000000000d3';
select set_config('bridgehive.allow_platform_verify', 'off', true);

insert into public.payout_accounts (worker_id, country, currency, masked_iban, status)
values ('b1000001-0000-4000-8000-000000000001', 'CY', 'EUR', 'CY••••1111', 'pending')
on conflict (worker_id) do update set status = 'pending', masked_iban = excluded.masked_iban;

select is(
  public.worker_has_satisfied_payout_account('b1000001-0000-4000-8000-000000000001'),
  false,
  'pending payout does not satisfy payout-account requirement'
);

select pg_temp.auth_as('b1000001-0000-4000-8000-000000000003');

select throws_ok(
  $$ select public.set_worker_verification(
       'b1000001-0000-4000-8000-000000000001',
       'verified'
     ) $$,
  'P0001',
  'PAYOUT_ACCOUNT_REQUIRED',
  'pending payout blocks set_worker_verification'
);

select throws_ok(
  $$ select public.verify_payout_account(
       (select id from public.payout_accounts
        where worker_id = 'b1000001-0000-4000-8000-000000000001'),
       'approve',
       'verifier attempt'
     ) $$,
  'P0001',
  'NOT_AUTHORIZED',
  'verifier cannot approve payout accounts'
);

reset role;
select pg_temp.auth_as('b1000001-0000-4000-8000-000000000005');

select throws_ok(
  $$ select public.verify_payout_account(
       (select id from public.payout_accounts
        where worker_id = 'b1000001-0000-4000-8000-000000000001'),
       'approve',
       'finance attempt'
     ) $$,
  'P0001',
  'NOT_AUTHORIZED',
  'finance cannot approve payout accounts'
);

reset role;
select pg_temp.auth_as('b1000001-0000-4000-8000-000000000007');

select lives_ok(
  $$ select public.verify_payout_account(
       (select id from public.payout_accounts
        where worker_id = 'b1000001-0000-4000-8000-000000000001'),
       'approve',
       'Local test approval for platform use'
     ) $$,
  'super admin can approve payout account with reason'
);

select is(
  public.worker_has_satisfied_payout_account('b1000001-0000-4000-8000-000000000001'),
  true,
  'verified payout satisfies payout-account requirement'
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
  'payout audit metadata contains no IBAN or masked_iban'
);

select is(
  (
    select verification_status from public.worker_profiles
    where user_id = 'b1000001-0000-4000-8000-000000000001'
  ),
  'draft'::public.verification_status,
  'final approval is not automatic after payout approve'
);

select pg_temp.auth_as('b1000001-0000-4000-8000-000000000003');

select lives_ok(
  $$ select public.set_worker_verification(
       'b1000001-0000-4000-8000-000000000001',
       'verified'
     ) $$,
  'optional CV absence does not block nurse verification when payout is verified'
);

-- ---------------------------------------------------------------------------
-- Access denials + notifications
-- ---------------------------------------------------------------------------

reset role;
select set_config('request.jwt.claims', '', true);
set local role anon;

select throws_ok(
  $$ select id from public.credentials
     where worker_id = 'b1000001-0000-4000-8000-000000000001' $$,
  '42501',
  null,
  'anonymous users cannot access credential rows'
);

reset role;
select pg_temp.auth_as('b1000001-0000-4000-8000-000000000004');

select is_empty(
  $$ select id from public.credentials
     where worker_id = 'b1000001-0000-4000-8000-000000000001' $$,
  'support cannot access raw credential documents/rows'
);

reset role;
select pg_temp.auth_as('b1000001-0000-4000-8000-000000000005');

select is_empty(
  $$ select id from public.credentials
     where worker_id = 'b1000001-0000-4000-8000-000000000001' $$,
  'finance cannot access credential documents/rows'
);

reset role;
select pg_temp.auth_as('b1000001-0000-4000-8000-000000000006');

select is_empty(
  $$ select id from public.credentials
     where worker_id = 'b1000001-0000-4000-8000-000000000001' $$,
  'organization users cannot access worker credential documents'
);

reset role;
select pg_temp.auth_as('b1000001-0000-4000-8000-000000000002');

select is_empty(
  $$ select id from public.credentials
     where worker_id = 'b1000001-0000-4000-8000-000000000001' $$,
  'worker cannot access another worker credentials'
);

reset role;
select pg_temp.auth_as('b1000001-0000-4000-8000-000000000003');

select isnt_empty(
  $$ select id from public.credentials
     where worker_id = 'b1000001-0000-4000-8000-000000000001' $$,
  'verifier can access credential metadata for review'
);

select lives_ok(
  $$ select public.audit_credential_document_view(
       'b1000001-cccc-4000-8000-0000000000e1'
     ) $$,
  'verifier can audit document views for short-lived URL workflow'
);

select ok(
  not exists (
    select 1 from public.audit_events
    where action = 'view_credential_document'
      and (
        after ? 'storage_path'
        or after ? 'signed_url'
        or before ? 'storage_path'
        or before ? 'signed_url'
      )
  ),
  'document view audit metadata contains no path or URL'
);

select ok(
  not exists (
    select 1 from public.notifications
    where data ? 'storage_path'
       or data ? 'signed_url'
       or data ? 'iban'
       or data ? 'masked_iban'
       or data ? 'tax_id'
       or data ? 'social_insurance_number'
  ),
  'notification metadata contains no sensitive information'
);

reset role;
select pg_temp.auth_as('b1000001-0000-4000-8000-000000000001');

select isnt_empty(
  $$ select id from public.notifications
     where user_id = 'b1000001-0000-4000-8000-000000000001' $$,
  'worker can read own notifications'
);

select is_empty(
  $$ select id from public.notifications
     where user_id = 'b1000001-0000-4000-8000-000000000003' $$,
  'worker cannot read verifier admin task notifications'
);

select finish();
rollback;
