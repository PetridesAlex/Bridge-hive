-- Super Admin role support for HealthBridge
-- Run in Supabase SQL Editor after 001_profiles.sql

alter table public.profiles
  add column if not exists app_role text not null default 'MEMBER'
    check (app_role in ('MEMBER', 'SUPER_ADMIN', 'ORG_ADMIN'));

create index if not exists profiles_app_role_idx on public.profiles (app_role);

-- Bootstrap Super Admin (dashboard / platform owner)
update public.profiles
set
  app_role = 'SUPER_ADMIN',
  verification_status = 'VERIFIED',
  professional_role_name = 'Super Admin',
  professional_role_code = 'SUPER_ADMIN',
  professional_role_id = 'role_super_admin',
  updated_at = now()
where lower(email) = lower('petridesalexeu@gmail.com');

-- If the auth user exists but profile row is missing, create it
insert into public.profiles (
  id,
  first_name,
  last_name,
  email,
  app_role,
  verification_status,
  professional_role_id,
  professional_role_code,
  professional_role_name,
  avatar_initials
)
select
  u.id,
  coalesce(u.raw_user_meta_data->>'first_name', 'Alex'),
  coalesce(u.raw_user_meta_data->>'last_name', 'Petrides'),
  u.email,
  'SUPER_ADMIN',
  'VERIFIED',
  'role_super_admin',
  'SUPER_ADMIN',
  'Super Admin',
  'AP'
from auth.users u
where lower(u.email) = lower('petridesalexeu@gmail.com')
on conflict (id) do update
set
  app_role = excluded.app_role,
  verification_status = excluded.verification_status,
  professional_role_id = excluded.professional_role_id,
  professional_role_code = excluded.professional_role_code,
  professional_role_name = excluded.professional_role_name,
  updated_at = now();

-- Super admins can read all profiles (platform oversight)
-- Use a security-definer helper to avoid recursive RLS on profiles.
create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and app_role = 'SUPER_ADMIN'
  );
$$;

revoke all on function public.is_super_admin() from public;
grant execute on function public.is_super_admin() to authenticated;

drop policy if exists "Super admins can view all profiles" on public.profiles;
create policy "Super admins can view all profiles"
  on public.profiles for select
  using (public.is_super_admin());

-- Keep signup trigger aware of app_role default MEMBER
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_first text := coalesce(new.raw_user_meta_data->>'first_name', '');
  v_last text := coalesce(new.raw_user_meta_data->>'last_name', '');
  v_initials text;
  v_role_code text := coalesce(new.raw_user_meta_data->>'professional_role_code', 'REGISTERED_NURSE');
  v_role_name text := coalesce(new.raw_user_meta_data->>'professional_role_name', 'Registered Nurse');
  v_role_id text := case
    when v_role_code = 'WARD_ASSISTANT' then 'role_wa'
    when v_role_code = 'SUPER_ADMIN' then 'role_super_admin'
    else 'role_rn'
  end;
  v_app_role text := coalesce(new.raw_user_meta_data->>'app_role', 'MEMBER');
  v_email text := lower(coalesce(new.email, ''));
begin
  if v_email = lower('petridesalexeu@gmail.com') then
    v_app_role := 'SUPER_ADMIN';
    v_role_code := 'SUPER_ADMIN';
    v_role_name := 'Super Admin';
    v_role_id := 'role_super_admin';
  end if;

  if v_app_role not in ('MEMBER', 'SUPER_ADMIN', 'ORG_ADMIN') then
    v_app_role := 'MEMBER';
  end if;

  v_initials := upper(
    left(coalesce(nullif(v_first, ''), 'U'), 1) ||
    left(coalesce(nullif(v_last, ''), 'U'), 1)
  );

  insert into public.profiles (
    id,
    first_name,
    last_name,
    email,
    phone,
    professional_role_id,
    professional_role_code,
    professional_role_name,
    avatar_initials,
    app_role,
    verification_status
  )
  values (
    new.id,
    v_first,
    v_last,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    v_role_id,
    v_role_code,
    v_role_name,
    v_initials,
    v_app_role,
    case when v_app_role = 'SUPER_ADMIN' then 'VERIFIED' else 'PENDING' end
  )
  on conflict (id) do nothing;

  return new;
end;
$$;
