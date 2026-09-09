-- rls_coverage.test.sql
-- Asserts RLS is enabled on foundation tables and clients cannot insert assignments.

begin;

select plan(5);

-- 1) Every foundation table has RLS enabled
select ok(
  not exists (
    select 1
    from unnest(array[
      'profiles',
      'organizations',
      'organization_members',
      'locations',
      'wards',
      'worker_profiles',
      'credentials',
      'shifts',
      'shift_requirements',
      'shift_assignments',
      'timesheets',
      'device_tokens',
      'notifications',
      'audit_events',
      'platform_admin_roles',
      'platform_settings',
      'payout_accounts',
      'payout_account_events',
      'pay_runs',
      'payouts',
      'commission_obligations',
      'organization_payment_reports',
      'payment_adjustments'
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
  'RLS enabled on all foundation tables'
);

-- 2) anon has no DML grants on application tables
select is(
  (
    select count(*)::integer
    from information_schema.role_table_grants
    where grantee = 'anon'
      and table_schema = 'public'
      and table_name in (
        'profiles',
        'organizations',
        'organization_members',
        'locations',
        'wards',
        'worker_profiles',
        'credentials',
        'shifts',
        'shift_requirements',
        'shift_assignments',
        'timesheets',
        'device_tokens',
        'notifications',
        'audit_events',
        'payouts',
        'commission_obligations'
      )
      and privilege_type in ('SELECT', 'INSERT', 'UPDATE', 'DELETE')
  ),
  0,
  'anon has no DML grants on foundation tables'
);

-- Create a real auth user BEFORE switching roles
insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) values (
  '00000000-0000-0000-0000-000000000000',
  '66666666-6666-6666-6666-666666666666',
  'authenticated',
  'authenticated',
  'rls-worker@test.local',
  'test-password-hash',
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"RLS Worker"}'::jsonb,
  now(),
  now()
)
on conflict (id) do nothing;

insert into public.profiles (id, full_name)
values ('66666666-6666-6666-6666-666666666666', 'RLS Worker')
on conflict (id) do nothing;

insert into public.worker_profiles (user_id, worker_role)
values ('66666666-6666-6666-6666-666666666666', 'ward_assistant')
on conflict (user_id) do nothing;

-- Authenticate as worker
select set_config(
  'request.jwt.claims',
  '{"sub":"66666666-6666-6666-6666-666666666666","role":"authenticated","aud":"authenticated"}',
  true
);
select set_config('request.jwt.claim.sub', '66666666-6666-6666-6666-666666666666', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

-- 3) Direct assignment insert is blocked
select throws_ok(
  $$
    insert into public.shift_assignments (shift_id, worker_id, status)
    values (
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa0002',
      '66666666-6666-6666-6666-666666666666',
      'accepted'
    );
  $$,
  'P0001',
  'ASSIGNMENT_INSERT_LOCKED',
  'direct assignment insert is locked for authenticated clients'
);

-- 4) Worker can read own profile
select is(
  (select count(*)::integer from public.profiles where id = auth.uid()),
  1,
  'authenticated worker can select own profile'
);

-- 5) Worker cannot read arbitrary other profiles (none seeded besides self visible)
select is(
  (
    select count(*)::integer
    from public.profiles
    where id <> auth.uid()
  ),
  0,
  'worker cannot select other profiles via RLS'
);

select * from finish();
rollback;
