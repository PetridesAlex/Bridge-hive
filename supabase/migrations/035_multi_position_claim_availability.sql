-- 035_multi_position_claim_availability.sql
-- Forward-only repair for multi-position claims on top of 031/032.
-- - Re-assert capacity column + per-worker uniqueness
-- - claim_shift raises SHIFT_FULL (not SHIFT_ALREADY_FILLED) when capacity is exhausted
-- - Shared security-definer availability for marketplace + shift details
-- Do not edit 031/032; this migration is idempotent where safe.

-- ---------------------------------------------------------------------------
-- 1. Column + check (idempotent)
-- ---------------------------------------------------------------------------

alter table public.shifts
  add column if not exists required_positions integer not null default 1;

alter table public.shifts
  drop constraint if exists shifts_required_positions_range;

alter table public.shifts
  add constraint shifts_required_positions_range
  check (required_positions between 1 and 100);

comment on column public.shifts.required_positions is
  'Number of eligible workers who may accept this single shift (capacity).';

-- ---------------------------------------------------------------------------
-- 2. Indexes: drop obsolete one-per-shift; keep one-per-worker-per-shift
-- ---------------------------------------------------------------------------

drop index if exists public.one_active_assignment_per_shift;

create unique index if not exists one_active_assignment_per_worker_shift
  on public.shift_assignments (shift_id, worker_id)
  where status in (
    'accepted',
    'checked_in',
    'checked_out',
    'submitted',
    'approved'
  );

-- ---------------------------------------------------------------------------
-- 3. Capacity helpers (security definer; ignore RLS for accurate counts)
-- ---------------------------------------------------------------------------

create or replace function public.shift_active_assignment_count(p_shift_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.shift_assignments a
  where a.shift_id = p_shift_id
    and a.status in (
      'accepted',
      'checked_in',
      'checked_out',
      'submitted',
      'approved'
    );
$$;

revoke all on function public.shift_active_assignment_count(uuid) from public;
grant execute on function public.shift_active_assignment_count(uuid) to authenticated;

create or replace function public.shift_open_positions(p_shift_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select greatest(
    0,
    coalesce(
      (
        select s.required_positions - public.shift_active_assignment_count(s.id)
        from public.shifts s
        where s.id = p_shift_id
      ),
      0
    )
  );
$$;

revoke all on function public.shift_open_positions(uuid) from public;
grant execute on function public.shift_open_positions(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Shared claim availability (marketplace + details)
-- Capacity-consuming statuses: accepted, checked_in, checked_out, submitted, approved.
-- Non-consuming: withdrawn, cancelled, rejected, no_show.
-- ---------------------------------------------------------------------------

create or replace function public.worker_shift_claim_availability(p_shift_id uuid)
returns table (
  shift_id uuid,
  required_positions integer,
  filled_positions integer,
  open_positions integer,
  is_claimable boolean,
  my_assignment_status public.assignment_status
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_worker_id uuid := auth.uid();
  v_shift public.shifts;
  v_filled integer;
  v_open integer;
  v_my_status public.assignment_status;
  v_account_status public.account_status;
  v_worker_role public.worker_role;
  v_verification public.verification_status;
  v_claimable boolean := false;
begin
  if v_worker_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select * into v_shift
  from public.shifts s
  where s.id = p_shift_id;

  if not found then
    return;
  end if;

  v_filled := public.shift_active_assignment_count(p_shift_id);
  v_open := greatest(0, v_shift.required_positions - v_filled);

  select sa.status into v_my_status
  from public.shift_assignments sa
  where sa.shift_id = p_shift_id
    and sa.worker_id = v_worker_id
    and sa.status in (
      'accepted',
      'checked_in',
      'checked_out',
      'submitted',
      'approved'
    )
  order by sa.accepted_at desc nulls last
  limit 1;

  select p.account_status, wp.worker_role, wp.verification_status
  into v_account_status, v_worker_role, v_verification
  from public.profiles p
  left join public.worker_profiles wp on wp.user_id = p.id
  where p.id = v_worker_id;

  v_claimable :=
    v_my_status is null
    and v_shift.status = 'published'
    and v_open > 0
    and v_shift.starts_at > now()
    and (
      v_shift.acceptance_deadline is null
      or v_shift.acceptance_deadline > now()
    )
    and public.organization_is_operational(v_shift.organization_id)
    and v_account_status = 'active'
    and v_verification = 'verified'
    and v_worker_role is not null
    and v_worker_role = v_shift.required_role;

  return query
  select
    v_shift.id,
    v_shift.required_positions,
    v_filled,
    v_open,
    v_claimable,
    v_my_status;
end;
$$;

revoke all on function public.worker_shift_claim_availability(uuid) from public;
grant execute on function public.worker_shift_claim_availability(uuid) to authenticated;

create or replace function public.worker_shifts_claim_availability(p_shift_ids uuid[])
returns table (
  shift_id uuid,
  required_positions integer,
  filled_positions integer,
  open_positions integer,
  is_claimable boolean,
  my_assignment_status public.assignment_status
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if p_shift_ids is null or cardinality(p_shift_ids) = 0 then
    return;
  end if;

  foreach v_id in array p_shift_ids
  loop
    return query
    select *
    from public.worker_shift_claim_availability(v_id);
  end loop;
end;
$$;

revoke all on function public.worker_shifts_claim_availability(uuid[]) from public;
grant execute on function public.worker_shifts_claim_availability(uuid[]) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. claim_shift — capacity-aware with SHIFT_FULL
-- ---------------------------------------------------------------------------

create or replace function public.claim_shift(p_shift_id uuid)
returns public.shift_assignments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_shift public.shifts;
  v_assignment public.shift_assignments;
  v_eligibility text;
  v_worker_id uuid := auth.uid();
  v_active integer;
begin
  if v_worker_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select * into v_shift
  from public.shifts
  where id = p_shift_id
  for update;

  if not found then
    raise exception 'SHIFT_NOT_FOUND';
  end if;

  if not public.organization_is_operational(v_shift.organization_id) then
    raise exception 'ORG_NOT_ACTIVE';
  end if;

  if v_shift.status <> 'published' then
    raise exception 'SHIFT_NOT_AVAILABLE';
  end if;

  if v_shift.starts_at <= now() then
    raise exception 'SHIFT_STARTED';
  end if;

  if v_shift.acceptance_deadline is not null
     and v_shift.acceptance_deadline <= now() then
    raise exception 'SHIFT_DEADLINE_PASSED';
  end if;

  select * into v_assignment
  from public.shift_assignments
  where shift_id = p_shift_id
    and worker_id = v_worker_id
    and status in (
      'accepted',
      'checked_in',
      'checked_out',
      'submitted',
      'approved'
    );

  if found then
    return v_assignment;
  end if;

  v_active := public.shift_active_assignment_count(p_shift_id);
  if v_active >= v_shift.required_positions then
    raise exception 'SHIFT_FULL';
  end if;

  v_eligibility := public.check_worker_eligibility(v_worker_id, p_shift_id);

  if v_eligibility = 'schedule_conflict' then
    raise exception 'SCHEDULE_CONFLICT';
  elsif v_eligibility <> 'eligible' then
    raise exception 'NOT_ELIGIBLE:%', v_eligibility;
  end if;

  perform set_config('bridgehive.allow_assignment_write', 'on', true);

  insert into public.shift_assignments (shift_id, worker_id, status, accepted_at)
  values (v_shift.id, v_worker_id, 'accepted', now())
  returning * into v_assignment;

  v_active := v_active + 1;

  if v_active >= v_shift.required_positions then
    update public.shifts
    set status = 'filled', updated_at = now()
    where id = v_shift.id;
  else
    update public.shifts
    set updated_at = now()
    where id = v_shift.id;
  end if;

  perform set_config('bridgehive.allow_assignment_write', 'off', true);

  perform public.create_audit_event(
    v_shift.organization_id,
    'shift_assignment',
    v_assignment.id,
    'claim_shift',
    null,
    to_jsonb(v_assignment)
  );

  insert into public.notifications (user_id, type, title, body, data)
  values (
    v_worker_id,
    'shift_claimed',
    'Shift claimed',
    'You successfully claimed a shift.',
    jsonb_build_object(
      'shift_id', v_shift.id,
      'assignment_id', v_assignment.id,
      'required_positions', v_shift.required_positions,
      'positions_filled', v_active
    )
  );

  return v_assignment;
exception
  when unique_violation then
    -- Per-worker unique index: same worker already has an active seat.
    -- Capacity races between different workers are serialized by FOR UPDATE
    -- and raise SHIFT_FULL above before insert.
    if public.shift_open_positions(p_shift_id) <= 0 then
      raise exception 'SHIFT_FULL';
    end if;
    raise exception 'ALREADY_ACCEPTED';
end;
$$;

revoke all on function public.claim_shift(uuid) from public;
grant execute on function public.claim_shift(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 6. get_worker_shift_details — include filled / claimable / own assignment
-- ---------------------------------------------------------------------------

drop function if exists public.get_worker_shift_details(uuid);

create or replace function public.get_worker_shift_details(p_shift_id uuid)
returns table (
  shift_id uuid,
  organization_name text,
  location_name text,
  ward_name text,
  title text,
  starts_at timestamptz,
  ends_at timestamptz,
  rate_minor integer,
  currency text,
  required_role public.worker_role,
  status public.shift_status,
  notes text,
  break_minutes integer,
  acceptance_deadline timestamptz,
  required_positions integer,
  filled_positions integer,
  open_positions integer,
  is_claimable boolean,
  my_assignment_status public.assignment_status
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_worker_role public.worker_role;
  v_avail record;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select wp.worker_role into v_worker_role
  from public.worker_profiles wp
  where wp.user_id = auth.uid();

  select * into v_avail
  from public.worker_shift_claim_availability(p_shift_id);

  return query
  select
    s.id as shift_id,
    o.display_name as organization_name,
    l.name as location_name,
    w.name as ward_name,
    s.title,
    s.starts_at,
    s.ends_at,
    s.rate_minor,
    s.currency,
    s.required_role,
    s.status,
    s.notes,
    s.break_minutes,
    s.acceptance_deadline,
    coalesce(v_avail.required_positions, s.required_positions) as required_positions,
    coalesce(v_avail.filled_positions, 0) as filled_positions,
    coalesce(v_avail.open_positions, public.shift_open_positions(s.id)) as open_positions,
    coalesce(v_avail.is_claimable, false) as is_claimable,
    v_avail.my_assignment_status
  from public.shifts s
  join public.organizations o on o.id = s.organization_id
  join public.locations l on l.id = s.location_id
  left join public.wards w on w.id = s.ward_id
  where s.id = p_shift_id
    and (
      exists (
        select 1
        from public.shift_assignments sa
        where sa.shift_id = s.id
          and sa.worker_id = auth.uid()
      )
      or (
        s.status = 'published'
        and v_worker_role is not null
        and v_worker_role = s.required_role
        and (
          s.acceptance_deadline is null
          or s.acceptance_deadline > now()
        )
      )
      or (
        s.status = 'filled'
        and v_worker_role is not null
        and v_worker_role = s.required_role
      )
    );
end;
$$;

revoke all on function public.get_worker_shift_details(uuid) from public;
grant execute on function public.get_worker_shift_details(uuid) to authenticated;
