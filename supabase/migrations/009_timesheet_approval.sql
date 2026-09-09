-- 009_timesheet_approval.sql
-- Organization review of submitted timesheets (SECURITY DEFINER RPC).

-- Allow privileged review writes via session flag (same pattern as claim_shift).
create or replace function public.timesheets_guard_client_write()
returns trigger
language plpgsql
as $$
begin
  if current_setting('bridgehive.allow_timesheet_review', true) = 'on' then
    return new;
  end if;

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

-- Assignment status may be set to approved/rejected by review RPC.
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

  if auth.uid() is null or auth.role() <> 'authenticated' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    raise exception 'ASSIGNMENT_INSERT_LOCKED';
  end if;

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

create or replace function public.review_timesheet(
  p_timesheet_id uuid,
  p_decision text,
  p_approved_minutes integer default null,
  p_review_note text default null
)
returns public.timesheets
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ts public.timesheets;
  v_assignment public.shift_assignments;
  v_shift public.shifts;
  v_decision text := lower(trim(p_decision));
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if v_decision not in ('approve', 'reject') then
    raise exception 'INVALID_DECISION';
  end if;

  select * into v_ts
  from public.timesheets
  where id = p_timesheet_id
  for update;

  if not found then
    raise exception 'TIMESHEET_NOT_FOUND';
  end if;

  if v_ts.status <> 'submitted' then
    raise exception 'TIMESHEET_NOT_SUBMITTED';
  end if;

  select * into v_assignment
  from public.shift_assignments
  where id = v_ts.assignment_id
  for update;

  select * into v_shift
  from public.shifts
  where id = v_assignment.shift_id;

  if not public.has_org_role(
    v_shift.organization_id,
    array['org_admin'::public.org_role, 'org_scheduler'::public.org_role]
  ) then
    raise exception 'NOT_AUTHORIZED';
  end if;

  perform set_config('bridgehive.allow_timesheet_review', 'on', true);

  if v_decision = 'approve' then
    if p_approved_minutes is null or p_approved_minutes < 0 then
      raise exception 'APPROVED_MINUTES_REQUIRED';
    end if;

    update public.timesheets
    set
      status = 'approved',
      approved_minutes = p_approved_minutes,
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      review_note = p_review_note,
      updated_at = now()
    where id = v_ts.id
    returning * into v_ts;

    update public.shift_assignments
    set status = 'approved', updated_at = now()
    where id = v_assignment.id;

    update public.shifts
    set status = 'completed', updated_at = now()
    where id = v_shift.id
      and status in ('filled', 'in_progress', 'awaiting_approval');

    -- Hook for finance layer (no-op until create_financial_snapshot exists).
    begin
      perform public.create_financial_snapshot(v_assignment.id);
    exception
      when undefined_function then
        null;
    end;
  else
    if p_review_note is null or char_length(trim(p_review_note)) = 0 then
      raise exception 'REVIEW_NOTE_REQUIRED';
    end if;

    update public.timesheets
    set
      status = 'rejected',
      approved_minutes = null,
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      review_note = p_review_note,
      updated_at = now()
    where id = v_ts.id
    returning * into v_ts;

    update public.shift_assignments
    set status = 'rejected', updated_at = now()
    where id = v_assignment.id;
  end if;

  perform set_config('bridgehive.allow_timesheet_review', 'off', true);

  perform public.create_audit_event(
    v_shift.organization_id,
    'timesheet',
    v_ts.id,
    'review_timesheet_' || v_decision,
    jsonb_build_object('status', 'submitted'),
    to_jsonb(v_ts)
  );

  insert into public.notifications (user_id, type, title, body, data)
  values (
    v_assignment.worker_id,
    'timesheet_' || v_decision,
    case when v_decision = 'approve' then 'Timesheet approved' else 'Timesheet rejected' end,
    case
      when v_decision = 'approve' then 'Your submitted hours were approved.'
      else coalesce(p_review_note, 'Your timesheet was rejected.')
    end,
    jsonb_build_object(
      'timesheet_id', v_ts.id,
      'assignment_id', v_assignment.id,
      'decision', v_decision
    )
  );

  return v_ts;
end;
$$;

-- Shifts guard must allow completed via timesheet review flag.
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

revoke all on function public.review_timesheet(uuid, text, integer, text) from public;
grant execute on function public.review_timesheet(uuid, text, integer, text) to authenticated;
