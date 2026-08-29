-- HealthBridge auth profiles
-- Run in Supabase Dashboard → SQL Editor, then turn OFF
-- Authentication → Providers → Email → "Confirm email" for smoother mobile signup during Phase 2.

create extension if not exists "pgcrypto";

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

create index if not exists profiles_email_idx on public.profiles (email);
create index if not exists profiles_market_id_idx on public.profiles (market_id);

alter table public.profiles enable row level security;

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
    else 'role_rn'
  end;
begin
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
    avatar_initials
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
    v_initials
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
