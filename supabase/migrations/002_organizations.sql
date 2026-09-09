-- 002_organizations.sql
-- Organizations, membership, locations, and wards with tenant-scoped RLS.

-- ---------------------------------------------------------------------------
-- Organizations
-- ---------------------------------------------------------------------------

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null,
  display_name text not null,
  slug text not null,
  billing_email text,
  status public.org_status not null default 'pending',
  timezone text not null default 'Europe/Nicosia',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organizations_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint organizations_slug_unique unique (slug)
);

create trigger organizations_set_updated_at
before update on public.organizations
for each row
execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Organization members
-- ---------------------------------------------------------------------------

create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.org_role not null,
  status public.membership_status not null default 'invited',
  invited_at timestamptz not null default now(),
  accepted_at timestamptz,
  invited_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organization_members_user_org_unique unique (organization_id, user_id)
);

create trigger organization_members_set_updated_at
before update on public.organization_members
for each row
execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Locations
-- ---------------------------------------------------------------------------

create table public.locations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  address_line1 text,
  address_line2 text,
  city text,
  postal_code text,
  country_code text not null default 'CY',
  timezone text not null default 'Europe/Nicosia',
  contact_name text,
  contact_phone text,
  contact_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger locations_set_updated_at
before update on public.locations
for each row
execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Wards
-- ---------------------------------------------------------------------------

create table public.wards (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.locations (id) on delete cascade,
  name text not null,
  instructions text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger wards_set_updated_at
before update on public.wards
for each row
execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Membership helpers (SECURITY DEFINER to avoid RLS recursion)
-- ---------------------------------------------------------------------------

create or replace function public.is_org_member(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members m
    where m.organization_id = p_organization_id
      and m.user_id = auth.uid()
      and m.status = 'active'
  );
$$;

create or replace function public.has_org_role(
  p_organization_id uuid,
  p_roles public.org_role[]
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members m
    where m.organization_id = p_organization_id
      and m.user_id = auth.uid()
      and m.status = 'active'
      and m.role = any (p_roles)
  );
$$;

revoke all on function public.is_org_member(uuid) from public;
grant execute on function public.is_org_member(uuid) to authenticated;

revoke all on function public.has_org_role(uuid, public.org_role[]) from public;
grant execute on function public.has_org_role(uuid, public.org_role[]) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS: organizations
-- ---------------------------------------------------------------------------

alter table public.organizations enable row level security;

create policy "organizations_select_member"
on public.organizations
for select
to authenticated
using (public.is_org_member(id));

-- Org creation is controlled (invite/onboarding flow). Direct client insert blocked.

revoke all on table public.organizations from anon;
grant select on table public.organizations to authenticated;

-- ---------------------------------------------------------------------------
-- RLS: organization_members
-- ---------------------------------------------------------------------------

alter table public.organization_members enable row level security;

create policy "organization_members_select_own_org"
on public.organization_members
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_org_member(organization_id)
);

-- Membership grants are server-managed (invites). No client insert/update/delete.

revoke all on table public.organization_members from anon;
grant select on table public.organization_members to authenticated;

-- ---------------------------------------------------------------------------
-- RLS: locations
-- ---------------------------------------------------------------------------

alter table public.locations enable row level security;

create policy "locations_select_member"
on public.locations
for select
to authenticated
using (public.is_org_member(organization_id));

create policy "locations_insert_admin_scheduler"
on public.locations
for insert
to authenticated
with check (
  public.has_org_role(
    organization_id,
    array['org_admin'::public.org_role, 'org_scheduler'::public.org_role]
  )
);

create policy "locations_update_admin_scheduler"
on public.locations
for update
to authenticated
using (
  public.has_org_role(
    organization_id,
    array['org_admin'::public.org_role, 'org_scheduler'::public.org_role]
  )
)
with check (
  public.has_org_role(
    organization_id,
    array['org_admin'::public.org_role, 'org_scheduler'::public.org_role]
  )
);

create policy "locations_delete_admin"
on public.locations
for delete
to authenticated
using (public.has_org_role(organization_id, array['org_admin'::public.org_role]));

revoke all on table public.locations from anon;
grant select, insert, update, delete on table public.locations to authenticated;

-- ---------------------------------------------------------------------------
-- RLS: wards
-- ---------------------------------------------------------------------------

alter table public.wards enable row level security;

create policy "wards_select_member"
on public.wards
for select
to authenticated
using (
  exists (
    select 1
    from public.locations l
    where l.id = wards.location_id
      and public.is_org_member(l.organization_id)
  )
);

create policy "wards_insert_admin_scheduler"
on public.wards
for insert
to authenticated
with check (
  exists (
    select 1
    from public.locations l
    where l.id = wards.location_id
      and public.has_org_role(
        l.organization_id,
        array['org_admin'::public.org_role, 'org_scheduler'::public.org_role]
      )
  )
);

create policy "wards_update_admin_scheduler"
on public.wards
for update
to authenticated
using (
  exists (
    select 1
    from public.locations l
    where l.id = wards.location_id
      and public.has_org_role(
        l.organization_id,
        array['org_admin'::public.org_role, 'org_scheduler'::public.org_role]
      )
  )
)
with check (
  exists (
    select 1
    from public.locations l
    where l.id = wards.location_id
      and public.has_org_role(
        l.organization_id,
        array['org_admin'::public.org_role, 'org_scheduler'::public.org_role]
      )
  )
);

create policy "wards_delete_admin"
on public.wards
for delete
to authenticated
using (
  exists (
    select 1
    from public.locations l
    where l.id = wards.location_id
      and public.has_org_role(l.organization_id, array['org_admin'::public.org_role])
  )
);

revoke all on table public.wards from anon;
grant select, insert, update, delete on table public.wards to authenticated;
