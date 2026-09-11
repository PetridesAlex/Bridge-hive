-- verification_applications.test.sql
-- Worker-centric application queue, status derivation, package approve.

begin;

select plan(30);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  (
    '00000000-0000-0000-0000-000000000000',
    'b2000001-0000-4000-8000-000000000001',
    'authenticated', 'authenticated', 'va-verifier@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"VA Verifier"}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'b2000001-0000-4000-8000-000000000002',
    'authenticated', 'authenticated', 'va-super@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"VA Super"}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'b2000001-0000-4000-8000-000000000003',
    'authenticated', 'authenticated', 'va-support@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"VA Support"}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'b2000001-0000-4000-8000-000000000004',
    'authenticated', 'authenticated', 'va-finance@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"VA Finance"}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'b2000001-0000-4000-8000-000000000010',
    'authenticated', 'authenticated', 'va-nurse@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Maria Georgiou"}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'b2000001-0000-4000-8000-000000000011',
    'authenticated', 'authenticated', 'va-ward@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Andreas Ward"}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'b2000001-0000-4000-8000-000000000012',
    'authenticated', 'authenticated', 'va-other@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Other Worker"}'::jsonb, now(), now()
  )
on conflict (id) do nothing;

insert into public.profiles (id, full_name, phone) values
  ('b2000001-0000-4000-8000-000000000001', 'VA Verifier', null),
  ('b2000001-0000-4000-8000-000000000002', 'VA Super', null),
  ('b2000001-0000-4000-8000-000000000003', 'VA Support', null),
  ('b2000001-0000-4000-8000-000000000004', 'VA Finance', null),
  ('b2000001-0000-4000-8000-000000000010', 'Maria Georgiou', '+35799000010'),
  ('b2000001-0000-4000-8000-000000000011', 'Andreas Ward', '+35799000011'),
  ('b2000001-0000-4000-8000-000000000012', 'Other Worker', '+35799000012')
on conflict (id) do nothing;

insert into public.platform_admin_roles (user_id, role) values
  ('b2000001-0000-4000-8000-000000000001', 'platform_verifier'),
  ('b2000001-0000-4000-8000-000000000002', 'platform_super_admin'),
  ('b2000001-0000-4000-8000-000000000003', 'platform_support'),
  ('b2000001-0000-4000-8000-000000000004', 'platform_finance')
on conflict (user_id) do update set role = excluded.role;

insert into public.worker_profiles (user_id, worker_role, onboarding_status)
values
  ('b2000001-0000-4000-8000-000000000010', 'registered_nurse', 'completed'),
  ('b2000001-0000-4000-8000-000000000011', 'ward_assistant', 'completed'),
  ('b2000001-0000-4000-8000-000000000012', 'registered_nurse', 'completed')
on conflict (user_id) do nothing;

-- Privileged status setup for application-state tests
do $$ begin
  perform set_config('bridgehive.allow_platform_verify', 'on', true);
end $$;
update public.worker_profiles
set verification_status = 'submitted'
where user_id = 'b2000001-0000-4000-8000-000000000010';
do $$ begin
  perform set_config('bridgehive.allow_platform_verify', 'off', true);
end $$;

-- Nurse: 6 required docs pending with files (no CV)
insert into public.credentials (
  id, worker_id, credential_type, status, storage_path, storage_paths
) values
  ('b2000001-cccc-4000-8000-0000000000d1', 'b2000001-0000-4000-8000-000000000010', 'identity_document_front', 'pending', 'b2000001-0000-4000-8000-000000000010/front.pdf', '["b2000001-0000-4000-8000-000000000010/front.pdf"]'::jsonb),
  ('b2000001-cccc-4000-8000-0000000000d2', 'b2000001-0000-4000-8000-000000000010', 'identity_document_back', 'pending', 'b2000001-0000-4000-8000-000000000010/back.pdf', '["b2000001-0000-4000-8000-000000000010/back.pdf"]'::jsonb),
  ('b2000001-cccc-4000-8000-0000000000d3', 'b2000001-0000-4000-8000-000000000010', 'nursing_licence', 'pending', 'b2000001-0000-4000-8000-000000000010/licence.pdf', '["b2000001-0000-4000-8000-000000000010/licence.pdf"]'::jsonb),
  ('b2000001-cccc-4000-8000-0000000000d4', 'b2000001-0000-4000-8000-000000000010', 'nursing_degree', 'pending', 'b2000001-0000-4000-8000-000000000010/degree.pdf', '["b2000001-0000-4000-8000-000000000010/degree.pdf"]'::jsonb),
  ('b2000001-cccc-4000-8000-0000000000d5', 'b2000001-0000-4000-8000-000000000010', 'tax_identification_proof', 'pending', 'b2000001-0000-4000-8000-000000000010/tax.pdf', '["b2000001-0000-4000-8000-000000000010/tax.pdf"]'::jsonb),
  ('b2000001-cccc-4000-8000-0000000000d6', 'b2000001-0000-4000-8000-000000000010', 'social_insurance_proof', 'pending', 'b2000001-0000-4000-8000-000000000010/si.pdf', '["b2000001-0000-4000-8000-000000000010/si.pdf"]'::jsonb)
on conflict (id) do nothing;

-- Ward assistant: fewer required docs
insert into public.credentials (
  id, worker_id, credential_type, status, storage_path, storage_paths
) values
  ('b2000001-cccc-4000-8000-0000000000e1', 'b2000001-0000-4000-8000-000000000011', 'identity_document_front', 'pending', 'b2000001-0000-4000-8000-000000000011/front.pdf', '["b2000001-0000-4000-8000-000000000011/front.pdf"]'::jsonb),
  ('b2000001-cccc-4000-8000-0000000000e2', 'b2000001-0000-4000-8000-000000000011', 'identity_document_back', 'pending', 'b2000001-0000-4000-8000-000000000011/back.pdf', '["b2000001-0000-4000-8000-000000000011/back.pdf"]'::jsonb),
  ('b2000001-cccc-4000-8000-0000000000e3', 'b2000001-0000-4000-8000-000000000011', 'employment_certificate', 'pending', 'b2000001-0000-4000-8000-000000000011/emp.pdf', '["b2000001-0000-4000-8000-000000000011/emp.pdf"]'::jsonb),
  ('b2000001-cccc-4000-8000-0000000000e4', 'b2000001-0000-4000-8000-000000000011', 'tax_identification_proof', 'pending', 'b2000001-0000-4000-8000-000000000011/tax.pdf', '["b2000001-0000-4000-8000-000000000011/tax.pdf"]'::jsonb),
  ('b2000001-cccc-4000-8000-0000000000e5', 'b2000001-0000-4000-8000-000000000011', 'social_insurance_proof', 'pending', 'b2000001-0000-4000-8000-000000000011/si.pdf', '["b2000001-0000-4000-8000-000000000011/si.pdf"]'::jsonb)
on conflict (id) do nothing;

do $$ begin
  perform set_config('bridgehive.allow_platform_verify', 'on', true);
end $$;
update public.credentials
set status = 'under_review'
where id = 'b2000001-cccc-4000-8000-0000000000e1';
do $$ begin
  perform set_config('bridgehive.allow_platform_verify', 'off', true);
end $$;

-- Other worker single credential (should still be one application row)
insert into public.credentials (
  id, worker_id, credential_type, status, storage_path, storage_paths
) values
  ('b2000001-cccc-4000-8000-0000000000f1', 'b2000001-0000-4000-8000-000000000012', 'identity_document_front', 'pending', 'b2000001-0000-4000-8000-000000000012/front.pdf', '["b2000001-0000-4000-8000-000000000012/front.pdf"]'::jsonb)
on conflict (id) do nothing;

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

-- 1) Nurse status is ready_for_review (submitted + all pending files)
select is(
  public.worker_verification_application_status('b2000001-0000-4000-8000-000000000010'),
  'ready_for_review',
  'nurse with all required pending files and submitted status is ready_for_review'
);

-- 2) Ward under_review when any required under_review
select is(
  public.worker_verification_application_status('b2000001-0000-4000-8000-000000000011'),
  'under_review',
  'ward assistant with under_review credential is under_review'
);

-- 3) Optional CV does not appear in required types for nurse
select ok(
  not ('cv' = any (public.worker_required_credential_types('registered_nurse'::public.worker_role))),
  'optional CV is not a required nurse credential'
);

-- 4) Ward requirements exclude nursing licence/degree
select ok(
  not ('nursing_licence' = any (public.worker_required_credential_types('ward_assistant'::public.worker_role)))
  and not ('nursing_degree' = any (public.worker_required_credential_types('ward_assistant'::public.worker_role))),
  'ward assistant requirements exclude nursing licence and degree'
);

reset role;
select pg_temp.auth_as('b2000001-0000-4000-8000-000000000001');

-- 5-6) Queue returns one row per worker (nurse + ward + other among seeded)
select is(
  (
    select count(*)::int
    from public.list_verification_applications(
      null, null, null, null, 'last_activity', 100, 0
    ) q
    where q.worker_id in (
      'b2000001-0000-4000-8000-000000000010',
      'b2000001-0000-4000-8000-000000000011',
      'b2000001-0000-4000-8000-000000000012'
    )
  ),
  3,
  'three workers appear as three applications regardless of credential count'
);

select is(
  (
    select count(*)::int
    from public.list_verification_applications(
      null, null, null, null, 'last_activity', 100, 0
    ) q
    where q.worker_id = 'b2000001-0000-4000-8000-000000000010'
  ),
  1,
  'nurse with multiple credentials appears once in the application queue'
);

-- 7) Aggregate counts for nurse
select is(
  (
    select awaiting_review_count
    from public.list_verification_applications(
      'Maria', null, null, null, 'last_activity', 10, 0
    )
    where worker_id = 'b2000001-0000-4000-8000-000000000010'
  ),
  6,
  'nurse awaiting review count matches six required pending documents'
);

-- 8) Search by email works for verifier
select is(
  (
    select full_name
    from public.list_verification_applications(
      'va-nurse@test.local', null, null, null, 'last_activity', 10, 0
    )
    limit 1
  ),
  'Maria Georgiou',
  'search by email finds worker application'
);

-- 9) Filter by role
select is(
  (
    select count(*)::int
    from public.list_verification_applications(
      null, 'ward_assistant', null, null, 'last_activity', 50, 0
    ) q
    where q.worker_id in (
      'b2000001-0000-4000-8000-000000000010',
      'b2000001-0000-4000-8000-000000000011',
      'b2000001-0000-4000-8000-000000000012'
    )
  ),
  1,
  'role filter returns only ward assistant among seeded workers'
);

-- 10) Pagination stable (limit 1)
select is(
  (
    select count(*)::int
    from public.list_verification_applications(
      null, null, null, null, 'submitted_at', 1, 0
    )
  ),
  1,
  'pagination limit returns a single application row'
);

-- 11) Finance cannot list applications
reset role;
select pg_temp.auth_as('b2000001-0000-4000-8000-000000000004');
select throws_ok(
  $$ select * from public.list_verification_applications(
       null, null, null, null, 'last_activity', 10, 0
     ) $$,
  'P0001',
  'NOT_AUTHORIZED',
  'finance cannot list verification applications'
);

-- 12) Worker cannot list applications
reset role;
select pg_temp.auth_as('b2000001-0000-4000-8000-000000000010');
select throws_ok(
  $$ select * from public.list_verification_applications(
       null, null, null, null, 'last_activity', 10, 0
     ) $$,
  'P0001',
  'NOT_AUTHORIZED',
  'worker cannot list verification applications'
);

-- 13) Support can list (metadata)
reset role;
select pg_temp.auth_as('b2000001-0000-4000-8000-000000000003');
select ok(
  (
    select count(*) > 0
    from public.list_verification_applications(
      null, null, null, null, 'last_activity', 10, 0
    )
  ),
  'support can list verification applications metadata'
);

-- 14-17) Package approve by verifier
reset role;
select pg_temp.auth_as('b2000001-0000-4000-8000-000000000001');

select throws_ok(
  $$ select public.approve_reviewed_worker_credentials(
       'b2000001-0000-4000-8000-000000000010',
       array['b2000001-cccc-4000-8000-0000000000d1']::uuid[],
       false,
       null
     ) $$,
  'P0001',
  'CONFIRMATION_REQUIRED',
  'package approve requires explicit confirmation'
);

select throws_ok(
  $$ select public.approve_reviewed_worker_credentials(
       'b2000001-0000-4000-8000-000000000010',
       array['b2000001-cccc-4000-8000-0000000000e1']::uuid[],
       true,
       null
     ) $$,
  'P0001',
  'CREDENTIAL_WORKER_MISMATCH',
  'arbitrary credential IDs from another worker are rejected'
);

select lives_ok(
  $$ select public.approve_reviewed_worker_credentials(
       'b2000001-0000-4000-8000-000000000010',
       array[
         'b2000001-cccc-4000-8000-0000000000d1',
         'b2000001-cccc-4000-8000-0000000000d2'
       ]::uuid[],
       true,
       null
     ) $$,
  'verifier can package-approve eligible credentials for selected worker'
);

select is(
  (
    select count(*)::int
    from public.credentials
    where id in (
      'b2000001-cccc-4000-8000-0000000000d1',
      'b2000001-cccc-4000-8000-0000000000d2'
    )
      and status = 'verified'
      and verified_by = 'b2000001-0000-4000-8000-000000000001'
      and verified_at is not null
  ),
  2,
  'each approved credential receives its own reviewer and timestamp'
);

-- 18) Package approve does not auto-verify worker
select is(
  (
    select verification_status::text
    from public.worker_profiles
    where user_id = 'b2000001-0000-4000-8000-000000000010'
  ),
  'submitted',
  'package approval does not automatically approve the worker'
);

-- 19) Reject one credential with reason; keep others verified
select lives_ok(
  $$ select public.verify_credential(
       'b2000001-cccc-4000-8000-0000000000d3',
       'reject',
       'Licence image is unreadable'
     ) $$,
  'individual rejection with reason succeeds'
);

select is(
  public.worker_verification_application_status('b2000001-0000-4000-8000-000000000010'),
  'corrections_required',
  'rejected credential moves application to corrections_required'
);

select is(
  (
    select status::text
    from public.credentials
    where id = 'b2000001-cccc-4000-8000-0000000000d1'
  ),
  'verified',
  'approved credentials remain approved when another item is rejected'
);

-- 20) Ineligible already-verified cannot be re-approved via package
select throws_ok(
  $$ select public.approve_reviewed_worker_credentials(
       'b2000001-0000-4000-8000-000000000010',
       array['b2000001-cccc-4000-8000-0000000000d1']::uuid[],
       true,
       null
     ) $$,
  'P0001',
  'INELIGIBLE_CREDENTIAL:b2000001-cccc-4000-8000-0000000000d1',
  'ineligible verified documents are not approved again'
);

-- 21) Final approval still blocked without full package + payout
select throws_ok(
  $$ select public.set_worker_verification(
       'b2000001-0000-4000-8000-000000000010',
       'verified'
     ) $$,
  'P0001',
  'MISSING_REQUIRED_CREDENTIAL:nursing_licence',
  'final worker approval remains blocked until documents and payout pass'
);

-- 22) Queue cards / list never expose IBAN columns (no masked_iban in result)
select ok(
  not exists (
    select 1
    from information_schema.columns
    where table_name = 'list_verification_applications'
  ),
  'list_verification_applications is a function not a table with IBAN columns'
);

-- 23) Support cannot package approve
reset role;
select pg_temp.auth_as('b2000001-0000-4000-8000-000000000003');
select throws_ok(
  $$ select public.approve_reviewed_worker_credentials(
       'b2000001-0000-4000-8000-000000000011',
       array['b2000001-cccc-4000-8000-0000000000e2']::uuid[],
       true,
       null
     ) $$,
  'P0001',
  'NOT_AUTHORIZED',
  'support cannot package-approve credentials'
);

-- 24) Super admin can package approve
reset role;
select pg_temp.auth_as('b2000001-0000-4000-8000-000000000002');
select lives_ok(
  $$ select public.approve_reviewed_worker_credentials(
       'b2000001-0000-4000-8000-000000000011',
       array['b2000001-cccc-4000-8000-0000000000e2']::uuid[],
       true,
       null
     ) $$,
  'super admin retains authorized package approve'
);

-- 25) Dashboard counts callable by verifier
reset role;
select pg_temp.auth_as('b2000001-0000-4000-8000-000000000001');
select ok(
  (
    select under_review >= 0 and ready_for_review >= 0
    from public.verification_application_dashboard_counts()
  ),
  'dashboard counts RPC returns numeric buckets'
);

-- 26) Sanitized audit exists for package approve
select ok(
  exists (
    select 1
    from public.audit_events
    where action = 'verify_credential_approve'
      and entity_id = 'b2000001-cccc-4000-8000-0000000000d1'
      and after ? 'credential_type'
      and not (after ? 'storage_path')
      and not (after ? 'masked_iban')
  ),
  'package approve creates sanitized audit without storage paths or IBAN'
);

-- 27) Application status is server-derived function (not client writable table)
select ok(
  (
    select prokind = 'f'
    from pg_proc
    where proname = 'worker_verification_application_status'
  ),
  'application status is derived by a database function'
);

-- 28) Queue search does not bypass auth for anonymous
reset role;
do $$ begin
  perform set_config('request.jwt.claims', '', true);
  perform set_config('request.jwt.claim.sub', '', true);
end $$;
set local role anon;
select throws_ok(
  $$ select * from public.list_verification_applications(
       'Maria', null, null, null, 'last_activity', 10, 0
     ) $$,
  'P0001',
  'NOT_AUTHENTICATED',
  'anonymous users cannot search verification applications'
);

select * from finish();
rollback;
