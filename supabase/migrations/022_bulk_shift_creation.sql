-- 022_bulk_shift_creation.sql
-- Finite preview-first multi-shift creation: shift_creation_batches + create_shifts_batch RPC.
-- All-or-nothing inserts; idempotent by (organization_id, request_key).

-- ---------------------------------------------------------------------------
-- 1. Batches table
-- ---------------------------------------------------------------------------

create table public.shift_creation_batches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  created_by uuid not null references public.profiles (id) on delete restrict,
  request_key text not null,
  creation_mode text not null,
  requested_status text not null,
  shift_count integer not null,
  payload_hash text not null,
  created_at timestamptz not null default now(),
  constraint shift_creation_batches_request_key_nonempty
    check (char_length(trim(request_key)) > 0 and char_length(request_key) <= 128),
  constraint shift_creation_batches_mode_valid
    check (creation_mode in ('repeat', 'individual', 'custom')),
  constraint shift_creation_batches_status_valid
    check (requested_status in ('draft', 'published')),
  constraint shift_creation_batches_count_bounds
    check (shift_count >= 2 and shift_count <= 100),
  constraint shift_creation_batches_org_request_key_unique
    unique (organization_id, request_key)
);

create index shift_creation_batches_org_created_idx
  on public.shift_creation_batches (organization_id, created_at desc);

alter table public.shift_creation_batches enable row level security;

create policy "shift_creation_batches_select_org_member"
on public.shift_creation_batches
for select
to authenticated
using (public.is_org_member(organization_id));

-- No direct client insert/update/delete — RPC only.
revoke insert, update, delete on table public.shift_creation_batches from authenticated;
grant select on table public.shift_creation_batches to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Link shifts → batch (nullable FK for filter/audit)
-- ---------------------------------------------------------------------------

alter table public.shifts
  add column if not exists creation_batch_id uuid
    references public.shift_creation_batches (id) on delete set null;

create index if not exists shifts_creation_batch_id_idx
  on public.shifts (creation_batch_id)
  where creation_batch_id is not null;

-- ---------------------------------------------------------------------------
-- 3. create_shifts_batch RPC
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

  -- Cap payload size (~256 KiB) to bound memory/CPU.
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

  -- Validate every row before any insert (all-or-nothing).
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
    if v_required_role not in ('registered_nurse', 'ward_assistant') then
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
