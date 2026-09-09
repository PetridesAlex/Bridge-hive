-- 015_assignment_check_in_out_rpcs.sql
-- Secure check-in / check-out / timesheet submit RPCs.
-- Pilot check-in window: [starts_at - 30 minutes, ends_at].
-- Clients must not choose protected status transitions or timestamps.

-- ---------------------------------------------------------------------------
-- Tighten assignment write guard: check-in/out/submit only via RPCs.
-- Workers may still withdraw/cancel an accepted assignment directly.
-- ---------------------------------------------------------------------------

create or replace function public.shift_assignments_guard_client_write()
returns trigger
language plpgsql
as $$
begin
  if current_setting('bridgehive.allow_assignment_write', true) = 'on' then
    return new;
  end if;

  if current_setting('bridgehive.allow_timesheet_review', true) = 'on' then
    return new;
  end if;

  if current_setting('bridgehive.allow_timesheet_submit', true) = 'on' then
    return new;
  end if;

  if auth.uid() is null or auth.role() <> 'authenticated' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    raise exception 'ASSIGNMENT_INSERT_LOCKED';
  end if;

  if new.check_in_at is distinct from old.check_in_at
     or new.check_out_at is distinct from old.check_out_at then
    raise exception 'ASSIGNMENT_TIMESTAMPS_LOCKED';
  end if;

  if old.status is distinct from new.status then
    if not (
      old.status = 'accepted'
      and new.status in ('withdrawn', 'cancelled')
    ) then
      raise exception 'ASSIGNMENT_STATUS_LOCKED';
    end if;
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Tighten timesheet write guard: submission only via submit_timesheet RPC.
-- ---------------------------------------------------------------------------

create or replace function public.timesheets_guard_client_write()
returns trigger
language plpgsql
as $$
begin
  if current_setting('bridgehive.allow_timesheet_review', true) = 'on' then
    return new;
  end if;

  if current_setting('bridgehive.allow_timesheet_submit', true) = 'on' then
    return new;
  end if;

  if auth.uid() is null or auth.role() <> 'authenticated' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.status <> 'draft' then
      raise exception 'TIMESHEET_STATUS_LOCKED';
    end if;
    if new.approved_minutes is not null or new.reviewed_by is not null then
      raise exception 'TIMESHEET_REVIEW_LOCKED';
    end if;
    return new;
  end if;

  if old.status is distinct from new.status then
    raise exception 'TIMESHEET_STATUS_LOCKED';
  end if;

  if new.approved_minutes is distinct from old.approved_minutes
     or new.reviewed_by is distinct from old.reviewed_by
     or new.reviewed_at is distinct from old.reviewed_at
     or new.submitted_minutes is distinct from old.submitted_minutes
     or new.submitted_at is distinct from old.submitted_at then
    raise exception 'TIMESHEET_REVIEW_LOCKED';
  end if;

  return new;
end;
$$;

-- Shifts may move to in_progress / awaiting_approval when RPC flags are set.
create or replace function public.shifts_guard_status_transition()
returns trigger
language plpgsql
as $$
begin
  if current_setting('bridgehive.allow_assignment_write', true) = 'on' then
    return new;
  end if;

  if current_setting('bridgehive.allow_timesheet_review', true) = 'on' then
    return new;
  end if;

  if current_setting('bridgehive.allow_timesheet_submit', true) = 'on' then
    return new;
  end if;

  if auth.uid() is null or auth.role() <> 'authenticated' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.status not in ('draft', 'published') then
      raise exception 'SHIFT_STATUS_LOCKED';
    end if;
    return new;
  end if;

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

-- ---------------------------------------------------------------------------
-- check_in_assignment
-- ---------------------------------------------------------------------------

create or replace function public.check_in_assignment(p_assignment_id uuid)
returns public.shift_assignments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_worker_id uuid := auth.uid();
  v_assignment public.shift_assignments;
  v_shift public.shifts;
begin
  if v_worker_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select * into v_assignment
  from public.shift_assignments
  where id = p_assignment_id
  for update;

  if not found then
    raise exception 'ASSIGNMENT_NOT_FOUND';
  end if;

  if v_assignment.worker_id <> v_worker_id then
    raise exception 'NOT_AUTHORIZED';
  end if;

  -- Idempotent: already checked in.
  if v_assignment.status = 'checked_in' then
    return v_assignment;
  end if;

  if v_assignment.status <> 'accepted' then
    raise exception 'ASSIGNMENT_NOT_ACCEPTED';
  end if;

  select * into v_shift
  from public.shifts
  where id = v_assignment.shift_id
  for update;

  if not found then
    raise exception 'SHIFT_NOT_FOUND';
  end if;

  -- Pilot window: not earlier than 30 minutes before start; not after end.
  -- Always use database now(); never trust a client timestamp.
  if now() < (v_shift.starts_at - interval '30 minutes') then
    raise exception 'CHECK_IN_TOO_EARLY';
  end if;

  if now() > v_shift.ends_at then
    raise exception 'CHECK_IN_TOO_LATE';
  end if;

  perform set_config('bridgehive.allow_assignment_write', 'on', true);

  update public.shift_assignments
  set
    status = 'checked_in',
    check_in_at = now(),
    updated_at = now()
  where id = v_assignment.id
  returning * into v_assignment;

  if v_shift.status = 'filled' then
    update public.shifts
    set status = 'in_progress', updated_at = now()
    where id = v_shift.id;
  end if;

  perform set_config('bridgehive.allow_assignment_write', 'off', true);

  perform public.create_audit_event(
    v_shift.organization_id,
    'assignment',
    v_assignment.id,
    'check_in_assignment',
    jsonb_build_object('status', 'accepted'),
    to_jsonb(v_assignment)
  );

  return v_assignment;
end;
$$;

-- ---------------------------------------------------------------------------
-- check_out_assignment
-- ---------------------------------------------------------------------------

create or replace function public.check_out_assignment(p_assignment_id uuid)
returns public.shift_assignments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_worker_id uuid := auth.uid();
  v_assignment public.shift_assignments;
  v_shift public.shifts;
begin
  if v_worker_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select * into v_assignment
  from public.shift_assignments
  where id = p_assignment_id
  for update;

  if not found then
    raise exception 'ASSIGNMENT_NOT_FOUND';
  end if;

  if v_assignment.worker_id <> v_worker_id then
    raise exception 'NOT_AUTHORIZED';
  end if;

  -- Idempotent: already checked out (or past that into submitted).
  if v_assignment.status in ('checked_out', 'submitted', 'approved') then
    return v_assignment;
  end if;

  if v_assignment.status <> 'checked_in' then
    raise exception 'ASSIGNMENT_NOT_CHECKED_IN';
  end if;

  if v_assignment.check_in_at is null then
    raise exception 'CHECK_IN_REQUIRED';
  end if;

  select * into v_shift
  from public.shifts
  where id = v_assignment.shift_id;

  if not found then
    raise exception 'SHIFT_NOT_FOUND';
  end if;

  perform set_config('bridgehive.allow_assignment_write', 'on', true);

  update public.shift_assignments
  set
    status = 'checked_out',
    check_out_at = now(),
    updated_at = now()
  where id = v_assignment.id
  returning * into v_assignment;

  perform set_config('bridgehive.allow_assignment_write', 'off', true);

  perform public.create_audit_event(
    v_shift.organization_id,
    'assignment',
    v_assignment.id,
    'check_out_assignment',
    jsonb_build_object('status', 'checked_in'),
    to_jsonb(v_assignment)
  );

  return v_assignment;
end;
$$;

-- ---------------------------------------------------------------------------
-- submit_timesheet — server computes submitted minutes from recorded stamps.
-- ---------------------------------------------------------------------------

create or replace function public.submit_timesheet(p_assignment_id uuid)
returns public.timesheets
language plpgsql
security definer
set search_path = public
as $$
declare
  v_worker_id uuid := auth.uid();
  v_assignment public.shift_assignments;
  v_shift public.shifts;
  v_ts public.timesheets;
  v_minutes integer;
  v_has_timesheet boolean := false;
begin
  if v_worker_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select * into v_assignment
  from public.shift_assignments
  where id = p_assignment_id
  for update;

  if not found then
    raise exception 'ASSIGNMENT_NOT_FOUND';
  end if;

  if v_assignment.worker_id <> v_worker_id then
    raise exception 'NOT_AUTHORIZED';
  end if;

  select * into v_ts
  from public.timesheets
  where assignment_id = p_assignment_id
  for update;

  v_has_timesheet := found;

  -- Idempotent: already submitted (or beyond).
  if v_has_timesheet and v_ts.status in ('submitted', 'approved') then
    return v_ts;
  end if;

  if v_assignment.status = 'submitted' and v_has_timesheet then
    return v_ts;
  end if;

  if v_assignment.status <> 'checked_out' then
    raise exception 'ASSIGNMENT_NOT_CHECKED_OUT';
  end if;

  if v_assignment.check_in_at is null or v_assignment.check_out_at is null then
    raise exception 'CHECK_TIMESTAMPS_REQUIRED';
  end if;

  if v_assignment.check_out_at <= v_assignment.check_in_at then
    raise exception 'INVALID_CHECK_TIMESTAMPS';
  end if;

  select * into v_shift
  from public.shifts
  where id = v_assignment.shift_id
  for update;

  if not found then
    raise exception 'SHIFT_NOT_FOUND';
  end if;

  v_minutes := greatest(
    0,
    (extract(epoch from (v_assignment.check_out_at - v_assignment.check_in_at)) / 60.0)::integer
      - coalesce(v_shift.break_minutes, 0)
  );

  perform set_config('bridgehive.allow_timesheet_submit', 'on', true);
  perform set_config('bridgehive.allow_assignment_write', 'on', true);

  if v_has_timesheet then
    update public.timesheets
    set
      submitted_minutes = v_minutes,
      break_minutes = coalesce(v_shift.break_minutes, 0),
      status = 'submitted',
      submitted_at = now(),
      approved_minutes = null,
      reviewed_by = null,
      reviewed_at = null,
      review_note = null,
      updated_at = now()
    where id = v_ts.id
    returning * into v_ts;
  else
    insert into public.timesheets (
      assignment_id,
      submitted_minutes,
      break_minutes,
      status,
      submitted_at
    ) values (
      v_assignment.id,
      v_minutes,
      coalesce(v_shift.break_minutes, 0),
      'submitted',
      now()
    )
    returning * into v_ts;
  end if;

  update public.shift_assignments
  set status = 'submitted', updated_at = now()
  where id = v_assignment.id;

  update public.shifts
  set status = 'awaiting_approval', updated_at = now()
  where id = v_shift.id
    and status in ('filled', 'in_progress');

  perform set_config('bridgehive.allow_timesheet_submit', 'off', true);
  perform set_config('bridgehive.allow_assignment_write', 'off', true);

  perform public.create_audit_event(
    v_shift.organization_id,
    'timesheet',
    v_ts.id,
    'submit_timesheet',
    jsonb_build_object('assignment_id', v_assignment.id),
    to_jsonb(v_ts)
  );

  return v_ts;
end;
$$;

revoke all on function public.check_in_assignment(uuid) from public;
revoke all on function public.check_in_assignment(uuid) from anon;
grant execute on function public.check_in_assignment(uuid) to authenticated;

revoke all on function public.check_out_assignment(uuid) from public;
revoke all on function public.check_out_assignment(uuid) from anon;
grant execute on function public.check_out_assignment(uuid) to authenticated;

revoke all on function public.submit_timesheet(uuid) from public;
revoke all on function public.submit_timesheet(uuid) from anon;
grant execute on function public.submit_timesheet(uuid) to authenticated;
