-- app_review_demo.test.sql
-- Platform super-admin enable/revoke of is_app_review_demo, audit, catalog authz,
-- and claim_shift block for demonstration workers.

begin;

select plan(16);

create extension if not exists pgtap with schema extensions;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  (
    '00000000-0000-0000-0000-000000000000',
    'ard00001-0000-4000-8000-000000000001',
    'authenticated', 'authenticated', 'ard-super@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"ARD Super"}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'ard00001-0000-4000-8000-000000000002',
    'authenticated', 'authenticated', 'ard-verifier@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"ARD Verifier"}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'ard00001-0000-4000-8000-000000000003',
    'authenticated', 'authenticated', 'ard-worker@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"ARD Worker"}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'ard00001-0000-4000-8000-000000000004',
    'authenticated', 'authenticated', 'ard-org@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"ARD Org"}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'ard00001-0000-4000-8000-000000000005',
    'authenticated', 'authenticated', 'ard-normal@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"ARD Normal"}'::jsonb, now(), now()
  )
on conflict (id) do nothing;

insert into public.profiles (id, full_name, account_status) values
  ('ard00001-0000-4000-8000-000000000001', 'ARD Super', 'active'),
  ('ard00001-0000-4000-8000-000000000002', 'ARD Verifier', 'active'),
  ('ard00001-0000-4000-8000-000000000003', 'ARD Worker', 'active'),
  ('ard00001-0000-4000-8000-000000000004', 'ARD Org', 'active'),
  ('ard00001-0000-4000-8000-000000000005', 'ARD Normal', 'active')
on conflict (id) do update set account_status = excluded.account_status;

insert into public.platform_admin_roles (user_id, role) values
  ('ard00001-0000-4000-8000-000000000001', 'platform_super_admin'),
  ('ard00001-0000-4000-8000-000000000002', 'platform_verifier')
on conflict (user_id) do update set role = excluded.role;

insert into public.worker_profiles (user_id, worker_role, onboarding_status)
values
  ('ard00001-0000-4000-8000-000000000003', 'registered_nurse', 'completed'),
  ('ard00001-0000-4000-8000-000000000005', 'registered_nurse', 'completed')
on conflict (user_id) do nothing;

insert into public.organizations (id, legal_name, display_name, slug, status)
values (
  'ard00001-cccc-4000-8000-0000000000a1',
  'ARD Org Ltd', 'ARD Org', 'ard-demo-org', 'active'
)
on conflict (id) do nothing;

insert into public.organization_members (organization_id, user_id, role, status, accepted_at)
values (
  'ard00001-cccc-4000-8000-0000000000a1',
  'ard00001-0000-4000-8000-000000000004',
  'org_admin', 'active', now()
)
on conflict (organization_id, user_id) do nothing;

insert into public.locations (id, organization_id, name)
values (
  'ard00001-cccc-4000-8000-0000000000b1',
  'ard00001-cccc-4000-8000-0000000000a1',
  'ARD Site'
)
on conflict (id) do nothing;

insert into public.shifts (
  id, organization_id, location_id, required_role,
  starts_at, ends_at, break_minutes, rate_minor, currency, status, acceptance_deadline
) values (
  'ard00001-cccc-4000-8000-0000000000s1',
  'ard00001-cccc-4000-8000-0000000000a1',
  'ard00001-cccc-4000-8000-0000000000b1',
  'registered_nurse',
  now() + interval '7 days', now() + interval '7 days 8 hours',
  30, 2800, 'EUR', 'published', now() + interval '6 days'
)
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

-- Worker cannot enable flag
reset role;
select pg_temp.auth_as('ard00001-0000-4000-8000-000000000003');

select throws_ok(
  $$ select public.set_worker_app_review_demo(
       'ard00001-0000-4000-8000-000000000003',
       true,
       'self'
     ) $$,
  'P0001',
  'NOT_AUTHORIZED',
  'ordinary worker cannot enable App Review demo'
);

select throws_ok(
  $$ update public.worker_profiles
     set is_app_review_demo = true
     where user_id = 'ard00001-0000-4000-8000-000000000003' $$,
  'P0001',
  'APP_REVIEW_DEMO_LOCKED',
  'worker cannot update is_app_review_demo directly'
);

-- Org admin cannot enable
reset role;
select pg_temp.auth_as('ard00001-0000-4000-8000-000000000004');

select throws_ok(
  $$ select public.set_worker_app_review_demo(
       'ard00001-0000-4000-8000-000000000003',
       true,
       'org'
     ) $$,
  'P0001',
  'NOT_AUTHORIZED',
  'organization admin cannot enable App Review demo'
);

-- Verifier cannot enable
reset role;
select pg_temp.auth_as('ard00001-0000-4000-8000-000000000002');

select throws_ok(
  $$ select public.set_worker_app_review_demo(
       'ard00001-0000-4000-8000-000000000003',
       true,
       'verifier'
     ) $$,
  'P0001',
  'NOT_AUTHORIZED',
  'platform_verifier cannot enable App Review demo'
);

-- Super admin cannot self-target
reset role;
select pg_temp.auth_as('ard00001-0000-4000-8000-000000000001');

select throws_ok(
  $$ select public.set_worker_app_review_demo(
       'ard00001-0000-4000-8000-000000000001',
       true,
       'self'
     ) $$,
  'P0001',
  'CANNOT_SELF_TARGET',
  'super admin cannot target self for App Review demo'
);

-- Super admin can enable
select lives_ok(
  $$ select public.set_worker_app_review_demo(
       'ard00001-0000-4000-8000-000000000003',
       true,
       'Apple App Review'
     ) $$,
  'platform_super_admin can enable App Review demo'
);

select is(
  (
    select is_app_review_demo from public.worker_profiles
    where user_id = 'ard00001-0000-4000-8000-000000000003'
  ),
  true,
  'demo flag is true after enable'
);

select ok(
  exists (
    select 1 from public.audit_events
    where action = 'enable_app_review_demo'
      and entity_id = 'ard00001-0000-4000-8000-000000000003'
      and actor_user_id = 'ard00001-0000-4000-8000-000000000001'
  ),
  'enable writes audit event'
);

-- Normal worker denied catalog
reset role;
select pg_temp.auth_as('ard00001-0000-4000-8000-000000000005');

select throws_ok(
  $$ select public.get_app_review_demo_catalog() $$,
  'P0001',
  'NOT_AUTHORIZED',
  'non-demo worker cannot read demo catalog'
);

-- Demo worker gets catalog; claim forbidden
reset role;
select pg_temp.auth_as('ard00001-0000-4000-8000-000000000003');

select lives_ok(
  $$ select public.get_app_review_demo_catalog() $$,
  'demo worker can read synthetic catalog'
);

select ok(
  (
    select (public.get_app_review_demo_catalog() -> 'shift' ->> 'label')
           like 'APP REVIEW DEMO%'
  ),
  'catalog shift is labelled as demo'
);

select throws_ok(
  $$ select public.claim_shift('ard00001-cccc-4000-8000-0000000000s1') $$,
  'P0001',
  'APP_REVIEW_DEMO_FORBIDDEN',
  'demo worker cannot claim live shifts'
);

select is(
  public.check_worker_eligibility(
    'ard00001-0000-4000-8000-000000000003',
    'ard00001-cccc-4000-8000-0000000000s1'
  ),
  'app_review_demo',
  'eligibility reports app_review_demo for demo workers'
);

-- Revoke restores false
reset role;
select pg_temp.auth_as('ard00001-0000-4000-8000-000000000001');

select lives_ok(
  $$ select public.set_worker_app_review_demo(
       'ard00001-0000-4000-8000-000000000003',
       false,
       'Apple App Review'
     ) $$,
  'platform_super_admin can revoke App Review demo'
);

select is(
  (
    select is_app_review_demo from public.worker_profiles
    where user_id = 'ard00001-0000-4000-8000-000000000003'
  ),
  false,
  'demo flag is false after revoke'
);

select ok(
  exists (
    select 1 from public.audit_events
    where action = 'revoke_app_review_demo'
      and entity_id = 'ard00001-0000-4000-8000-000000000003'
  ),
  'revoke writes audit event'
);

select * from finish();
rollback;
