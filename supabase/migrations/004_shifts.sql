-- 004_shifts.sql
-- Shifts and optional requirements. Status transitions are RPC-controlled later.

create table public.shifts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  location_id uuid not null references public.locations (id) on delete restrict,
  ward_id uuid references public.wards (id) on delete set null,
  required_role public.worker_role not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  break_minutes integer not null default 0,
  rate_minor integer not null,
  currency text not null default 'EUR',
  status public.shift_status not null default 'draft',
  acceptance_deadline timestamptz,
  title text,
  notes text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shifts_ends_after_starts check (ends_at > starts_at),
  constraint shifts_break_nonneg check (break_minutes >= 0),
  constraint shifts_rate_positive check (rate_minor > 0),
  constraint shifts_currency_len check (char_length(currency) = 3)
);

create trigger shifts_set_updated_at
before update on public.shifts
for each row
execute function public.set_updated_at();

-- Ensure location belongs to the same organization.
create or replace function public.shifts_guard_location_org()
returns trigger
language plpgsql
as $$
declare
  v_org uuid;
begin
  select organization_id into v_org
  from public.locations
  where id = new.location_id;

  if v_org is null or v_org <> new.organization_id then
    raise exception 'SHIFT_LOCATION_ORG_MISMATCH';
  end if;

  if new.ward_id is not null then
    if not exists (
      select 1
      from public.wards w
      join public.locations l on l.id = w.location_id
      where w.id = new.ward_id
        and l.id = new.location_id
        and l.organization_id = new.organization_id
    ) then
      raise exception 'SHIFT_WARD_LOCATION_MISMATCH';
    end if;
  end if;

  return new;
end;
$$;

create trigger shifts_guard_location_org
before insert or update on public.shifts
for each row
execute function public.shifts_guard_location_org();

-- Clients may create/edit drafts; publishing and filled transitions go through RPCs.
create or replace function public.shifts_guard_status_transition()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is null or auth.role() <> 'authenticated' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.status not in ('draft', 'published') then
      raise exception 'SHIFT_STATUS_LOCKED';
    end if;
    return new;
  end if;

  -- Authenticated clients may only move draft <-> draft fields, or draft -> published
  -- via publish_shift RPC (security definer). Direct filled/completed etc. blocked.
  if old.status is distinct from new.status then
    if not (
      (old.status = 'draft' and new.status = 'draft')
      or (old.status = 'draft' and new.status = 'published')
      or (old.status = 'published' and new.status = 'cancelled')
      or (old.status = 'draft' and new.status = 'cancelled')
    ) then
      raise exception 'SHIFT_STATUS_LOCKED';
    end if;
  end if;

  return new;
end;
$$;

create trigger shifts_guard_status_transition
before insert or update on public.shifts
for each row
execute function public.shifts_guard_status_transition();

create table public.shift_requirements (
  id uuid primary key default gen_random_uuid(),
  shift_id uuid not null references public.shifts (id) on delete cascade,
  requirement_type text not null,
  required boolean not null default true,
  created_at timestamptz not null default now(),
  constraint shift_requirements_type_nonempty check (char_length(trim(requirement_type)) > 0),
  constraint shift_requirements_unique unique (shift_id, requirement_type)
);

-- ---------------------------------------------------------------------------
-- RLS: shifts
-- ---------------------------------------------------------------------------

alter table public.shifts enable row level security;

create policy "shifts_select_org_member"
on public.shifts
for select
to authenticated
using (public.is_org_member(organization_id));

create policy "shifts_select_eligible_worker"
on public.shifts
for select
to authenticated
using (
  status = 'published'
  and (acceptance_deadline is null or acceptance_deadline > now())
  and exists (
    select 1
    from public.worker_profiles wp
    where wp.user_id = auth.uid()
      and wp.worker_role = shifts.required_role
      and wp.verification_status = 'verified'
  )
);

create policy "shifts_insert_admin_scheduler"
on public.shifts
for insert
to authenticated
with check (
  public.has_org_role(
    organization_id,
    array['org_admin'::public.org_role, 'org_scheduler'::public.org_role]
  )
  and status in ('draft', 'published')
);

create policy "shifts_update_admin_scheduler"
on public.shifts
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

create policy "shifts_delete_draft_admin"
on public.shifts
for delete
to authenticated
using (
  status = 'draft'
  and public.has_org_role(organization_id, array['org_admin'::public.org_role])
);

revoke all on table public.shifts from anon;
grant select, insert, update, delete on table public.shifts to authenticated;

-- ---------------------------------------------------------------------------
-- RLS: shift_requirements
-- ---------------------------------------------------------------------------

alter table public.shift_requirements enable row level security;

create policy "shift_requirements_select_visible_shift"
on public.shift_requirements
for select
to authenticated
using (
  exists (
    select 1
    from public.shifts s
    where s.id = shift_requirements.shift_id
      and (
        public.is_org_member(s.organization_id)
        or (
          s.status = 'published'
          and (s.acceptance_deadline is null or s.acceptance_deadline > now())
          and exists (
            select 1
            from public.worker_profiles wp
            where wp.user_id = auth.uid()
              and wp.worker_role = s.required_role
              and wp.verification_status = 'verified'
          )
        )
      )
  )
);

create policy "shift_requirements_mutate_org"
on public.shift_requirements
for all
to authenticated
using (
  exists (
    select 1
    from public.shifts s
    where s.id = shift_requirements.shift_id
      and public.has_org_role(
        s.organization_id,
        array['org_admin'::public.org_role, 'org_scheduler'::public.org_role]
      )
  )
)
with check (
  exists (
    select 1
    from public.shifts s
    where s.id = shift_requirements.shift_id
      and public.has_org_role(
        s.organization_id,
        array['org_admin'::public.org_role, 'org_scheduler'::public.org_role]
      )
  )
);

revoke all on table public.shift_requirements from anon;
grant select, insert, update, delete on table public.shift_requirements to authenticated;
