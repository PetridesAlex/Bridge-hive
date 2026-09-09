-- Shared helpers for Bridge Hive pgTAP tests.
-- NOT executed by `npx supabase test db` (lives outside supabase/tests/).
-- Copy/paste or \i this file from a test transaction if needed.
-- Prefer inlining the small helpers inside each *.test.sql BEGIN block.

-- Create a real auth.users row (local Supabase already owns auth schema/table).
-- Call only while connected as a privileged role (default test runner),
-- BEFORE `SET LOCAL ROLE authenticated`.

create or replace function public.test_create_auth_user(
  p_id uuid,
  p_email text,
  p_full_name text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
begin
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
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change
  )
  values (
    '00000000-0000-0000-0000-000000000000',
    p_id,
    'authenticated',
    'authenticated',
    p_email,
    crypt('test-password', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', coalesce(p_full_name, p_email)),
    now(),
    now(),
    '',
    '',
    '',
    ''
  )
  on conflict (id) do update
  set
    email = excluded.email,
    raw_user_meta_data = excluded.raw_user_meta_data,
    updated_at = now();

  insert into public.profiles (id, full_name)
  values (p_id, coalesce(p_full_name, p_email))
  on conflict (id) do update
  set full_name = excluded.full_name;

  return p_id;
end;
$$;

create or replace function public.test_authenticate_as(p_user_id uuid)
returns void
language plpgsql
as $$
begin
  perform set_config(
    'request.jwt.claims',
    json_build_object(
      'sub', p_user_id::text,
      'role', 'authenticated',
      'aud', 'authenticated'
    )::text,
    true
  );
  perform set_config('request.jwt.claim.sub', p_user_id::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  execute 'set local role authenticated';
end;
$$;

create or replace function public.test_clear_authentication()
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims', '', true);
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claim.role', '', true);
  execute 'reset role';
end;
$$;
