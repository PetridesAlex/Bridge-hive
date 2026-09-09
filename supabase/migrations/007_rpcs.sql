-- 007_rpcs.sql
-- Privileged business actions: eligibility checks and atomic claim_shift.

-- ---------------------------------------------------------------------------
-- Eligibility helpers
-- ---------------------------------------------------------------------------

create or replace function public.check_schedule_conflict(
  p_worker_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_exclude_assignment_id uuid default null
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.shift_assignments sa
    join public.shifts s on s.id = sa.shift_id
    where sa.worker_id = p_worker_id
      and sa.status in (
        'accepted',
        'checked_in',
        'checked_out',
        'submitted',
        'approved'
      )
      and (p_exclude_assignment_id is null or sa.id <> p_exclude_assignment_id)
      and s.starts_at < p_ends_at
      and s.ends_at > p_starts_at
  );
$$;

create or replace function public.check_worker_eligibility(
  p_worker_id uuid,
  p_shift_id uuid
)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_shift public.shifts;
  v_worker public.worker_profiles;
  v_req record;
begin
  select * into v_shift from public.shifts where id = p_shift_id;
  if not found then
    return 'shift_not_found';
  end if;

  select * into v_worker from public.worker_profiles where user_id = p_worker_id;
  if not found then
    return 'worker_profile_missing';
  end if;

  if v_worker.verification_status <> 'verified' then
    return 'not_verified';
  end if;

  if v_worker.worker_role is distinct from v_shift.required_role then
    return 'role_mismatch';
  end if;

  -- Required credential types on the shift must be present and verified / not expired.
  for v_req in
    select requirement_type
    from public.shift_requirements
    where shift_id = p_shift_id
      and required = true
  loop
    if not exists (
      select 1
      from public.credentials c
      where c.worker_id = p_worker_id
        and c.credential_type = v_req.requirement_type
        and c.status = 'verified'
        and (c.expires_at is null or c.expires_at > now())
    ) then
      return 'missing_credential:' || v_req.requirement_type;
    end if;
  end loop;

  if public.check_schedule_conflict(p_worker_id, v_shift.starts_at, v_shift.ends_at) then
    return 'schedule_conflict';
  end if;

  return 'eligible';
end;
$$;

revoke all on function public.check_schedule_conflict(uuid, timestamptz, timestamptz, uuid) from public;
grant execute on function public.check_schedule_conflict(uuid, timestamptz, timestamptz, uuid) to authenticated;

revoke all on function public.check_worker_eligibility(uuid, uuid) from public;
grant execute on function public.check_worker_eligibility(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- claim_shift: atomic lock + validate + assign + fill
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

  if v_shift.status <> 'published' then
    raise exception 'SHIFT_NOT_AVAILABLE';
  end if;

  if v_shift.acceptance_deadline is not null
     and v_shift.acceptance_deadline <= now() then
    raise exception 'SHIFT_DEADLINE_PASSED';
  end if;

  -- Idempotent: if this worker already has an active assignment, return it.
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

  v_eligibility := public.check_worker_eligibility(v_worker_id, p_shift_id);

  if v_eligibility = 'schedule_conflict' then
    raise exception 'SCHEDULE_CONFLICT';
  elsif v_eligibility <> 'eligible' then
    raise exception 'NOT_ELIGIBLE:%', v_eligibility;
  end if;

  -- Disable client write guard for this security definer insert by temporarily
  -- relying on auth.role() = service-like context: we set local role bypass via
  -- performing inserts as the function owner. Triggers still see auth.uid().
  -- Temporarily relax assignment guard by using session setting.
  perform set_config('bridgehive.allow_assignment_write', 'on', true);

  insert into public.shift_assignments (shift_id, worker_id, status, accepted_at)
  values (v_shift.id, v_worker_id, 'accepted', now())
  returning * into v_assignment;

  update public.shifts
  set status = 'filled', updated_at = now()
  where id = v_shift.id;

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
      'assignment_id', v_assignment.id
    )
  );

  return v_assignment;
exception
  when unique_violation then
    raise exception 'SHIFT_ALREADY_FILLED';
end;
$$;

-- Update assignment guard to honor claim_shift session flag.
create or replace function public.shift_assignments_guard_client_write()
returns trigger
language plpgsql
as $$
begin
  if current_setting('bridgehive.allow_assignment_write', true) = 'on' then
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

-- Allow filled status update when claim_shift sets the flag.
create or replace function public.shifts_guard_status_transition()
returns trigger
language plpgsql
as $$
begin
  if current_setting('bridgehive.allow_assignment_write', true) = 'on' then
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

revoke all on function public.claim_shift(uuid) from public;
grant execute on function public.claim_shift(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- publish_shift: org coordinator publishes a draft
-- ---------------------------------------------------------------------------

create or replace function public.publish_shift(p_shift_id uuid)
returns public.shifts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_shift public.shifts;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select * into v_shift
  from public.shifts
  where id = p_shift_id
  for update;

  if not found then
    raise exception 'SHIFT_NOT_FOUND';
  end if;

  if not public.has_org_role(
    v_shift.organization_id,
    array['org_admin'::public.org_role, 'org_scheduler'::public.org_role]
  ) then
    raise exception 'NOT_AUTHORIZED';
  end if;

  if v_shift.status <> 'draft' then
    raise exception 'SHIFT_NOT_DRAFT';
  end if;

  if v_shift.ends_at <= now() then
    raise exception 'SHIFT_IN_PAST';
  end if;

  update public.shifts
  set
    status = 'published',
    acceptance_deadline = coalesce(acceptance_deadline, starts_at),
    updated_at = now()
  where id = v_shift.id
  returning * into v_shift;

  perform public.create_audit_event(
    v_shift.organization_id,
    'shift',
    v_shift.id,
    'publish_shift',
    jsonb_build_object('status', 'draft'),
    to_jsonb(v_shift)
  );

  return v_shift;
end;
$$;

revoke all on function public.publish_shift(uuid) from public;
grant execute on function public.publish_shift(uuid) to authenticated;
