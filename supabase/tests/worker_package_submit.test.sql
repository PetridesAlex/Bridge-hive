-- worker_package_submit.test.sql
-- Profile bootstrap after confirm + package submit → admin queue status.

begin;

select plan(12);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  (
    '00000000-0000-0000-0000-000000000000',
    'c2400001-0000-4000-8000-000000000001',
    'authenticated', 'authenticated', 'pkg-nurse@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Pkg Nurse","worker_role":"registered_nurse"}'::jsonb,
    now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'c2400001-0000-4000-8000-000000000002',
    'authenticated', 'authenticated', 'pkg-verifier@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Pkg Verifier"}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'c2400001-0000-4000-8000-000000000003',
    'authenticated', 'authenticated', 'pkg-ward@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Pkg Ward","worker_role":"ward_assistant"}'::jsonb,
    now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'c2400001-0000-4000-8000-000000000004',
    'authenticated', 'authenticated', 'pkg-physio@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Pkg Physio","worker_role":"physiotherapist"}'::jsonb,
    now(), now()
  )
on conflict (id) do nothing;

insert into public.profiles (id, full_name, phone, account_status) values
  ('c2400001-0000-4000-8000-000000000001', 'Pkg Nurse', '+35799111111', 'active'),
  ('c2400001-0000-4000-8000-000000000002', 'Pkg Verifier', null, 'active'),
  ('c2400001-0000-4000-8000-000000000003', 'Pkg Ward', '+35799222222', 'active'),
  ('c2400001-0000-4000-8000-000000000004', 'Pkg Physio', '+35799333333', 'active')
on conflict (id) do nothing;

insert into public.platform_admin_roles (user_id, role) values
  ('c2400001-0000-4000-8000-000000000002', 'platform_verifier')
on conflict (user_id) do update set role = excluded.role;

-- No worker_profiles yet for nurse — simulate email-confirm gap.
select is(
  (select count(*)::int from public.worker_profiles
   where user_id = 'c2400001-0000-4000-8000-000000000001'),
  0,
  'nurse starts without worker_profiles row'
);

select set_config(
  'request.jwt.claim.sub',
  'c2400001-0000-4000-8000-000000000001',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$select public.ensure_my_worker_profile('registered_nurse', null)$$,
  'ensure_my_worker_profile bootstraps missing worker profile'
);

select is(
  (select worker_role::text from public.worker_profiles
   where user_id = 'c2400001-0000-4000-8000-000000000001'),
  'registered_nurse',
  'bootstrapped role is registered_nurse'
);

select is(
  (select verification_status::text from public.worker_profiles
   where user_id = 'c2400001-0000-4000-8000-000000000001'),
  'draft',
  'bootstrapped verification stays draft'
);

insert into public.credentials (
  worker_id, credential_type, status, storage_path, storage_paths
)
select
  'c2400001-0000-4000-8000-000000000001',
  t.cred_type,
  'pending',
  'c2400001-0000-4000-8000-000000000001/' || t.cred_type || '.pdf',
  jsonb_build_array('c2400001-0000-4000-8000-000000000001/' || t.cred_type || '.pdf')
from unnest(public.worker_required_credential_types('registered_nurse')) as t(cred_type);

select lives_ok(
  $$select public.submit_worker_verification_package()$$,
  'package submit succeeds with required files'
);

select is(
  (select verification_status::text from public.worker_profiles
   where user_id = 'c2400001-0000-4000-8000-000000000001'),
  'submitted',
  'package submit sets verification_status=submitted'
);

select is(
  (select onboarding_status::text from public.worker_profiles
   where user_id = 'c2400001-0000-4000-8000-000000000001'),
  'completed',
  'package submit completes onboarding'
);

select ok(
  (
    select public.worker_verification_application_status(
      'c2400001-0000-4000-8000-000000000001'
    ) in ('under_review', 'ready_for_review', 'submitted')
  ),
  'application status enters admin review queue'
);

select throws_ok(
  $$select public.set_worker_verification(
    'c2400001-0000-4000-8000-000000000001',
    'verified',
    null
  )$$,
  'NOT_AUTHORIZED',
  'worker cannot call set_worker_verification (platform only)'
);

-- Ward assistant bootstrap with explicit role arg.
select set_config(
  'request.jwt.claim.sub',
  'c2400001-0000-4000-8000-000000000003',
  true
);

select lives_ok(
  $$select public.ensure_my_worker_profile('ward_assistant', null)$$,
  'ensure_my_worker_profile accepts explicit ward_assistant role'
);

select is(
  (select worker_role::text from public.worker_profiles
   where user_id = 'c2400001-0000-4000-8000-000000000003'),
  'ward_assistant',
  'ward assistant profile role persisted'
);

select set_config(
  'request.jwt.claim.sub',
  'c2400001-0000-4000-8000-000000000004',
  true
);

select is(
  (public.ensure_my_worker_profile('physiotherapist', null)).worker_role::text,
  'physiotherapist',
  'ensure_my_worker_profile accepts explicit physiotherapist role'
);

select * from finish();
rollback;
