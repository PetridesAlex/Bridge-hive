-- HealthBridge FULL SETUP (run this ONE script in Supabase SQL Editor)
-- Creates profiles + Super Admin for petridesalexeu@gmail.com
--
-- AFTER this script, also run:
--   supabase/migrations/003_account_architecture.sql
-- for account_type, professional_profiles, organizations, and organization_members.

create extension if not exists "pgcrypto";

-- 1) Profiles table (includes app_role from the start)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  market_id text not null default 'cy',
  first_name text not null default '',
  last_name text not null default '',
  email text not null,
  phone text not null default '',
  professional_role_id text not null default 'role_rn',
  professional_role_code text not null default 'REGISTERED_NURSE',
  professional_role_name text not null default 'Registered Nurse',
  location text not null default 'Limassol, Cyprus',
  city text not null default 'Limassol',
  country_code text not null default 'CY',
  verification_status text not null default 'PENDING'
    check (verification_status in ('VERIFIED', 'PENDING', 'REJECTED', 'UNVERIFIED')),
  app_role text not null default 'MEMBER'
    check (app_role in ('MEMBER', 'SUPER_ADMIN', 'ORG_ADMIN')),
  reliability_percent integer not null default 100,
  completed_shifts integer not null default 0,
  hours_worked integer not null default 0,
  organizations_worked_with integer not null default 0,
  available_earnings numeric(12, 2) not null default 0,
  pending_earnings numeric(12, 2) not null default 0,
  paid_this_month numeric(12, 2) not null default 0,
  avatar_initials text not null default '',
  years_experience integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- If table already existed without app_role, add it safely
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'app_role'
  ) then
    alter table public.profiles
      add column app_role text not null default 'MEMBER'
      check (app_role in ('MEMBER', 'SUPER_ADMIN', 'ORG_ADMIN'));
  end if;
end $$;

create index if not exists profiles_email_idx on public.profiles (email);
create index if not exists profiles_market_id_idx on public.profiles (market_id);
create index if not exists profiles_app_role_idx on public.profiles (app_role);

alter table public.profiles enable row level security;

-- 2) RLS policies
drop policy if exists "Profiles are viewable by owner" on public.profiles;
create policy "Profiles are viewable by owner"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Profiles are insertable by owner" on public.profiles;
create policy "Profiles are insertable by owner"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "Profiles are updatable by owner" on public.profiles;
create policy "Profiles are updatable by owner"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

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

-- 3) updated_at trigger
create or replace function public.set_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_profiles_updated_at();

-- 4) Auto-create profile on signup (+ Super Admin bootstrap by email)
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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

grant usage on schema public to anon, authenticated;
grant select, insert, update on public.profiles to authenticated;

-- 5) Promote existing Super Admin user (if already signed up)
update public.profiles
set
  app_role = 'SUPER_ADMIN',
  verification_status = 'VERIFIED',
  professional_role_name = 'Super Admin',
  professional_role_code = 'SUPER_ADMIN',
  professional_role_id = 'role_super_admin',
  updated_at = now()
where lower(email) = lower('petridesalexeu@gmail.com');

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
