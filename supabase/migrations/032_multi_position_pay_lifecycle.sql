-- 032_multi_position_pay_lifecycle.sql
-- Multi-position shifts: lifecycle + pay independence.
-- Rate is per professional. Each assignment has its own timesheet/payout/invoice.
-- Parent shift completes only when every in-flight assignment is settled and
-- capacity is full (or the shift has already ended).

-- ---------------------------------------------------------------------------
-- 1. Pending-work helper (blocks parent "completed")
-- ---------------------------------------------------------------------------

create or replace function public.shift_pending_assignment_count(p_shift_id uuid)
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
      'submitted'
    );
$$;

revoke all on function public.shift_pending_assignment_count(uuid) from public;
grant execute on function public.shift_pending_assignment_count(uuid) to authenticated;

comment on function public.shift_pending_assignment_count(uuid) is
  'Assignments still in progress for a multi-position shift (not yet approved/rejected/withdrawn).';

-- ---------------------------------------------------------------------------
-- 2. check_in_assignment — allow in_progress from published (partial fill)
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

  -- Partial fills stay published until capacity is exhausted; still mark in progress.
  if v_shift.status in ('published', 'filled') then
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

revoke all on function public.check_in_assignment(uuid) from public;
revoke all on function public.check_in_assignment(uuid) from anon;
grant execute on function public.check_in_assignment(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. submit_timesheet — awaiting_approval from published/filled/in_progress
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
    and status in ('published', 'filled', 'in_progress');

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

revoke all on function public.submit_timesheet(uuid) from public;
revoke all on function public.submit_timesheet(uuid) from anon;
grant execute on function public.submit_timesheet(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. review_timesheet — complete parent only when all positions settled
-- ---------------------------------------------------------------------------

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
  v_pending integer;
  v_open integer;
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
  where id = v_assignment.shift_id
  for update;

  if not public.organization_is_operational(v_shift.organization_id) then
    raise exception 'ORG_NOT_ACTIVE';
  end if;

  if not public.has_org_role(
    v_shift.organization_id,
    array['org_admin'::public.org_role, 'org_scheduler'::public.org_role]
  ) then
    raise exception 'NOT_AUTHORIZED';
  end if;

  perform set_config('bridgehive.allow_timesheet_review', 'on', true);
  perform set_config('bridgehive.allow_assignment_write', 'on', true);

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

    -- Snapshot / payout / commission invoice are per assignment (not × positions).
    perform public.create_financial_snapshot(v_assignment.id);

    v_pending := public.shift_pending_assignment_count(v_shift.id);
    v_open := public.shift_open_positions(v_shift.id);

    if v_pending = 0 and (v_open = 0 or v_shift.ends_at <= now()) then
      update public.shifts
      set status = 'completed', updated_at = now()
      where id = v_shift.id
        and status in (
          'published',
          'filled',
          'in_progress',
          'awaiting_approval'
        );
    elsif v_pending > 0 then
      -- Keep org in review/ops mode while other positions are still in flight.
      update public.shifts
      set status = 'awaiting_approval', updated_at = now()
      where id = v_shift.id
        and status in ('published', 'filled', 'in_progress', 'awaiting_approval')
        and exists (
          select 1
          from public.shift_assignments a
          where a.shift_id = v_shift.id
            and a.status = 'submitted'
        );
    end if;
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

    -- Rejection frees capacity via reopen trigger when applicable; do not complete.
  end if;

  perform set_config('bridgehive.allow_timesheet_review', 'off', true);
  perform set_config('bridgehive.allow_assignment_write', 'off', true);

  perform public.create_audit_event(
    v_shift.organization_id,
    'timesheet',
    v_ts.id,
    'review_timesheet_' || v_decision,
    jsonb_build_object('status', 'submitted'),
    jsonb_build_object('status', v_ts.status, 'decision', v_decision)
  );

  insert into public.notifications (user_id, type, title, body, data)
  values (
    v_assignment.worker_id,
    'timesheet_' || v_decision,
    case when v_decision = 'approve' then 'Timesheet approved' else 'Timesheet rejected' end,
    case
      when v_decision = 'approve' then 'Your submitted hours were approved.'
      else coalesce(left(trim(p_review_note), 200), 'Your timesheet was rejected.')
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

revoke all on function public.review_timesheet(uuid, text, integer, text) from public;
grant execute on function public.review_timesheet(uuid, text, integer, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. claim_shift — clearer race error for same-worker duplicate
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
    raise exception 'SHIFT_ALREADY_FILLED';
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
    if public.shift_open_positions(p_shift_id) <= 0 then
      raise exception 'SHIFT_ALREADY_FILLED';
    end if;
    raise exception 'ALREADY_ACCEPTED';
end;
$$;

revoke all on function public.claim_shift(uuid) from public;
grant execute on function public.claim_shift(uuid) to authenticated;
