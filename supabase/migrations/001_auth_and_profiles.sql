-- 001_auth_and_profiles.sql
-- Profiles for every Auth user + shared enum types used across the foundation.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.account_status as enum ('active', 'suspended', 'deleted');

create type public.worker_role as enum ('registered_nurse', 'ward_assistant');

create type public.verification_status as enum (
  'draft',
  'submitted',
  'under_review',
  'verified',
  'rejected',
  'suspended',
  'expired'
);

create type public.onboarding_status as enum (
  'not_started',
  'in_progress',
  'completed'
);

create type public.org_status as enum (
  'pending',
  'active',
  'suspended',
  'closed'
);

create type public.org_role as enum (
  'org_admin',
  'org_scheduler',
  'org_billing'
);

create type public.shift_status as enum (
  'draft',
  'published',
  'filled',
  'in_progress',
  'awaiting_approval',
  'completed',
  'cancelled',
  'disputed'
);

create type public.assignment_status as enum (
  'accepted',
  'withdrawn',
  'cancelled',
  'checked_in',
  'checked_out',
  'submitted',
  'approved',
  'rejected',
  'no_show'
);

create type public.timesheet_status as enum (
  'draft',
  'submitted',
  'approved',
  'rejected',
  'corrected'
);

create type public.credential_status as enum (
  'pending',
  'under_review',
  'verified',
  'rejected',
  'expired',
  'suspended'
);

create type public.membership_status as enum (
  'invited',
  'active',
  'revoked'
);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  phone text,
  account_status public.account_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

-- Auto-create a profile when a user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'phone'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;

create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (id = auth.uid());

create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (
  id = auth.uid()
  and account_status = (select p.account_status from public.profiles p where p.id = auth.uid())
);

-- Inserts are created by the auth trigger (security definer), not by clients.
revoke all on table public.profiles from anon;
grant select, update on table public.profiles to authenticated;
