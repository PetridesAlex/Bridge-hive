-- 039_app_review_demo_account.sql
-- Apple App Review demonstration capability (server-enforced).
-- Do not seed a reviewer mailbox or password here.
-- Apply to hosted only when the owner is ready for TestFlight review.

-- ---------------------------------------------------------------------------
-- 1. Flag on worker_profiles (default false)
-- ---------------------------------------------------------------------------

alter table public.worker_profiles
  add column if not exists is_app_review_demo boolean not null default false;

comment on column public.worker_profiles.is_app_review_demo is
  'Platform-super-admin only. Isolated App Review demo; never set by workers or orgs.';

create index if not exists worker_profiles_app_review_demo_idx
  on public.worker_profiles (user_id)
  where is_app_review_demo;

-- Lock column: workers cannot flip the flag; only SECURITY DEFINER RPC with session flag.
create or replace function public.worker_profiles_guard_verification()
returns trigger
language plpgsql
as $$
begin
  -- Demo enable/revoke RPC may change is_app_review_demo only.
  if current_setting('bridgehive.allow_app_review_demo', true) = 'on' then
    if tg_op = 'UPDATE'
       and new.verification_status is distinct from old.verification_status then
      raise exception 'WORKER_VERIFICATION_LOCKED';
    end if;
    return new;
  end if;

  -- Platform verification RPC may change verification_status, not the demo flag.
  if current_setting('bridgehive.allow_platform_verify', true) = 'on' then
    if tg_op = 'UPDATE'
       and new.is_app_review_demo is distinct from old.is_app_review_demo then
      raise exception 'APP_REVIEW_DEMO_LOCKED';
    end if;
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.verification_status is distinct from 'draft' then
      raise exception 'WORKER_VERIFICATION_LOCKED';
    end if;
    if coalesce(new.is_app_review_demo, false) then
      raise exception 'APP_REVIEW_DEMO_LOCKED';
    end if;
    return new;
  end if;

  if auth.uid() is not null and auth.role() = 'authenticated' then
    if new.verification_status is distinct from old.verification_status then
      raise exception 'WORKER_VERIFICATION_LOCKED';
    end if;
    if new.is_app_review_demo is distinct from old.is_app_review_demo then
      raise exception 'APP_REVIEW_DEMO_LOCKED';
    end if;
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Helpers
-- ---------------------------------------------------------------------------

create or replace function public.is_app_review_demo_worker(p_worker_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select wp.is_app_review_demo
      from public.worker_profiles wp
      where wp.user_id = p_worker_id
    ),
    false
  );
$$;

revoke all on function public.is_app_review_demo_worker(uuid) from public;
revoke all on function public.is_app_review_demo_worker(uuid) from anon;
grant execute on function public.is_app_review_demo_worker(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Enable / revoke (platform_super_admin only)
-- ---------------------------------------------------------------------------

create or replace function public.set_worker_app_review_demo(
  p_worker_id uuid,
  p_enabled boolean,
  p_reason text default 'Apple App Review'
)
returns public.worker_profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_worker public.worker_profiles;
  v_old boolean;
  v_reason text := left(trim(coalesce(p_reason, 'Apple App Review')), 200);
  v_action text;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if not public.is_platform_admin('platform_super_admin') then
    raise exception 'NOT_AUTHORIZED';
  end if;

  if p_worker_id = auth.uid() then
    raise exception 'CANNOT_SELF_TARGET';
  end if;

  if v_reason = '' then
    v_reason := 'Apple App Review';
  end if;

  select * into v_worker
  from public.worker_profiles
  where user_id = p_worker_id
  for update;

  if not found then
    raise exception 'WORKER_NOT_FOUND';
  end if;

  v_old := v_worker.is_app_review_demo;
  v_action := case when p_enabled then 'enable_app_review_demo' else 'revoke_app_review_demo' end;

  if v_old is not distinct from p_enabled then
    return v_worker;
  end if;

  perform set_config('bridgehive.allow_app_review_demo', 'on', true);

  update public.worker_profiles
  set
    is_app_review_demo = p_enabled,
    updated_at = now()
  where user_id = p_worker_id
  returning * into v_worker;

  perform set_config('bridgehive.allow_app_review_demo', 'off', true);

  perform public.create_audit_event(
    null,
    'worker_profile',
    p_worker_id,
    v_action,
    jsonb_build_object(
      'was_enabled', v_old,
      'reason', v_reason
    ),
    jsonb_build_object(
      'is_app_review_demo', v_worker.is_app_review_demo,
      'verification_status', v_worker.verification_status
    )
  );

  return v_worker;
end;
$$;

revoke all on function public.set_worker_app_review_demo(uuid, boolean, text) from public;
revoke all on function public.set_worker_app_review_demo(uuid, boolean, text) from anon;
grant execute on function public.set_worker_app_review_demo(uuid, boolean, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Synthetic demo catalog (JSON only — no live table rows)
-- ---------------------------------------------------------------------------

create or replace function public.get_app_review_demo_catalog()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if not public.is_app_review_demo_worker(auth.uid()) then
    raise exception 'NOT_AUTHORIZED';
  end if;

  return jsonb_build_object(
    'banner', jsonb_build_object(
      'title', 'App Review demonstration account',
      'body', 'This account contains safe sample data and cannot access live work or payments.'
    ),
    'shift', jsonb_build_object(
      'id', '00000000-0000-4000-8000-000000000001',
      'label', 'APP REVIEW DEMO — NOT A LIVE SHIFT',
      'title', 'Day shift — Ward sample',
      'organization_name', 'Demo Care Facility (sample)',
      'location_name', 'Sample ward',
      'required_role', 'registered_nurse',
      'starts_at', (timezone('utc', now()) + interval '3 days')::text,
      'ends_at', (timezone('utc', now()) + interval '3 days 8 hours')::text,
      'hourly_rate_minor', 1800,
      'currency', 'EUR',
      'status', 'published',
      'actions_allowed', false
    ),
    'timesheet', jsonb_build_object(
      'id', '00000000-0000-4000-8000-000000000002',
      'label', 'APP REVIEW DEMO — NOT A REAL TIMESHEET',
      'status', 'approved',
      'submitted_minutes', 450,
      'approved_minutes', 450,
      'actions_allowed', false
    ),
    'invoice', jsonb_build_object(
      'id', '00000000-0000-4000-8000-000000000003',
      'label', 'APP REVIEW DEMO — NOT A REAL INVOICE',
      'status', 'open',
      'amount_minor', 3400,
      'currency', 'EUR',
      'due_at', (timezone('utc', now()) + interval '7 days')::text,
      'actions_allowed', false,
      'checkout_allowed', false
    )
  );
end;
$$;

revoke all on function public.get_app_review_demo_catalog() from public;
revoke all on function public.get_app_review_demo_catalog() from anon;
grant execute on function public.get_app_review_demo_catalog() to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Block mutations for demo workers
-- ---------------------------------------------------------------------------

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
  v_account_status public.account_status;
  v_req record;
  v_missing text;
  v_required text[];
begin
  select * into v_shift from public.shifts where id = p_shift_id;
  if not found then
    return 'shift_not_found';
  end if;

  select account_status into v_account_status
  from public.profiles
  where id = p_worker_id;

  if not found then
    return 'profile_missing';
  end if;

  if v_account_status <> 'active' then
    return 'account_not_active';
  end if;

  select * into v_worker from public.worker_profiles where user_id = p_worker_id;
  if not found then
    return 'worker_profile_missing';
  end if;

  if coalesce(v_worker.is_app_review_demo, false) then
    return 'app_review_demo';
  end if;

  if v_worker.verification_status <> 'verified' then
    return 'not_verified';
  end if;

  if not public.worker_has_satisfied_payout_account(p_worker_id) then
    return 'payout_account_required';
  end if;

  if public.worker_has_overdue_commission(p_worker_id) then
    return 'billing_restricted';
  end if;

  if v_worker.worker_role is distinct from v_shift.required_role then
    return 'role_mismatch';
  end if;

  if v_worker.worker_role is not null then
    v_required := public.worker_required_credential_types(v_worker.worker_role);
    if coalesce(cardinality(v_required), 0) = 0 then
      return 'missing_credential:requirements';
    end if;

    select t.cred_type into v_missing
    from unnest(v_required) as t(cred_type)
    where not exists (
      select 1
      from public.credentials c
      where c.worker_id = p_worker_id
        and c.credential_type = t.cred_type
        and c.status = 'verified'
        and public.credential_expiry_is_valid(c.credential_type, c.expires_at)
    )
    limit 1;

    if v_missing is not null then
      return 'missing_credential:' || v_missing;
    end if;
  end if;

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
        and public.credential_expiry_is_valid(c.credential_type, c.expires_at)
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

revoke all on function public.check_worker_eligibility(uuid, uuid) from public;
grant execute on function public.check_worker_eligibility(uuid, uuid) to authenticated;

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

  if public.is_app_review_demo_worker(v_worker_id) then
    raise exception 'APP_REVIEW_DEMO_FORBIDDEN';
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

-- Patch submit_timesheet: block demo workers (body matches 035 + guard).
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

  if public.is_app_review_demo_worker(v_worker_id) then
    raise exception 'APP_REVIEW_DEMO_FORBIDDEN';
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

-- ---------------------------------------------------------------------------
-- 6. Marketplace RLS: never treat demo workers as live marketplace participants
-- ---------------------------------------------------------------------------

drop policy if exists "shifts_select_eligible_worker" on public.shifts;
create policy "shifts_select_eligible_worker"
on public.shifts
for select
to authenticated
using (
  status = 'published'
  and public.organization_is_operational(organization_id)
  and (acceptance_deadline is null or acceptance_deadline > now())
  and exists (
    select 1
    from public.worker_profiles wp
    where wp.user_id = auth.uid()
      and wp.worker_role = shifts.required_role
      and wp.verification_status = 'verified'
      and coalesce(wp.is_app_review_demo, false) = false
  )
  and not public.worker_has_overdue_commission(auth.uid())
);
