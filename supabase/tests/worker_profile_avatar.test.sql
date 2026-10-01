-- worker_profile_avatar.test.sql
-- Private worker-avatars bucket + set_my_avatar_path path ownership.

begin;
select plan(17);

-- ---------------------------------------------------------------------------
-- Seed two workers (privileged role — before SET ROLE)
-- ---------------------------------------------------------------------------
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  (
    '00000000-0000-0000-0000-000000000000',
    'a1111111-1111-4111-8111-111111111111',
    'authenticated', 'authenticated', 'avatar-a@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Avatar Worker A"}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'a2222222-2222-4222-8222-222222222222',
    'authenticated', 'authenticated', 'avatar-b@test.local', 'x',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Avatar Worker B"}'::jsonb, now(), now()
  )
on conflict (id) do nothing;

insert into public.profiles (id, full_name)
values
  ('a1111111-1111-4111-8111-111111111111', 'Avatar Worker A'),
  ('a2222222-2222-4222-8222-222222222222', 'Avatar Worker B')
on conflict (id) do update set full_name = excluded.full_name;

insert into public.worker_profiles (user_id, worker_role, onboarding_status)
values
  ('a1111111-1111-4111-8111-111111111111', 'registered_nurse', 'completed'),
  ('a2222222-2222-4222-8222-222222222222', 'ward_assistant', 'completed')
on conflict (user_id) do nothing;

-- Privileged role can set verification (client guard skips non-authenticated)
update public.worker_profiles
set verification_status = 'verified'
where user_id in (
  'a1111111-1111-4111-8111-111111111111',
  'a2222222-2222-4222-8222-222222222222'
);

-- Org member (must not access worker-avatars)
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values (
  '00000000-0000-0000-0000-000000000000',
  'a3333333-3333-4333-8333-333333333333',
  'authenticated', 'authenticated', 'avatar-org@test.local', 'x',
  now(), '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Avatar Org Admin"}'::jsonb, now(), now()
)
on conflict (id) do nothing;

insert into public.profiles (id, full_name)
values ('a3333333-3333-4333-8333-333333333333', 'Avatar Org Admin')
on conflict (id) do nothing;

insert into public.organizations (id, legal_name, display_name, slug, status)
values (
  'a0a0a0a0-a0a0-40a0-80a0-a0a0a0a0a0a0',
  'Avatar Org Ltd', 'Avatar Org', 'avatar-org-test', 'active'
)
on conflict (id) do nothing;

insert into public.organization_members (organization_id, user_id, role, status, accepted_at)
values (
  'a0a0a0a0-a0a0-40a0-80a0-a0a0a0a0a0a0',
  'a3333333-3333-4333-8333-333333333333',
  'org_admin', 'active', now()
)
on conflict (organization_id, user_id) do nothing;

-- Seed storage objects as service role
insert into storage.objects (bucket_id, name, owner, metadata)
values
  (
    'worker-avatars',
    'a1111111-1111-4111-8111-111111111111/v1.jpg',
    'a1111111-1111-4111-8111-111111111111',
    '{"mimetype":"image/jpeg","size":1024}'::jsonb
  ),
  (
    'worker-avatars',
    'a2222222-2222-4222-8222-222222222222/v1.jpg',
    'a2222222-2222-4222-8222-222222222222',
    '{"mimetype":"image/jpeg","size":1024}'::jsonb
  )
on conflict do nothing;

-- 1) Bucket is private
select is(
  (select public from storage.buckets where id = 'worker-avatars'),
  false,
  'worker-avatars bucket is private'
);

-- 2) Column exists
select ok(
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'avatar_path'
  ),
  'profiles.avatar_path column exists'
);

-- 3) RPC has locked search_path and is not granted to anon
select ok(
  exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'set_my_avatar_path'
      and p.prosecdef
      and coalesce(p.proconfig::text, '') like '%search_path%'
  ),
  'set_my_avatar_path is security definer with search_path'
);

select is(
  (
    select count(*)::integer
    from information_schema.routine_privileges
    where routine_schema = 'public'
      and routine_name = 'set_my_avatar_path'
      and grantee = 'anon'
      and privilege_type = 'EXECUTE'
  ),
  0,
  'anon cannot execute set_my_avatar_path'
);

-- Authenticate as Worker A
select set_config(
  'request.jwt.claims',
  '{"sub":"a1111111-1111-4111-8111-111111111111","role":"authenticated","aud":"authenticated"}',
  true
);
select set_config('request.jwt.claim.sub', 'a1111111-1111-4111-8111-111111111111', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

-- 4) Worker A can select own object
select is(
  (
    select count(*)::integer
    from storage.objects
    where bucket_id = 'worker-avatars'
      and name = 'a1111111-1111-4111-8111-111111111111/v1.jpg'
  ),
  1,
  'worker can read own avatar object'
);

-- 5) Worker A cannot read Worker B object
select is(
  (
    select count(*)::integer
    from storage.objects
    where bucket_id = 'worker-avatars'
      and name = 'a2222222-2222-4222-8222-222222222222/v1.jpg'
  ),
  0,
  'worker cannot read another worker avatar object'
);

-- 6) Worker A can insert into own folder
select lives_ok(
  $$
    insert into storage.objects (bucket_id, name, owner, metadata)
    values (
      'worker-avatars',
      'a1111111-1111-4111-8111-111111111111/v2.jpg',
      'a1111111-1111-4111-8111-111111111111',
      '{"mimetype":"image/jpeg","size":512}'::jsonb
    )
  $$,
  'worker can upload to own UUID folder'
);

-- 7) Worker A cannot insert into Worker B folder
select throws_ok(
  $$
    insert into storage.objects (bucket_id, name, owner, metadata)
    values (
      'worker-avatars',
      'a2222222-2222-4222-8222-222222222222/stolen.jpg',
      'a1111111-1111-4111-8111-111111111111',
      '{"mimetype":"image/jpeg","size":512}'::jsonb
    )
  $$,
  '42501',
  null,
  'worker cannot upload to another UUID folder'
);

-- 8) Valid set_my_avatar_path
select is(
  public.set_my_avatar_path('a1111111-1111-4111-8111-111111111111/v2.jpg'),
  'a1111111-1111-4111-8111-111111111111/v2.jpg',
  'worker can set own avatar_path via RPC'
);

select is(
  (select avatar_path from public.profiles where id = 'a1111111-1111-4111-8111-111111111111'),
  'a1111111-1111-4111-8111-111111111111/v2.jpg',
  'avatar_path persisted for authenticated worker'
);

-- 9) Cannot point at another worker path
select throws_ok(
  $$ select public.set_my_avatar_path('a2222222-2222-4222-8222-222222222222/v1.jpg') $$,
  'P0001',
  'Invalid avatar path',
  'worker cannot set avatar_path to another worker object'
);

-- 10) Clear path
select is(
  public.set_my_avatar_path(null),
  null,
  'worker can clear avatar_path'
);

select is(
  (select avatar_path from public.profiles where id = 'a1111111-1111-4111-8111-111111111111'),
  null,
  'avatar_path cleared'
);

-- 11) Direct update cannot change account_status while setting avatar
select throws_ok(
  $$
    update public.profiles
    set avatar_path = 'a1111111-1111-4111-8111-111111111111/x.jpg',
        account_status = 'suspended'
    where id = 'a1111111-1111-4111-8111-111111111111'
  $$,
  '42501',
  null,
  'worker cannot change account_status via profile update'
);

-- 12) Own-folder delete policy exists (Storage API enforces; SQL delete is blocked by protect_delete)
select ok(
  exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'worker_avatars_storage_delete_own'
      and cmd = 'DELETE'
  ),
  'worker-avatars own-folder delete policy exists'
);

-- 13) Org admin cannot read worker avatar objects
reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"a3333333-3333-4333-8333-333333333333","role":"authenticated","aud":"authenticated"}',
  true
);
select set_config('request.jwt.claim.sub', 'a3333333-3333-4333-8333-333333333333', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select is(
  (
    select count(*)::integer
    from storage.objects
    where bucket_id = 'worker-avatars'
  ),
  0,
  'organization member cannot list or read worker-avatars'
);

-- 14) Anon cannot read worker-avatars objects
reset role;
select set_config('request.jwt.claims', '', true);
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claim.role', '', true);
set local role anon;

select is(
  (
    select count(*)::integer
    from storage.objects
    where bucket_id = 'worker-avatars'
  ),
  0,
  'anon cannot read worker-avatars objects'
);

select * from finish();
rollback;
