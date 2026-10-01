-- organization_branding.test.sql
-- Private organization-logos bucket + logo/display-name RPCs + tenant isolation.

begin;
select plan(21);

-- ---------------------------------------------------------------------------
-- Seed two orgs + admin/scheduler/billing + outsider
-- ---------------------------------------------------------------------------
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  (
    '00000000-0000-0000-0000-000000000000',
    'b1111111-1111-4111-8111-111111111111',
    'authenticated', 'authenticated', 'brand-admin-a@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Brand Admin A"}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'b2222222-2222-4222-8222-222222222222',
    'authenticated', 'authenticated', 'brand-sched-a@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Brand Scheduler A"}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'b3333333-3333-4333-8333-333333333333',
    'authenticated', 'authenticated', 'brand-bill-a@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Brand Billing A"}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'b4444444-4444-4444-8444-444444444444',
    'authenticated', 'authenticated', 'brand-admin-b@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Brand Admin B"}'::jsonb, now(), now()
  )
on conflict (id) do nothing;

insert into public.profiles (id, full_name)
values
  ('b1111111-1111-4111-8111-111111111111', 'Brand Admin A'),
  ('b2222222-2222-4222-8222-222222222222', 'Brand Scheduler A'),
  ('b3333333-3333-4333-8333-333333333333', 'Brand Billing A'),
  ('b4444444-4444-4444-8444-444444444444', 'Brand Admin B')
on conflict (id) do update set full_name = excluded.full_name;

insert into public.organizations (id, legal_name, display_name, slug, status)
values
  (
    'b0b0b0b0-b0b0-40b0-80b0-b0b0b0b0b0b0',
    'Brand Org A Ltd', 'Brand Org A', 'brand-org-a', 'active'
  ),
  (
    'b1b1b1b1-b1b1-41b1-81b1-b1b1b1b1b1b1',
    'Brand Org B Ltd', 'Brand Org B', 'brand-org-b', 'active'
  )
on conflict (id) do nothing;

insert into public.organization_members (organization_id, user_id, role, status, accepted_at)
values
  (
    'b0b0b0b0-b0b0-40b0-80b0-b0b0b0b0b0b0',
    'b1111111-1111-4111-8111-111111111111',
    'org_admin', 'active', now()
  ),
  (
    'b0b0b0b0-b0b0-40b0-80b0-b0b0b0b0b0b0',
    'b2222222-2222-4222-8222-222222222222',
    'org_scheduler', 'active', now()
  ),
  (
    'b0b0b0b0-b0b0-40b0-80b0-b0b0b0b0b0b0',
    'b3333333-3333-4333-8333-333333333333',
    'org_billing', 'active', now()
  ),
  (
    'b1b1b1b1-b1b1-41b1-81b1-b1b1b1b1b1b1',
    'b4444444-4444-4444-8444-444444444444',
    'org_admin', 'active', now()
  )
on conflict (organization_id, user_id) do nothing;

insert into storage.objects (bucket_id, name, owner, metadata)
values
  (
    'organization-logos',
    'b0b0b0b0-b0b0-40b0-80b0-b0b0b0b0b0b0/v1.jpg',
    'b1111111-1111-4111-8111-111111111111',
    '{"mimetype":"image/jpeg","size":1024}'::jsonb
  ),
  (
    'organization-logos',
    'b1b1b1b1-b1b1-41b1-81b1-b1b1b1b1b1b1/v1.jpg',
    'b4444444-4444-4444-8444-444444444444',
    '{"mimetype":"image/jpeg","size":1024}'::jsonb
  )
on conflict do nothing;

select is(
  (select public from storage.buckets where id = 'organization-logos'),
  false,
  'organization-logos bucket is private'
);

select ok(
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'organizations'
      and column_name = 'logo_path'
  ),
  'organizations.logo_path column exists'
);

select ok(
  exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'set_organization_logo_path'
      and p.prosecdef
      and coalesce(p.proconfig::text, '') like '%search_path%'
  ),
  'set_organization_logo_path is security definer with search_path'
);

select ok(
  exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'set_organization_display_name'
      and p.prosecdef
      and coalesce(p.proconfig::text, '') like '%search_path%'
  ),
  'set_organization_display_name is security definer with search_path'
);

select is(
  (
    select count(*)::integer
    from information_schema.routine_privileges
    where routine_schema = 'public'
      and routine_name in ('set_organization_logo_path', 'set_organization_display_name')
      and grantee = 'anon'
      and privilege_type = 'EXECUTE'
  ),
  0,
  'anon cannot execute branding RPCs'
);

-- Auth as Org A admin
select set_config(
  'request.jwt.claims',
  '{"sub":"b1111111-1111-4111-8111-111111111111","role":"authenticated","aud":"authenticated"}',
  true
);
select set_config('request.jwt.claim.sub', 'b1111111-1111-4111-8111-111111111111', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select is(
  (
    select count(*)::integer
    from storage.objects
    where bucket_id = 'organization-logos'
      and name = 'b0b0b0b0-b0b0-40b0-80b0-b0b0b0b0b0b0/v1.jpg'
  ),
  1,
  'org admin can read own organization logo object'
);

select is(
  (
    select count(*)::integer
    from storage.objects
    where bucket_id = 'organization-logos'
      and name = 'b1b1b1b1-b1b1-41b1-81b1-b1b1b1b1b1b1/v1.jpg'
  ),
  0,
  'org admin cannot read another organization logo object'
);

select lives_ok(
  $$
    insert into storage.objects (bucket_id, name, owner, metadata)
    values (
      'organization-logos',
      'b0b0b0b0-b0b0-40b0-80b0-b0b0b0b0b0b0/v2.jpg',
      'b1111111-1111-4111-8111-111111111111',
      '{"mimetype":"image/jpeg","size":512}'::jsonb
    )
  $$,
  'org admin can upload into own organization UUID folder'
);

select throws_ok(
  $$
    insert into storage.objects (bucket_id, name, owner, metadata)
    values (
      'organization-logos',
      'b1b1b1b1-b1b1-41b1-81b1-b1b1b1b1b1b1/stolen.jpg',
      'b1111111-1111-4111-8111-111111111111',
      '{"mimetype":"image/jpeg","size":512}'::jsonb
    )
  $$,
  '42501',
  null,
  'org admin cannot upload into another organization folder'
);

select is(
  public.set_organization_logo_path(
    'b0b0b0b0-b0b0-40b0-80b0-b0b0b0b0b0b0',
    'b0b0b0b0-b0b0-40b0-80b0-b0b0b0b0b0b0/v2.jpg'
  ),
  'b0b0b0b0-b0b0-40b0-80b0-b0b0b0b0b0b0/v2.jpg',
  'org admin can set logo_path via RPC'
);

select throws_ok(
  $$
    select public.set_organization_logo_path(
      'b0b0b0b0-b0b0-40b0-80b0-b0b0b0b0b0b0',
      'b1b1b1b1-b1b1-41b1-81b1-b1b1b1b1b1b1/v1.jpg'
    )
  $$,
  'P0001',
  'INVALID_LOGO_PATH',
  'org cannot be pointed at another organization logo path'
);

select is(
  (select display_name from public.set_organization_display_name(
    'b0b0b0b0-b0b0-40b0-80b0-b0b0b0b0b0b0',
    '  Brand Org A Renamed  '
  )),
  'Brand Org A Renamed',
  'org admin can update display_name with trim'
);

select is(
  (
    select slug from public.organizations
    where id = 'b0b0b0b0-b0b0-40b0-80b0-b0b0b0b0b0b0'
  ),
  'brand-org-a',
  'display_name update does not change slug'
);

select is(
  (
    select legal_name from public.organizations
    where id = 'b0b0b0b0-b0b0-40b0-80b0-b0b0b0b0b0b0'
  ),
  'Brand Org A Ltd',
  'display_name update does not change legal_name'
);

select throws_ok(
  $$
    select public.set_organization_display_name(
      'b0b0b0b0-b0b0-40b0-80b0-b0b0b0b0b0b0',
      '   '
    )
  $$,
  'P0001',
  'INVALID_DISPLAY_NAME',
  'blank display_name rejected'
);

-- Scheduler cannot upload or change display name / logo path
reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"b2222222-2222-4222-8222-222222222222","role":"authenticated","aud":"authenticated"}',
  true
);
select set_config('request.jwt.claim.sub', 'b2222222-2222-4222-8222-222222222222', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select is(
  (
    select count(*)::integer
    from storage.objects
    where bucket_id = 'organization-logos'
      and name = 'b0b0b0b0-b0b0-40b0-80b0-b0b0b0b0b0b0/v1.jpg'
  ),
  1,
  'scheduler can read own organization logo'
);

select throws_ok(
  $$
    insert into storage.objects (bucket_id, name, owner, metadata)
    values (
      'organization-logos',
      'b0b0b0b0-b0b0-40b0-80b0-b0b0b0b0b0b0/sched.jpg',
      'b2222222-2222-4222-8222-222222222222',
      '{"mimetype":"image/jpeg","size":512}'::jsonb
    )
  $$,
  '42501',
  null,
  'scheduler cannot upload organization logo'
);

select throws_ok(
  $$
    select public.set_organization_logo_path(
      'b0b0b0b0-b0b0-40b0-80b0-b0b0b0b0b0b0',
      'b0b0b0b0-b0b0-40b0-80b0-b0b0b0b0b0b0/v2.jpg'
    )
  $$,
  'P0001',
  'NOT_AUTHORIZED',
  'scheduler cannot set logo_path'
);

select throws_ok(
  $$
    select public.set_organization_display_name(
      'b0b0b0b0-b0b0-40b0-80b0-b0b0b0b0b0b0',
      'Hacked Name'
    )
  $$,
  'P0001',
  'NOT_AUTHORIZED',
  'scheduler cannot change display_name'
);

-- Billing cannot upload
reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"b3333333-3333-4333-8333-333333333333","role":"authenticated","aud":"authenticated"}',
  true
);
select set_config('request.jwt.claim.sub', 'b3333333-3333-4333-8333-333333333333', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select throws_ok(
  $$
    select public.set_organization_display_name(
      'b0b0b0b0-b0b0-40b0-80b0-b0b0b0b0b0b0',
      'Billing Rename'
    )
  $$,
  'P0001',
  'NOT_AUTHORIZED',
  'billing cannot change display_name'
);

-- Anon denied
reset role;
select set_config('request.jwt.claims', '', true);
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claim.role', '', true);
set local role anon;

select is(
  (
    select count(*)::integer
    from storage.objects
    where bucket_id = 'organization-logos'
  ),
  0,
  'anon cannot read organization-logos objects'
);

select * from finish();
rollback;
