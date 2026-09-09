-- 005_assignments.sql
-- Shift assignments, timesheets, integrity indexes, and org visibility of assigned workers.

create table public.shift_assignments (
  id uuid primary key default gen_random_uuid(),
  shift_id uuid not null references public.shifts (id) on delete cascade,
  worker_id uuid not null references public.worker_profiles (user_id) on delete restrict,
  status public.assignment_status not null default 'accepted',
  accepted_at timestamptz not null default now(),
  check_in_at timestamptz,
  check_out_at timestamptz,
  cancellation_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger shift_assignments_set_updated_at
before update on public.shift_assignments
for each row
execute function public.set_updated_at();

-- One active worker per single-slot shift.
create unique index one_active_assignment_per_shift
on public.shift_assignments (shift_id)
where status in (
  'accepted',
  'checked_in',
  'checked_out',
  'submitted',
  'approved'
);

create table public.timesheets (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.shift_assignments (id) on delete cascade,
  submitted_minutes integer,
  approved_minutes integer,
  break_minutes integer not null default 0,
  status public.timesheet_status not null default 'draft',
  reviewed_by uuid references public.profiles (id) on delete set null,
  review_note text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint timesheets_break_nonneg check (break_minutes >= 0),
  constraint timesheets_submitted_nonneg check (
    submitted_minutes is null or submitted_minutes >= 0
  ),
  constraint timesheets_approved_nonneg check (
    approved_minutes is null or approved_minutes >= 0
  ),
  constraint timesheets_one_per_assignment unique (assignment_id)
);

create trigger timesheets_set_updated_at
before update on public.timesheets
for each row
execute function public.set_updated_at();

-- Block direct client status writes on assignments (claims go through RPC).
create or replace function public.shift_assignments_guard_client_write()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is null or auth.role() <> 'authenticated' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    raise exception 'ASSIGNMENT_INSERT_LOCKED';
  end if;

  -- Workers may update check-in/out timestamps on their own accepted assignment
  -- without changing status to approved/rejected (those are org/RPC).
  if old.status is distinct from new.status then
    if not (
      (old.status = 'accepted' and new.status in ('withdrawn', 'checked_in', 'cancelled'))
      or (old.status = 'checked_in' and new.status in ('checked_out', 'cancelled'))
      or (old.status = 'checked_out' and new.status = 'submitted')
    ) then
      raise exception 'ASSIGNMENT_STATUS_LOCKED';
    end if;
  end if;

  return new;
end;
$$;

create trigger shift_assignments_guard_client_write
before insert or update on public.shift_assignments
for each row
execute function public.shift_assignments_guard_client_write();

create or replace function public.timesheets_guard_client_write()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is null or auth.role() <> 'authenticated' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.status not in ('draft', 'submitted') then
      raise exception 'TIMESHEET_STATUS_LOCKED';
    end if;
    if new.approved_minutes is not null or new.reviewed_by is not null then
      raise exception 'TIMESHEET_REVIEW_LOCKED';
    end if;
    return new;
  end if;

  if old.status is distinct from new.status then
    -- Worker: draft -> submitted; after reject -> draft/submitted resubmit
    -- Org review goes through review_timesheet RPC (security definer).
    if not (
      (old.status = 'draft' and new.status = 'submitted')
      or (old.status = 'rejected' and new.status in ('draft', 'submitted'))
      or (old.status = 'submitted' and new.status = 'draft')
    ) then
      raise exception 'TIMESHEET_STATUS_LOCKED';
    end if;
  end if;

  if new.approved_minutes is distinct from old.approved_minutes
     or new.reviewed_by is distinct from old.reviewed_by
     or new.reviewed_at is distinct from old.reviewed_at then
    raise exception 'TIMESHEET_REVIEW_LOCKED';
  end if;

  return new;
end;
$$;

create trigger timesheets_guard_client_write
before insert or update on public.timesheets
for each row
execute function public.timesheets_guard_client_write();

-- Org members may see worker profiles for assigned workers.
create policy "worker_profiles_select_assigned_org"
on public.worker_profiles
for select
to authenticated
using (
  exists (
    select 1
    from public.shift_assignments sa
    join public.shifts s on s.id = sa.shift_id
    where sa.worker_id = worker_profiles.user_id
      and public.is_org_member(s.organization_id)
  )
);

-- Workers can always see their own assigned shifts (even after fill/cancel).
create policy "shifts_select_own_assignment"
on public.shifts
for select
to authenticated
using (
  exists (
    select 1
    from public.shift_assignments sa
    where sa.shift_id = shifts.id
      and sa.worker_id = auth.uid()
  )
);

-- ---------------------------------------------------------------------------
-- RLS: shift_assignments
-- ---------------------------------------------------------------------------

alter table public.shift_assignments enable row level security;

create policy "shift_assignments_select_own"
on public.shift_assignments
for select
to authenticated
using (worker_id = auth.uid());

create policy "shift_assignments_select_org"
on public.shift_assignments
for select
to authenticated
using (
  exists (
    select 1
    from public.shifts s
    where s.id = shift_assignments.shift_id
      and public.is_org_member(s.organization_id)
  )
);

-- Inserts only via claim_shift RPC (security definer).
create policy "shift_assignments_update_own_worker"
on public.shift_assignments
for update
to authenticated
using (worker_id = auth.uid())
with check (worker_id = auth.uid());

revoke all on table public.shift_assignments from anon;
grant select, update on table public.shift_assignments to authenticated;

-- ---------------------------------------------------------------------------
-- RLS: timesheets
-- ---------------------------------------------------------------------------

alter table public.timesheets enable row level security;

create policy "timesheets_select_own"
on public.timesheets
for select
to authenticated
using (
  exists (
    select 1
    from public.shift_assignments sa
    where sa.id = timesheets.assignment_id
      and sa.worker_id = auth.uid()
  )
);

create policy "timesheets_select_org"
on public.timesheets
for select
to authenticated
using (
  exists (
    select 1
    from public.shift_assignments sa
    join public.shifts s on s.id = sa.shift_id
    where sa.id = timesheets.assignment_id
      and public.is_org_member(s.organization_id)
  )
);

create policy "timesheets_insert_own"
on public.timesheets
for insert
to authenticated
with check (
  exists (
    select 1
    from public.shift_assignments sa
    where sa.id = timesheets.assignment_id
      and sa.worker_id = auth.uid()
  )
);

create policy "timesheets_update_own"
on public.timesheets
for update
to authenticated
using (
  exists (
    select 1
    from public.shift_assignments sa
    where sa.id = timesheets.assignment_id
      and sa.worker_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.shift_assignments sa
    where sa.id = timesheets.assignment_id
      and sa.worker_id = auth.uid()
  )
);

revoke all on table public.timesheets from anon;
grant select, insert, update on table public.timesheets to authenticated;
