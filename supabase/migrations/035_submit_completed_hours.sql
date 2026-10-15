-- 035_submit_completed_hours.sql
-- Post-end completed-hours submission replaces check-in / check-out.
-- Default worker commission rate moves to 17% (1700 bps) for new snapshots.

-- ---------------------------------------------------------------------------
-- 1. Retire check-in / check-out RPCs (columns and enum values retained)
-- ---------------------------------------------------------------------------

create or replace function public.check_in_assignment(p_assignment_id uuid)
returns public.shift_assignments
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'CHECK_IN_RETIRED';
end;
$$;

revoke all on function public.check_in_assignment(uuid) from public;
revoke all on function public.check_in_assignment(uuid) from anon;
grant execute on function public.check_in_assignment(uuid) to authenticated;

comment on function public.check_in_assignment(uuid) is
  'Retired: workers submit completed hours after the scheduled end instead.';

create or replace function public.check_out_assignment(p_assignment_id uuid)
returns public.shift_assignments
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'CHECK_IN_RETIRED';
end;
$$;

revoke all on function public.check_out_assignment(uuid) from public;
revoke all on function public.check_out_assignment(uuid) from anon;
grant execute on function public.check_out_assignment(uuid) to authenticated;

comment on function public.check_out_assignment(uuid) is
  'Retired: workers submit completed hours after the scheduled end instead.';

-- ---------------------------------------------------------------------------
-- 2. submit_timesheet(assignment_id, submitted_minutes) after ends_at
-- ---------------------------------------------------------------------------

drop function if exists public.submit_timesheet(uuid);

create or replace function public.submit_timesheet(
  p_assignment_id uuid,
  p_submitted_minutes integer
)
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
  v_has_timesheet boolean := false;
  v_account_status public.account_status;
begin
  if v_worker_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select account_status into v_account_status
  from public.profiles
  where id = v_worker_id;

  if not found or v_account_status <> 'active' then
    raise exception 'ACCOUNT_NOT_ACTIVE';
  end if;

  if p_submitted_minutes is null
     or p_submitted_minutes < 1
     or p_submitted_minutes > 1440 then
    raise exception 'INVALID_SUBMITTED_MINUTES';
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

  -- accepted is the happy path; checked_in / checked_out remain for in-flight rows.
  if v_assignment.status not in ('accepted', 'checked_in', 'checked_out') then
    raise exception 'ASSIGNMENT_NOT_COMPLETABLE';
  end if;

  select * into v_shift
  from public.shifts
  where id = v_assignment.shift_id
  for update;

  if not found then
    raise exception 'SHIFT_NOT_FOUND';
  end if;

  if now() < v_shift.ends_at then
    raise exception 'SHIFT_NOT_ENDED';
  end if;

  perform set_config('bridgehive.allow_timesheet_submit', 'on', true);
  perform set_config('bridgehive.allow_assignment_write', 'on', true);

  if v_has_timesheet then
    update public.timesheets
    set
      submitted_minutes = p_submitted_minutes,
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
      p_submitted_minutes,
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
    jsonb_build_object(
      'assignment_id', v_assignment.id,
      'submitted_minutes', p_submitted_minutes
    ),
    to_jsonb(v_ts)
  );

  return v_ts;
end;
$$;

revoke all on function public.submit_timesheet(uuid, integer) from public;
revoke all on function public.submit_timesheet(uuid, integer) from anon;
grant execute on function public.submit_timesheet(uuid, integer) to authenticated;

comment on function public.submit_timesheet(uuid, integer) is
  'Worker submits completed minutes after the scheduled shift end. No invoice until org approval.';

-- ---------------------------------------------------------------------------
-- 3. Effective-dated commission rate: 16% → 17% for new snapshots
-- ---------------------------------------------------------------------------

do $$
declare
  v_cutover timestamptz := now();
begin
  update public.commission_rate_rules
  set effective_until = v_cutover
  where scope = 'global'
    and rate_bps = 1600
    and effective_until is null;

  insert into public.commission_rate_rules (
    rate_bps, effective_from, scope, created_by, reason
  )
  values (
    1700,
    v_cutover,
    'global',
    null,
    'Default worker-funded commission raised to 17%'
  );
end;
$$;

update public.platform_settings
set value_json = '1700'::jsonb
where key = 'default_commission_rate_bps';

create or replace function public.get_effective_commission_rate_bps(
  p_at timestamptz default now()
)
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_rate integer;
begin
  select r.rate_bps into v_rate
  from public.commission_rate_rules r
  where r.scope = 'global'
    and r.effective_from <= p_at
    and (r.effective_until is null or r.effective_until > p_at)
  order by r.effective_from desc
  limit 1;

  if v_rate is null then
    v_rate := public.get_setting_int('default_commission_rate_bps', 1700);
  end if;

  return v_rate;
end;
$$;

revoke all on function public.get_effective_commission_rate_bps(timestamptz) from public;
grant execute on function public.get_effective_commission_rate_bps(timestamptz) to authenticated;
