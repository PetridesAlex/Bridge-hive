-- HealthBridge 003: Account architecture (additive)
-- Run in Supabase SQL Editor AFTER using Professional/Organization registration.
-- Safe to re-run (IF NOT EXISTS / DROP POLICY IF EXISTS).

-- ---------------------------------------------------------------------------
-- 1) profiles.account_type
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'account_type'
  ) then
    alter table public.profiles
      add column account_type text not null default 'PROFESSIONAL'
      check (account_type in ('PROFESSIONAL', 'ORGANIZATION_USER', 'SUPER_ADMIN'));
  end if;
end $$;

update public.profiles
set account_type = 'SUPER_ADMIN'
where coalesce(app_role, '') = 'SUPER_ADMIN'
   or lower(email) = lower('petridesalexeu@gmail.com');

update public.profiles
set account_type = 'PROFESSIONAL'
where account_type is null
   or account_type not in ('PROFESSIONAL', 'ORGANIZATION_USER', 'SUPER_ADMIN');

create index if not exists profiles_account_type_idx on public.profiles (account_type);

-- Prevent clients from escalating account_type / app_role
create or replace function public.protect_profile_privileges()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' then
    if new.account_type is distinct from old.account_type then
      raise exception 'account_type cannot be changed by clients';
    end if;
    if new.app_role is distinct from old.app_role then
      raise exception 'app_role cannot be changed by clients';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_privileges on public.profiles;
create trigger profiles_protect_privileges
  before update on public.profiles
  for each row execute function public.protect_profile_privileges();

-- Super admin helper also honors account_type
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
      and (
        app_role = 'SUPER_ADMIN'
        or account_type = 'SUPER_ADMIN'
      )
  );
$$;

-- ---------------------------------------------------------------------------
-- 2) professional_profiles
-- ---------------------------------------------------------------------------
create table if not exists public.professional_profiles (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles (id) on delete cascade,
  market_id text not null default 'cy',
  professional_role_id text not null default 'role_rn',
  professional_role_code text not null default 'REGISTERED_NURSE',
  professional_role_name text not null default 'Registered Nurse',
  verification_status text not null default 'DRAFT'
    check (verification_status in (
      'DRAFT', 'PENDING_VERIFICATION', 'VERIFIED', 'REJECTED', 'SUSPENDED', 'INACTIVE'
    )),
  registration_number text,
  years_experience integer not null default 0,
  speciality text,
  available_for_shifts boolean not null default true,
  preferred_locations text[] not null default '{}',
  preferred_departments text[] not null default '{}',
  preferred_shift_types text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists professional_profiles_status_idx
  on public.professional_profiles (verification_status);

alter table public.professional_profiles enable row level security;

drop policy if exists "Professionals read own profile" on public.professional_profiles;
create policy "Professionals read own profile"
  on public.professional_profiles for select
  using (profile_id = auth.uid() or public.is_super_admin());

drop policy if exists "Professionals insert own profile" on public.professional_profiles;
create policy "Professionals insert own profile"
  on public.professional_profiles for insert
  with check (profile_id = auth.uid());

drop policy if exists "Professionals update own profile" on public.professional_profiles;
create policy "Professionals update own profile"
  on public.professional_profiles for update
  using (profile_id = auth.uid() or public.is_super_admin())
  with check (profile_id = auth.uid() or public.is_super_admin());

-- Backfill professional rows for existing PROFESSIONAL profiles
insert into public.professional_profiles (
  profile_id,
  market_id,
  professional_role_id,
  professional_role_code,
  professional_role_name,
  verification_status,
  years_experience
)
select
  p.id,
  coalesce(p.market_id, 'cy'),
  coalesce(p.professional_role_id, 'role_rn'),
  coalesce(p.professional_role_code, 'REGISTERED_NURSE'),
  coalesce(p.professional_role_name, 'Registered Nurse'),
  case
    when p.verification_status = 'VERIFIED' then 'VERIFIED'
    when p.verification_status = 'REJECTED' then 'REJECTED'
    else 'PENDING_VERIFICATION'
  end,
  coalesce(p.years_experience, 0)
from public.profiles p
where p.account_type = 'PROFESSIONAL'
on conflict (profile_id) do nothing;

grant select, insert, update on public.professional_profiles to authenticated;

-- ---------------------------------------------------------------------------
-- 3) organizations
-- ---------------------------------------------------------------------------
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  market_id text not null default 'cy',
  name text not null,
  organization_type text not null default 'HOSPITAL'
    check (organization_type in (
      'HOSPITAL', 'PRIVATE_HOSPITAL', 'CLINIC', 'MEDICAL_CENTRE',
      'REHABILITATION', 'REHABILITATION_CENTRE', 'CARE_HOME',
      'OTHER', 'OTHER_APPROVED_PROVIDER'
    )),
  verification_status text not null default 'PENDING_VERIFICATION'
    check (verification_status in (
      'PENDING_VERIFICATION', 'VERIFIED', 'REJECTED', 'SUSPENDED', 'INACTIVE'
    )),
  registration_number text,
  email text not null,
  phone text not null default '',
  website text,
  address text not null default '',
  city text not null default '',
  country_code text not null default 'CY',
  location text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists organizations_status_idx on public.organizations (verification_status);
create index if not exists organizations_market_idx on public.organizations (market_id);

alter table public.organizations enable row level security;

-- ---------------------------------------------------------------------------
-- 4) organization_members
-- ---------------------------------------------------------------------------
create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'VIEWER'
    check (role in (
      'ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN', 'HR_MANAGER', 'SCHEDULER',
      'DEPARTMENT_MANAGER', 'FINANCE', 'VIEWER'
    )),
  department_id text,
  status text not null default 'ACTIVE'
    check (status in ('ACTIVE', 'INVITED', 'SUSPENDED', 'REMOVED')),
  created_at timestamptz not null default now(),
  unique (organization_id, profile_id)
);

create index if not exists organization_members_profile_idx
  on public.organization_members (profile_id);

alter table public.organization_members enable row level security;

create or replace function public.is_org_member(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.organization_members
    where organization_id = org_id
      and profile_id = auth.uid()
      and status = 'ACTIVE'
  );
$$;

revoke all on function public.is_org_member(uuid) from public;
grant execute on function public.is_org_member(uuid) to authenticated;

drop policy if exists "Org members read their orgs" on public.organizations;
create policy "Org members read their orgs"
  on public.organizations for select
  using (public.is_org_member(id) or public.is_super_admin());

drop policy if exists "Authenticated insert organizations" on public.organizations;
create policy "Authenticated insert organizations"
  on public.organizations for insert
  with check (auth.uid() is not null);

drop policy if exists "Org owners update their orgs" on public.organizations;
create policy "Org owners update their orgs"
  on public.organizations for update
  using (
    public.is_super_admin()
    or exists (
      select 1 from public.organization_members m
      where m.organization_id = organizations.id
        and m.profile_id = auth.uid()
        and m.role in ('ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN')
        and m.status = 'ACTIVE'
    )
  );

drop policy if exists "Members read own memberships" on public.organization_members;
create policy "Members read own memberships"
  on public.organization_members for select
  using (profile_id = auth.uid() or public.is_org_member(organization_id) or public.is_super_admin());

drop policy if exists "Authenticated insert memberships" on public.organization_members;
create policy "Authenticated insert memberships"
  on public.organization_members for insert
  with check (profile_id = auth.uid() or public.is_super_admin());

drop policy if exists "Owners update memberships" on public.organization_members;
create policy "Owners update memberships"
  on public.organization_members for update
  using (
    public.is_super_admin()
    or profile_id = auth.uid()
    or exists (
      select 1 from public.organization_members m
      where m.organization_id = organization_members.organization_id
        and m.profile_id = auth.uid()
        and m.role in ('ORGANIZATION_OWNER', 'ORGANIZATION_ADMIN')
        and m.status = 'ACTIVE'
    )
  );

grant select, insert, update on public.organizations to authenticated;
grant select, insert, update on public.organization_members to authenticated;

-- ---------------------------------------------------------------------------
-- 5) Signup trigger: create profile + professional_profiles / org path via metadata
-- ---------------------------------------------------------------------------
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
  v_account_type text := coalesce(new.raw_user_meta_data->>'account_type', 'PROFESSIONAL');
  v_role_code text := coalesce(new.raw_user_meta_data->>'professional_role_code', 'REGISTERED_NURSE');
  v_role_name text := coalesce(new.raw_user_meta_data->>'professional_role_name', 'Registered Nurse');
  v_role_id text := case
    when v_role_code = 'WARD_ASSISTANT' then 'role_wa'
    else 'role_rn'
  end;
  v_email text := lower(coalesce(new.email, ''));
  v_city text := coalesce(new.raw_user_meta_data->>'city', 'Limassol');
  v_app_role text := 'MEMBER';
begin
  -- Never allow public signup to self-assign SUPER_ADMIN except bootstrap email
  if v_email = lower('petridesalexeu@gmail.com') then
    v_account_type := 'SUPER_ADMIN';
    v_app_role := 'SUPER_ADMIN';
    v_role_code := 'SUPER_ADMIN';
    v_role_name := 'Super Admin';
    v_role_id := 'role_super_admin';
  elsif v_account_type = 'SUPER_ADMIN' then
    v_account_type := 'PROFESSIONAL';
  end if;

  if v_account_type not in ('PROFESSIONAL', 'ORGANIZATION_USER', 'SUPER_ADMIN') then
    v_account_type := 'PROFESSIONAL';
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
    account_type,
    verification_status,
    city,
    location,
    country_code,
    market_id
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
    v_account_type,
    case when v_account_type = 'SUPER_ADMIN' then 'VERIFIED' else 'PENDING' end,
    v_city,
    v_city || ', Cyprus',
    'CY',
    'cy'
  )
  on conflict (id) do nothing;

  if v_account_type = 'PROFESSIONAL' then
    insert into public.professional_profiles (
      profile_id,
      market_id,
      professional_role_id,
      professional_role_code,
      professional_role_name,
      verification_status,
      registration_number,
      years_experience,
      speciality,
      available_for_shifts,
      preferred_locations,
      preferred_departments,
      preferred_shift_types
    )
    values (
      new.id,
      'cy',
      v_role_id,
      v_role_code,
      v_role_name,
      'DRAFT',
      nullif(new.raw_user_meta_data->>'registration_number', ''),
      coalesce((new.raw_user_meta_data->>'years_experience')::int, 0),
      nullif(new.raw_user_meta_data->>'speciality', ''),
      coalesce((new.raw_user_meta_data->>'available_for_shifts')::boolean, true),
      coalesce(
        array(select jsonb_array_elements_text(coalesce(new.raw_user_meta_data->'preferred_locations', '[]'::jsonb))),
        '{}'::text[]
      ),
      coalesce(
        array(select jsonb_array_elements_text(coalesce(new.raw_user_meta_data->'preferred_departments', '[]'::jsonb))),
        '{}'::text[]
      ),
      coalesce(
        array(select jsonb_array_elements_text(coalesce(new.raw_user_meta_data->'preferred_shift_types', '[]'::jsonb))),
        '{}'::text[]
      )
    )
    on conflict (profile_id) do nothing;
  end if;

  return new;
end;
$$;

-- Ensure Super Admin bootstrap row stays correct
update public.profiles
set
  account_type = 'SUPER_ADMIN',
  app_role = 'SUPER_ADMIN',
  verification_status = 'VERIFIED',
  professional_role_name = 'Super Admin',
  professional_role_code = 'SUPER_ADMIN',
  professional_role_id = 'role_super_admin',
  updated_at = now()
where lower(email) = lower('petridesalexeu@gmail.com');
