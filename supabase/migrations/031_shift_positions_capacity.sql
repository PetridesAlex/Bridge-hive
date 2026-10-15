-- 031_shift_positions_capacity.sql
-- Multi-worker capacity per shift via required_positions (1–100).
-- One shift row; N eligible workers may claim until capacity is exhausted.

-- ---------------------------------------------------------------------------
-- 1. Column + check
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
-- 2. Replace per-shift unique slot with per-worker uniqueness
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
-- 3. Helpers
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
-- 4. Reopen capacity when an active assignment is withdrawn/cancelled
-- ---------------------------------------------------------------------------

create or replace function public.shift_assignments_reopen_capacity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_shift public.shifts;
  v_active integer;
  v_was_active boolean;
  v_now_active boolean;
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;

  v_was_active := old.status in (
    'accepted', 'checked_in', 'checked_out', 'submitted', 'approved'
  );
  v_now_active := new.status in (
    'accepted', 'checked_in', 'checked_out', 'submitted', 'approved'
  );

  if not (v_was_active and not v_now_active) then
    return new;
  end if;

  select * into v_shift
  from public.shifts
  where id = new.shift_id
  for update;

  if not found then
    return new;
  end if;

  v_active := public.shift_active_assignment_count(v_shift.id);

  -- Only reopen marketplace capacity for not-yet-started filled shifts.
  if v_shift.status = 'filled'
     and v_shift.starts_at > now()
     and v_active < v_shift.required_positions then
    perform set_config('bridgehive.allow_assignment_write', 'on', true);
    update public.shifts
    set status = 'published', updated_at = now()
    where id = v_shift.id;
    perform set_config('bridgehive.allow_assignment_write', 'off', true);
  end if;

  return new;
end;
$$;

drop trigger if exists shift_assignments_reopen_capacity on public.shift_assignments;
create trigger shift_assignments_reopen_capacity
after update of status on public.shift_assignments
for each row
execute function public.shift_assignments_reopen_capacity();

-- ---------------------------------------------------------------------------
-- 5. claim_shift — capacity-aware
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
    raise exception 'SHIFT_ALREADY_FILLED';
end;
$$;

revoke all on function public.claim_shift(uuid) from public;
grant execute on function public.claim_shift(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 6. create_shifts_batch — accept required_positions
-- ---------------------------------------------------------------------------

create or replace function public.create_shifts_batch(
  p_organization_id uuid,
  p_request_key text,
  p_requested_status text,
  p_creation_mode text,
  p_shifts jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_status text := lower(trim(coalesce(p_requested_status, '')));
  v_mode text := lower(trim(coalesce(p_creation_mode, '')));
  v_key text := trim(coalesce(p_request_key, ''));
  v_count integer;
  v_payload_hash text;
  v_existing public.shift_creation_batches;
  v_batch_id uuid;
  v_shift_ids uuid[] := array[]::uuid[];
  v_row jsonb;
  v_idx integer;
  v_location_id uuid;
  v_ward_id uuid;
  v_required_role text;
  v_starts_at timestamptz;
  v_ends_at timestamptz;
  v_break_minutes integer;
  v_rate_minor integer;
  v_currency text;
  v_deadline timestamptz;
  v_title text;
  v_notes text;
  v_requirements jsonb;
  v_shift_id uuid;
  v_req jsonb;
  v_loc_org uuid;
  v_required_positions integer;
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if p_organization_id is null then
    raise exception 'ORG_REQUIRED';
  end if;

  if not public.has_org_role(
    p_organization_id,
    array['org_admin'::public.org_role, 'org_scheduler'::public.org_role]
  ) then
    raise exception 'NOT_AUTHORIZED';
  end if;

  if v_status not in ('draft', 'published') then
    raise exception 'INVALID_REQUESTED_STATUS';
  end if;

  if v_mode not in ('repeat', 'individual', 'custom') then
    raise exception 'INVALID_CREATION_MODE';
  end if;

  if char_length(v_key) = 0 or char_length(v_key) > 128 then
    raise exception 'INVALID_REQUEST_KEY';
  end if;

  if p_shifts is null or jsonb_typeof(p_shifts) <> 'array' then
    raise exception 'SHIFTS_REQUIRED';
  end if;

  if octet_length(p_shifts::text) > 262144 then
    raise exception 'PAYLOAD_TOO_LARGE';
  end if;

  v_count := jsonb_array_length(p_shifts);
  if v_count < 2 then
    raise exception 'BATCH_TOO_SMALL';
  end if;
  if v_count > 100 then
    raise exception 'BATCH_TOO_LARGE';
  end if;

  if v_status = 'published'
     and not public.organization_is_operational(p_organization_id) then
    raise exception 'ORG_NOT_ACTIVE';
  end if;

  v_payload_hash := md5(
    p_organization_id::text
    || '|' || v_status
    || '|' || v_mode
    || '|' || p_shifts::text
  );

  select * into v_existing
  from public.shift_creation_batches
  where organization_id = p_organization_id
    and request_key = v_key;

  if found then
    if v_existing.payload_hash is distinct from v_payload_hash then
      raise exception 'REQUEST_KEY_CONFLICT';
    end if;

    select coalesce(array_agg(s.id order by s.created_at, s.id), array[]::uuid[])
    into v_shift_ids
    from public.shifts s
    where s.creation_batch_id = v_existing.id;

    return jsonb_build_object(
      'batch_id', v_existing.id,
      'shift_ids', to_jsonb(v_shift_ids),
      'shift_count', v_existing.shift_count,
      'requested_status', v_existing.requested_status,
      'creation_mode', v_existing.creation_mode,
      'idempotent_replay', true
    );
  end if;

  for v_idx in 0 .. (v_count - 1) loop
    v_row := p_shifts -> v_idx;

    if v_row is null or jsonb_typeof(v_row) <> 'object' then
      raise exception 'BULK_ROW_ERROR' using
        detail = format('rowIndex=%s field=row message=Invalid shift row', v_idx);
    end if;

    begin
      v_location_id := (v_row ->> 'location_id')::uuid;
    exception when others then
      raise exception 'BULK_ROW_ERROR' using
        detail = format('rowIndex=%s field=location_id message=Invalid location', v_idx);
    end;

    if v_location_id is null then
      raise exception 'BULK_ROW_ERROR' using
        detail = format('rowIndex=%s field=location_id message=Location is required', v_idx);
    end if;

    select organization_id into v_loc_org
    from public.locations
    where id = v_location_id;

    if v_loc_org is null or v_loc_org <> p_organization_id then
      raise exception 'BULK_ROW_ERROR' using
        detail = format(
          'rowIndex=%s field=location_id message=Location not found in this organization',
          v_idx
        );
    end if;

    v_ward_id := null;
    if v_row ? 'ward_id'
       and v_row ->> 'ward_id' is not null
       and trim(v_row ->> 'ward_id') <> ''
       and lower(v_row ->> 'ward_id') <> 'null' then
      begin
        v_ward_id := (v_row ->> 'ward_id')::uuid;
      exception when others then
        raise exception 'BULK_ROW_ERROR' using
          detail = format('rowIndex=%s field=ward_id message=Invalid ward', v_idx);
      end;

      if not exists (
        select 1
        from public.wards w
        join public.locations l on l.id = w.location_id
        where w.id = v_ward_id
          and l.id = v_location_id
          and l.organization_id = p_organization_id
      ) then
        raise exception 'BULK_ROW_ERROR' using
          detail = format(
            'rowIndex=%s field=ward_id message=Ward does not belong to this location',
            v_idx
          );
      end if;
    end if;

    v_required_role := trim(coalesce(v_row ->> 'required_role', ''));
    if v_required_role not in ('registered_nurse', 'ward_assistant', 'physiotherapist') then
      raise exception 'BULK_ROW_ERROR' using
        detail = format(
          'rowIndex=%s field=required_role message=Select a valid worker role',
          v_idx
        );
    end if;

    begin
      v_starts_at := (v_row ->> 'starts_at')::timestamptz;
      v_ends_at := (v_row ->> 'ends_at')::timestamptz;
    exception when others then
      raise exception 'BULK_ROW_ERROR' using
        detail = format('rowIndex=%s field=starts_at message=Invalid start or end time', v_idx);
    end;

    if v_starts_at is null or v_ends_at is null then
      raise exception 'BULK_ROW_ERROR' using
        detail = format('rowIndex=%s field=starts_at message=Start and end times are required', v_idx);
    end if;

    if v_ends_at <= v_starts_at then
      raise exception 'BULK_ROW_ERROR' using
        detail = format('rowIndex=%s field=ends_at message=End must be after start', v_idx);
    end if;

    begin
      v_break_minutes := coalesce((v_row ->> 'break_minutes')::integer, 0);
    exception when others then
      raise exception 'BULK_ROW_ERROR' using
        detail = format('rowIndex=%s field=break_minutes message=Invalid break minutes', v_idx);
    end;

    if v_break_minutes < 0 then
      raise exception 'BULK_ROW_ERROR' using
        detail = format('rowIndex=%s field=break_minutes message=Break minutes cannot be negative', v_idx);
    end if;

    begin
      v_rate_minor := (v_row ->> 'rate_minor')::integer;
    exception when others then
      raise exception 'BULK_ROW_ERROR' using
        detail = format('rowIndex=%s field=rate_minor message=Invalid hourly rate', v_idx);
    end;

    if v_rate_minor is null or v_rate_minor <= 0 then
      raise exception 'BULK_ROW_ERROR' using
        detail = format('rowIndex=%s field=rate_minor message=Hourly rate must be positive', v_idx);
    end if;

    v_currency := upper(trim(coalesce(nullif(v_row ->> 'currency', ''), 'EUR')));
    if char_length(v_currency) <> 3 then
      raise exception 'BULK_ROW_ERROR' using
        detail = format('rowIndex=%s field=currency message=Invalid currency', v_idx);
    end if;

    v_deadline := null;
    if v_row ? 'acceptance_deadline'
       and v_row ->> 'acceptance_deadline' is not null
       and trim(v_row ->> 'acceptance_deadline') <> ''
       and lower(v_row ->> 'acceptance_deadline') <> 'null' then
      begin
        v_deadline := (v_row ->> 'acceptance_deadline')::timestamptz;
      exception when others then
        raise exception 'BULK_ROW_ERROR' using
          detail = format(
            'rowIndex=%s field=acceptance_deadline message=Invalid acceptance deadline',
            v_idx
          );
      end;

      if v_deadline >= v_starts_at then
        raise exception 'BULK_ROW_ERROR' using
          detail = format(
            'rowIndex=%s field=acceptance_deadline message=Deadline must be before shift start',
            v_idx
          );
      end if;

      if v_status = 'published' and v_deadline <= now() then
        raise exception 'BULK_ROW_ERROR' using
          detail = format(
            'rowIndex=%s field=acceptance_deadline message=Deadline must be in the future to publish',
            v_idx
          );
      end if;
    end if;

    if v_status = 'published' and v_ends_at <= now() then
      raise exception 'BULK_ROW_ERROR' using
        detail = format(
          'rowIndex=%s field=ends_at message=Cannot publish a shift that has already ended',
          v_idx
        );
    end if;

    v_title := nullif(trim(coalesce(v_row ->> 'title', '')), '');
    if v_title is not null and char_length(v_title) > 200 then
      raise exception 'BULK_ROW_ERROR' using
        detail = format('rowIndex=%s field=title message=Title is too long', v_idx);
    end if;

    v_notes := nullif(trim(coalesce(v_row ->> 'notes', '')), '');
    if v_notes is not null and char_length(v_notes) > 4000 then
      raise exception 'BULK_ROW_ERROR' using
        detail = format('rowIndex=%s field=notes message=Notes are too long', v_idx);
    end if;

    begin
      v_required_positions := coalesce((v_row ->> 'required_positions')::integer, 1);
    exception when others then
      raise exception 'BULK_ROW_ERROR' using
        detail = format(
          'rowIndex=%s field=required_positions message=Positions must be a whole number from 1 to 100',
          v_idx
        );
    end;

    if v_required_positions < 1 or v_required_positions > 100 then
      raise exception 'BULK_ROW_ERROR' using
        detail = format(
          'rowIndex=%s field=required_positions message=Positions must be between 1 and 100',
          v_idx
        );
    end if;
  end loop;

  insert into public.shift_creation_batches (
    organization_id,
    created_by,
    request_key,
    creation_mode,
    requested_status,
    shift_count,
    payload_hash
  )
  values (
    p_organization_id,
    v_uid,
    v_key,
    v_mode,
    v_status,
    v_count,
    v_payload_hash
  )
  returning id into v_batch_id;

  for v_idx in 0 .. (v_count - 1) loop
    v_row := p_shifts -> v_idx;
    v_location_id := (v_row ->> 'location_id')::uuid;
    v_ward_id := null;
    if v_row ? 'ward_id'
       and v_row ->> 'ward_id' is not null
       and trim(v_row ->> 'ward_id') <> ''
       and lower(v_row ->> 'ward_id') <> 'null' then
      v_ward_id := (v_row ->> 'ward_id')::uuid;
    end if;
    v_required_role := trim(v_row ->> 'required_role');
    v_starts_at := (v_row ->> 'starts_at')::timestamptz;
    v_ends_at := (v_row ->> 'ends_at')::timestamptz;
    v_break_minutes := coalesce((v_row ->> 'break_minutes')::integer, 0);
    v_rate_minor := (v_row ->> 'rate_minor')::integer;
    v_currency := upper(trim(coalesce(nullif(v_row ->> 'currency', ''), 'EUR')));
    v_deadline := null;
    if v_row ? 'acceptance_deadline'
       and v_row ->> 'acceptance_deadline' is not null
       and trim(v_row ->> 'acceptance_deadline') <> ''
       and lower(v_row ->> 'acceptance_deadline') <> 'null' then
      v_deadline := (v_row ->> 'acceptance_deadline')::timestamptz;
    end if;
    v_title := nullif(trim(coalesce(v_row ->> 'title', '')), '');
    v_notes := nullif(trim(coalesce(v_row ->> 'notes', '')), '');
    v_required_positions := coalesce((v_row ->> 'required_positions')::integer, 1);
    v_requirements := case
      when jsonb_typeof(v_row -> 'requirements') = 'array' then v_row -> 'requirements'
      else '[]'::jsonb
    end;

    insert into public.shifts (
      organization_id,
      location_id,
      ward_id,
      required_role,
      starts_at,
      ends_at,
      break_minutes,
      rate_minor,
      currency,
      status,
      acceptance_deadline,
      title,
      notes,
      required_positions,
      created_by,
      creation_batch_id
    )
    values (
      p_organization_id,
      v_location_id,
      v_ward_id,
      v_required_role::public.worker_role,
      v_starts_at,
      v_ends_at,
      v_break_minutes,
      v_rate_minor,
      v_currency,
      'draft',
      v_deadline,
      v_title,
      v_notes,
      v_required_positions,
      v_uid,
      v_batch_id
    )
    returning id into v_shift_id;

    for v_req in select * from jsonb_array_elements(v_requirements)
    loop
      if jsonb_typeof(v_req) = 'object'
         and nullif(trim(coalesce(v_req ->> 'requirement_type', '')), '') is not null then
        insert into public.shift_requirements (shift_id, requirement_type, required)
        values (
          v_shift_id,
          trim(v_req ->> 'requirement_type'),
          coalesce((v_req ->> 'required')::boolean, true)
        )
        on conflict (shift_id, requirement_type) do nothing;
      end if;
    end loop;

    if v_status = 'published' then
      perform public.publish_shift(v_shift_id);
    end if;

    v_shift_ids := array_append(v_shift_ids, v_shift_id);
  end loop;

  perform public.create_audit_event(
    p_organization_id,
    'shift_creation_batch',
    v_batch_id,
    'bulk_shifts_created',
    null,
    jsonb_build_object(
      'shift_count', v_count,
      'requested_status', v_status,
      'creation_mode', v_mode
    )
  );

  return jsonb_build_object(
    'batch_id', v_batch_id,
    'shift_ids', to_jsonb(v_shift_ids),
    'shift_count', v_count,
    'requested_status', v_status,
    'creation_mode', v_mode,
    'idempotent_replay', false
  );
end;
$$;

revoke all on function public.create_shifts_batch(uuid, text, text, text, jsonb) from public;
grant execute on function public.create_shifts_batch(uuid, text, text, text, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- 7. Worker shift details — surface capacity for marketplace UI
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
  open_positions integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_worker_role public.worker_role;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select wp.worker_role into v_worker_role
  from public.worker_profiles wp
  where wp.user_id = auth.uid();

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
    s.required_positions,
    public.shift_open_positions(s.id) as open_positions
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
    );
end;
$$;

revoke all on function public.get_worker_shift_details(uuid) from public;
grant execute on function public.get_worker_shift_details(uuid) to authenticated;

