-- 034_worker_push_notifications.sql
-- Phase 1 worker shift alerts.
-- Migration 031 is already shift capacity, so this forward migration is 034.
-- Database work records an outbox only. No HTTP calls are made from triggers.
-- Expo Push API requests are sent later by trusted server code.

-- ---------------------------------------------------------------------------
-- Device tokens. Workers manage only their own rows through RPCs.
-- ---------------------------------------------------------------------------

create table public.worker_push_devices (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references public.worker_profiles (user_id) on delete cascade,
  expo_push_token text not null,
  platform text not null,
  notification_enabled boolean not null default true,
  app_version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz,
  invalidated_at timestamptz,
  constraint worker_push_devices_platform_check check (platform in ('ios', 'android')),
  constraint worker_push_devices_token_format check (
    expo_push_token ~ '^Expo(nent)?PushToken\[[^[:space:]\]]{16,180}\]$'
  ),
  constraint worker_push_devices_token_unique unique (expo_push_token)
);

create unique index worker_push_devices_one_active_token
  on public.worker_push_devices (expo_push_token)
  where invalidated_at is null;

create index worker_push_devices_worker_active_idx
  on public.worker_push_devices (worker_id)
  where invalidated_at is null;

create trigger worker_push_devices_set_updated_at
before update on public.worker_push_devices
for each row
execute function public.set_updated_at();

comment on table public.worker_push_devices is
  'Expo push tokens owned by verified workers. Organizations cannot read this table.';

-- ---------------------------------------------------------------------------
-- Outbox: one publication event, then one delivery per live device.
-- ---------------------------------------------------------------------------

create table public.worker_notification_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null default 'shift_published',
  shift_id uuid not null references public.shifts (id) on delete cascade,
  publication_key text not null,
  created_at timestamptz not null default now(),
  constraint worker_notification_events_type_check check (event_type = 'shift_published'),
  constraint worker_notification_events_key_nonempty check (char_length(trim(publication_key)) > 0),
  constraint worker_notification_events_shift_publication_unique unique (shift_id, publication_key)
);

create index worker_notification_events_shift_idx
  on public.worker_notification_events (shift_id, created_at desc);

create table public.worker_notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.worker_notification_events (id) on delete cascade,
  worker_id uuid not null references public.worker_profiles (user_id) on delete cascade,
  device_id uuid not null references public.worker_push_devices (id) on delete cascade,
  status text not null default 'pending',
  expo_ticket_id text,
  receipt_status text,
  receipt_error text,
  attempts integer not null default 0,
  next_attempt_at timestamptz,
  sent_at timestamptz,
  receipt_checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint worker_notification_deliveries_status_check
    check (status in ('pending', 'sent', 'failed', 'invalid')),
  constraint worker_notification_deliveries_attempts_check check (attempts >= 0),
  constraint worker_notification_deliveries_event_device_unique unique (event_id, device_id)
);

create index worker_notification_deliveries_pending_idx
  on public.worker_notification_deliveries (next_attempt_at, created_at)
  where status = 'pending';

create index worker_notification_deliveries_receipt_idx
  on public.worker_notification_deliveries (sent_at)
  where status = 'sent' and expo_ticket_id is not null and receipt_checked_at is null;

create trigger worker_notification_deliveries_set_updated_at
before update on public.worker_notification_deliveries
for each row
execute function public.set_updated_at();

create unique index notifications_shift_published_once
  on public.notifications (user_id, ((data ->> 'shiftId')))
  where type = 'shift_published';

comment on table public.worker_notification_events is
  'One row per shift publication. Created only on draft -> published, never for drafts.';

comment on table public.worker_notification_deliveries is
  'Push outbox. Server code sends these to Expo. Clients cannot read tokens or tickets.';

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.worker_push_devices enable row level security;
alter table public.worker_notification_events enable row level security;
alter table public.worker_notification_deliveries enable row level security;

create policy "worker_push_devices_select_own"
on public.worker_push_devices
for select
to authenticated
using (worker_id = auth.uid());

revoke all on table public.worker_push_devices from public, anon, authenticated;
grant select on table public.worker_push_devices to authenticated;
grant select, insert, update on table public.worker_push_devices to service_role;

revoke all on table public.worker_notification_events from public, anon, authenticated;
revoke all on table public.worker_notification_deliveries from public, anon, authenticated;
grant select, insert, update on table public.worker_notification_events to service_role;
grant select, insert, update on table public.worker_notification_deliveries to service_role;

-- ---------------------------------------------------------------------------
-- Copy helpers
-- ---------------------------------------------------------------------------

create or replace function public.format_shift_published_notification(p_shift_id uuid)
returns table (
  title text,
  body text,
  open_positions integer
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_shift public.shifts;
  v_tz text;
  v_place text;
  v_open integer;
  v_start timestamp;
  v_end timestamp;
  v_role text;
  v_rate text;
  v_months text[] := array[
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
begin
  select * into v_shift
  from public.shifts
  where id = p_shift_id;

  if not found or v_shift.status <> 'published' then
    return;
  end if;

  v_open := public.shift_open_positions(v_shift.id);
  if v_open < 1 then
    return;
  end if;

  select
    coalesce(nullif(trim(l.timezone), ''), nullif(trim(o.timezone), ''), 'Europe/Nicosia'),
    coalesce(nullif(trim(w.name), ''), nullif(trim(l.name), ''))
  into v_tz, v_place
  from public.locations l
  join public.organizations o on o.id = l.organization_id
  left join public.wards w on w.id = v_shift.ward_id
  where l.id = v_shift.location_id;

  if v_place is null then
    return;
  end if;

  begin
    v_start := v_shift.starts_at at time zone v_tz;
    v_end := v_shift.ends_at at time zone v_tz;
  exception when others then
    v_tz := 'Europe/Nicosia';
    v_start := v_shift.starts_at at time zone v_tz;
    v_end := v_shift.ends_at at time zone v_tz;
  end;

  v_role := case v_shift.required_role
    when 'registered_nurse' then 'Registered Nurse'
    when 'ward_assistant' then 'Ward Assistant'
    when 'physiotherapist' then 'Physiotherapist'
    else null
  end;

  if v_role is null then
    return;
  end if;

  if v_shift.rate_minor % 100 = 0 then
    v_rate := (v_shift.rate_minor / 100)::text;
  else
    v_rate := rtrim(rtrim(
      (v_shift.rate_minor / 100)::text || '.' || lpad((v_shift.rate_minor % 100)::text, 2, '0'),
      '0'
    ), '.');
  end if;

  title := 'New ' || v_role || ' shift';
  body :=
    extract(day from v_start)::integer::text || ' ' ||
    v_months[extract(month from v_start)::integer] ||
    ' · ' || to_char(v_start, 'HH24:MI') || '–' || to_char(v_end, 'HH24:MI') ||
    ' · ' || v_place ||
    ' · ' || case when v_open = 1 then '1 position open' else v_open::text || ' positions open' end ||
    ' · €' || v_rate || '/hour';
  open_positions := v_open;
  return next;
end;
$$;

revoke all on function public.format_shift_published_notification(uuid) from public, anon, authenticated;
grant execute on function public.format_shift_published_notification(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- Enqueue. Idempotent per shift publication. Never raises to the publisher.
-- ---------------------------------------------------------------------------

create or replace function public.enqueue_shift_published_notification(p_shift_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_shift public.shifts;
  v_title text;
  v_body text;
  v_open integer;
  v_event_id uuid;
  v_data jsonb;
begin
  select * into v_shift
  from public.shifts
  where id = p_shift_id
  for update;

  if not found or v_shift.status <> 'published' then
    return null;
  end if;

  if not public.organization_is_operational(v_shift.organization_id) then
    return null;
  end if;

  select f.title, f.body, f.open_positions
  into v_title, v_body, v_open
  from public.format_shift_published_notification(v_shift.id) f;

  if v_title is null or v_open is null or v_open < 1 then
    return null;
  end if;

  insert into public.worker_notification_events (shift_id, event_type, publication_key)
  values (v_shift.id, 'shift_published', 'initial')
  on conflict (shift_id, publication_key) do nothing
  returning id into v_event_id;

  if v_event_id is null then
    select id into v_event_id
    from public.worker_notification_events
    where shift_id = v_shift.id
      and publication_key = 'initial';
    return v_event_id;
  end if;

  v_data := jsonb_build_object(
    'type', 'shift_published',
    'shiftId', v_shift.id::text,
    'url', 'bridgehive://shifts/' || v_shift.id::text
  );

  insert into public.notifications (user_id, type, title, body, data)
  select
    wp.user_id,
    'shift_published',
    v_title,
    v_body,
    v_data
  from public.worker_profiles wp
  join public.profiles p on p.id = wp.user_id
  where wp.worker_role = v_shift.required_role
    and wp.verification_status = 'verified'
    and p.account_status = 'active'
    and not (
      exists (
        select 1
        from public.worker_push_devices d
        where d.worker_id = wp.user_id
      )
      and not exists (
        select 1
        from public.worker_push_devices d
        where d.worker_id = wp.user_id
          and d.notification_enabled
      )
    )
    and not exists (
      select 1
      from public.notifications n
      where n.user_id = wp.user_id
        and n.type = 'shift_published'
        and n.data ->> 'shiftId' = v_shift.id::text
    );

  insert into public.worker_notification_deliveries (event_id, worker_id, device_id, status)
  select v_event_id, d.worker_id, d.id, 'pending'
  from public.worker_push_devices d
  join public.worker_profiles wp on wp.user_id = d.worker_id
  join public.profiles p on p.id = wp.user_id
  where d.invalidated_at is null
    and d.notification_enabled
    and wp.worker_role = v_shift.required_role
    and wp.verification_status = 'verified'
    and p.account_status = 'active'
  on conflict (event_id, device_id) do nothing;

  return v_event_id;
end;
$$;

revoke all on function public.enqueue_shift_published_notification(uuid) from public, anon, authenticated;
grant execute on function public.enqueue_shift_published_notification(uuid) to service_role;

create or replace function public.shifts_enqueue_published_notifications()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE'
     and old.status is distinct from new.status
     and old.status = 'draft'
     and new.status = 'published' then
    begin
      perform public.enqueue_shift_published_notification(new.id);
    exception when others then
      raise warning 'shift_published_notification_enqueue_failed:%', new.id;
    end;
  end if;
  return new;
end;
$$;

revoke all on function public.shifts_enqueue_published_notifications() from public, anon, authenticated;

drop trigger if exists shifts_enqueue_published_notifications on public.shifts;
create trigger shifts_enqueue_published_notifications
after update of status on public.shifts
for each row
execute function public.shifts_enqueue_published_notifications();

-- ---------------------------------------------------------------------------
-- Worker token RPCs
-- ---------------------------------------------------------------------------

create or replace function public.register_worker_push_device(
  p_expo_push_token text,
  p_platform text,
  p_app_version text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_token text := trim(coalesce(p_expo_push_token, ''));
  v_platform text := lower(trim(coalesce(p_platform, '')));
  v_version text := nullif(trim(coalesce(p_app_version, '')), '');
  v_id uuid;
  v_owner uuid;
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if not exists (select 1 from public.worker_profiles where user_id = v_uid) then
    raise exception 'WORKER_PROFILE_REQUIRED';
  end if;

  if v_platform not in ('ios', 'android') then
    raise exception 'INVALID_PLATFORM';
  end if;

  if v_token !~ '^Expo(nent)?PushToken\[[^[:space:]\]]{16,180}\]$' then
    raise exception 'INVALID_PUSH_TOKEN';
  end if;

  if v_version is not null and char_length(v_version) > 32 then
    v_version := left(v_version, 32);
  end if;

  select id, worker_id into v_id, v_owner
  from public.worker_push_devices
  where expo_push_token = v_token
  for update;

  if found and v_owner = v_uid then
    update public.worker_push_devices
    set
      platform = v_platform,
      app_version = v_version,
      invalidated_at = null,
      last_seen_at = now()
    where id = v_id;
  elsif found then
    update public.worker_push_devices
    set
      worker_id = v_uid,
      platform = v_platform,
      app_version = v_version,
      notification_enabled = true,
      invalidated_at = null,
      last_seen_at = now()
    where id = v_id;
  else
    insert into public.worker_push_devices (
      worker_id,
      expo_push_token,
      platform,
      notification_enabled,
      app_version,
      last_seen_at
    )
    values (v_uid, v_token, v_platform, true, v_version, now())
    returning id into v_id;
  end if;

  update public.worker_push_devices
  set invalidated_at = now()
  where worker_id = v_uid
    and platform = v_platform
    and id <> v_id
    and invalidated_at is null;

  return v_id;
end;
$$;

create or replace function public.touch_worker_push_device(p_expo_push_token text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  update public.worker_push_devices
  set last_seen_at = now()
  where worker_id = v_uid
    and expo_push_token = trim(coalesce(p_expo_push_token, ''))
    and invalidated_at is null;
end;
$$;

create or replace function public.deactivate_worker_push_device(p_expo_push_token text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  update public.worker_push_devices
  set invalidated_at = now()
  where worker_id = v_uid
    and expo_push_token = trim(coalesce(p_expo_push_token, ''))
    and invalidated_at is null;
end;
$$;

create or replace function public.set_worker_push_preference(p_enabled boolean)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_enabled boolean := coalesce(p_enabled, false);
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  update public.worker_push_devices
  set notification_enabled = v_enabled
  where worker_id = v_uid
    and invalidated_at is null;

  return v_enabled;
end;
$$;

create or replace function public.get_worker_push_preference()
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_enabled boolean;
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select d.notification_enabled into v_enabled
  from public.worker_push_devices d
  where d.worker_id = v_uid
    and d.invalidated_at is null
  order by d.last_seen_at desc nulls last, d.updated_at desc
  limit 1;

  return v_enabled;
end;
$$;

revoke all on function public.register_worker_push_device(text, text, text) from public, anon;
revoke all on function public.touch_worker_push_device(text) from public, anon;
revoke all on function public.deactivate_worker_push_device(text) from public, anon;
revoke all on function public.set_worker_push_preference(boolean) from public, anon;
revoke all on function public.get_worker_push_preference() from public, anon;

grant execute on function public.register_worker_push_device(text, text, text) to authenticated;
grant execute on function public.touch_worker_push_device(text) to authenticated;
grant execute on function public.deactivate_worker_push_device(text) to authenticated;
grant execute on function public.set_worker_push_preference(boolean) to authenticated;
grant execute on function public.get_worker_push_preference() to authenticated;

-- ---------------------------------------------------------------------------
-- Server-only delivery claim, send results, and receipts
-- ---------------------------------------------------------------------------

create or replace function public.push_retry_delay_seconds(p_attempts integer)
returns integer
language sql
immutable
as $$
  select least(3600, power(2, least(greatest(coalesce(p_attempts, 1), 1), 12))::integer);
$$;

revoke all on function public.push_retry_delay_seconds(integer) from public, anon, authenticated;
grant execute on function public.push_retry_delay_seconds(integer) to service_role;

create or replace function public.safe_push_error(p_error text)
returns text
language sql
immutable
as $$
  select left(
    regexp_replace(
      coalesce(p_error, ''),
      'Expo(nent)?PushToken\[[^]]+\]',
      '[token]',
      'gi'
    ),
    300
  );
$$;

revoke all on function public.safe_push_error(text) from public, anon, authenticated;
grant execute on function public.safe_push_error(text) to service_role;

create or replace function public.claim_worker_push_deliveries(p_limit integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit integer := least(greatest(coalesce(p_limit, 1), 1), 100);
  v_ids uuid[];
begin
  update public.worker_notification_deliveries d
  set
    status = 'invalid',
    receipt_error = 'token_inactive',
    updated_at = now()
  where d.status = 'pending'
    and exists (
      select 1
      from public.worker_push_devices dev
      where dev.id = d.device_id
        and (dev.invalidated_at is not null or not dev.notification_enabled)
    );

  update public.worker_notification_deliveries d
  set
    status = 'invalid',
    receipt_error = 'shift_unavailable',
    updated_at = now()
  from public.worker_notification_events e
  join public.shifts s on s.id = e.shift_id
  where d.event_id = e.id
    and d.status = 'pending'
    and (
      s.status <> 'published'
      or public.shift_open_positions(s.id) <= 0
      or not public.organization_is_operational(s.organization_id)
      or not exists (
        select 1
        from public.worker_profiles wp
        join public.profiles p on p.id = wp.user_id
        where wp.user_id = d.worker_id
          and wp.verification_status = 'verified'
          and p.account_status = 'active'
          and wp.worker_role = s.required_role
      )
    );

  with candidate as (
    select d.id
    from public.worker_notification_deliveries d
    join public.worker_push_devices dev on dev.id = d.device_id
    join public.worker_notification_events e on e.id = d.event_id
    join public.shifts s on s.id = e.shift_id
    where d.status = 'pending'
      and d.attempts < 8
      and (d.next_attempt_at is null or d.next_attempt_at <= now())
      and dev.invalidated_at is null
      and dev.notification_enabled
      and s.status = 'published'
      and public.shift_open_positions(s.id) > 0
    order by d.created_at
    limit v_limit
    for update of d skip locked
  ),
  claimed as (
    update public.worker_notification_deliveries d
    set
      attempts = d.attempts + 1,
      next_attempt_at = now() + interval '2 minutes',
      updated_at = now()
    from candidate c
    where d.id = c.id
    returning d.id
  )
  select coalesce(array_agg(claimed.id), array[]::uuid[])
  into v_ids
  from claimed;

  return coalesce(
    (
      select jsonb_agg(to_jsonb(claimed_row))
      from (
        select
          d.id as "deliveryId",
          dev.expo_push_token as "expoPushToken",
          e.shift_id as "shiftId",
          public.shift_open_positions(s.id) as "openPositions",
          s.status,
          s.starts_at as "startsAt",
          s.ends_at as "endsAt",
          coalesce(nullif(trim(l.timezone), ''), nullif(trim(o.timezone), ''), 'Europe/Nicosia') as "timeZone",
          coalesce(nullif(trim(w.name), ''), nullif(trim(l.name), '')) as place,
          s.required_role as "requiredRole",
          s.rate_minor as "rateMinor",
          s.currency
        from public.worker_notification_deliveries d
        join public.worker_push_devices dev on dev.id = d.device_id
        join public.worker_notification_events e on e.id = d.event_id
        join public.shifts s on s.id = e.shift_id
        join public.locations l on l.id = s.location_id
        join public.organizations o on o.id = s.organization_id
        left join public.wards w on w.id = s.ward_id
        where d.id = any (v_ids)
          and s.status = 'published'
          and public.shift_open_positions(s.id) > 0
      ) claimed_row
    ),
    '[]'::jsonb
  );
end;
$$;

revoke all on function public.claim_worker_push_deliveries(integer) from public, anon, authenticated;
grant execute on function public.claim_worker_push_deliveries(integer) to service_role;

create or replace function public.apply_worker_push_send_results(p_results jsonb)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row jsonb;
  v_id uuid;
  v_outcome text;
  v_error text;
  v_ticket text;
  v_attempts integer;
  v_device uuid;
  v_count integer := 0;
begin
  if p_results is null or jsonb_typeof(p_results) <> 'array' then
    return 0;
  end if;

  for v_row in select value from jsonb_array_elements(p_results)
  loop
    begin
      v_id := (v_row ->> 'deliveryId')::uuid;
    exception when others then
      continue;
    end;

    v_outcome := lower(trim(coalesce(v_row ->> 'outcome', '')));
    v_error := public.safe_push_error(v_row ->> 'error');
    v_ticket := nullif(left(trim(coalesce(v_row ->> 'ticketId', '')), 200), '');

    select attempts, device_id into v_attempts, v_device
    from public.worker_notification_deliveries
    where id = v_id
      and status = 'pending'
    for update;

    if not found then
      continue;
    end if;

    if v_outcome = 'sent' and v_ticket is not null then
      update public.worker_notification_deliveries
      set
        status = 'sent',
        expo_ticket_id = v_ticket,
        sent_at = now(),
        receipt_error = null,
        updated_at = now()
      where id = v_id;
    elsif v_outcome = 'invalid' then
      update public.worker_notification_deliveries
      set
        status = 'invalid',
        receipt_error = nullif(v_error, ''),
        updated_at = now()
      where id = v_id;

      if v_error = 'DeviceNotRegistered' then
        update public.worker_push_devices
        set invalidated_at = coalesce(invalidated_at, now())
        where id = v_device;
      end if;
    elsif v_outcome = 'retry' and v_attempts < 8 then
      update public.worker_notification_deliveries
      set
        status = 'pending',
        receipt_error = nullif(v_error, ''),
        next_attempt_at = now() + make_interval(secs => public.push_retry_delay_seconds(v_attempts)),
        updated_at = now()
      where id = v_id;
    else
      update public.worker_notification_deliveries
      set
        status = 'failed',
        receipt_error = nullif(v_error, ''),
        updated_at = now()
      where id = v_id;
    end if;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.apply_worker_push_send_results(jsonb) from public, anon, authenticated;
grant execute on function public.apply_worker_push_send_results(jsonb) to service_role;

create or replace function public.list_worker_push_receipt_candidates(p_limit integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit integer := least(greatest(coalesce(p_limit, 1), 1), 100);
begin
  return coalesce(
    (
      select jsonb_agg(to_jsonb(receipt_row))
      from (
        select
          d.id as "deliveryId",
          d.expo_ticket_id as "ticketId"
        from public.worker_notification_deliveries d
        where d.status = 'sent'
          and d.expo_ticket_id is not null
          and d.receipt_checked_at is null
          and d.sent_at is not null
          and d.sent_at <= now() - interval '15 minutes'
        order by d.sent_at
        limit v_limit
      ) receipt_row
    ),
    '[]'::jsonb
  );
end;
$$;

revoke all on function public.list_worker_push_receipt_candidates(integer) from public, anon, authenticated;
grant execute on function public.list_worker_push_receipt_candidates(integer) to service_role;

create or replace function public.apply_worker_push_receipts(p_results jsonb)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row jsonb;
  v_id uuid;
  v_status text;
  v_error text;
  v_device uuid;
  v_attempts integer;
  v_count integer := 0;
begin
  if p_results is null or jsonb_typeof(p_results) <> 'array' then
    return 0;
  end if;

  for v_row in select value from jsonb_array_elements(p_results)
  loop
    begin
      v_id := (v_row ->> 'deliveryId')::uuid;
    exception when others then
      continue;
    end;

    v_status := lower(trim(coalesce(v_row ->> 'receiptStatus', '')));
    v_error := public.safe_push_error(v_row ->> 'receiptError');

    select device_id, attempts into v_device, v_attempts
    from public.worker_notification_deliveries
    where id = v_id
      and status = 'sent'
      and receipt_checked_at is null
    for update;

    if not found then
      continue;
    end if;

    if v_status = 'ok' then
      update public.worker_notification_deliveries
      set
        receipt_status = 'ok',
        receipt_error = null,
        receipt_checked_at = now(),
        updated_at = now()
      where id = v_id;
    elsif v_error = 'DeviceNotRegistered' then
      update public.worker_notification_deliveries
      set
        status = 'invalid',
        receipt_status = 'error',
        receipt_error = 'DeviceNotRegistered',
        receipt_checked_at = now(),
        updated_at = now()
      where id = v_id;

      update public.worker_push_devices
      set invalidated_at = coalesce(invalidated_at, now())
      where id = v_device;
    elsif v_error = 'MessageRateExceeded' and v_attempts < 8 then
      update public.worker_notification_deliveries
      set
        status = 'pending',
        expo_ticket_id = null,
        receipt_status = null,
        receipt_error = 'MessageRateExceeded',
        receipt_checked_at = null,
        next_attempt_at = now() + make_interval(secs => public.push_retry_delay_seconds(v_attempts)),
        updated_at = now()
      where id = v_id;
    else
      update public.worker_notification_deliveries
      set
        status = 'failed',
        receipt_status = 'error',
        receipt_error = nullif(v_error, ''),
        receipt_checked_at = now(),
        updated_at = now()
      where id = v_id;
    end if;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.apply_worker_push_receipts(jsonb) from public, anon, authenticated;
grant execute on function public.apply_worker_push_receipts(jsonb) to service_role;

-- ---------------------------------------------------------------------------
-- Inbox availability and shift detail eligibility
-- ---------------------------------------------------------------------------

create or replace function public.get_my_shift_alert_availability(p_shift_ids uuid[])
returns table (
  shift_id uuid,
  available boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_role public.worker_role;
  v_verified boolean := false;
  v_active boolean := false;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if p_shift_ids is null or cardinality(p_shift_ids) = 0 then
    return;
  end if;

  if cardinality(p_shift_ids) > 50 then
    raise exception 'TOO_MANY_IDS';
  end if;

  select
    wp.worker_role,
    wp.verification_status = 'verified',
    p.account_status = 'active'
  into v_role, v_verified, v_active
  from public.worker_profiles wp
  join public.profiles p on p.id = wp.user_id
  where wp.user_id = auth.uid();

  return query
  select
    ids.id,
    coalesce(match.ok, false)
  from unnest(p_shift_ids) as ids (id)
  left join lateral (
    select true as ok
    from public.shifts s
    where s.id = ids.id
      and (
        exists (
          select 1
          from public.shift_assignments sa
          where sa.shift_id = s.id
            and sa.worker_id = auth.uid()
            and sa.status in (
              'accepted', 'checked_in', 'checked_out', 'submitted', 'approved'
            )
        )
        or (
          v_verified
          and v_active
          and v_role is not null
          and v_role = s.required_role
          and s.status = 'published'
          and public.shift_open_positions(s.id) > 0
          and public.organization_is_operational(s.organization_id)
          and (s.acceptance_deadline is null or s.acceptance_deadline > now())
        )
      )
  ) match on true;
end;
$$;

revoke all on function public.get_my_shift_alert_availability(uuid[]) from public, anon;
grant execute on function public.get_my_shift_alert_availability(uuid[]) to authenticated;

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
  v_verified boolean := false;
  v_account_active boolean := false;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select
    wp.worker_role,
    wp.verification_status = 'verified',
    p.account_status = 'active'
  into v_worker_role, v_verified, v_account_active
  from public.worker_profiles wp
  join public.profiles p on p.id = wp.user_id
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
        and v_verified
        and v_account_active
        and v_worker_role is not null
        and v_worker_role = s.required_role
        and public.shift_open_positions(s.id) > 0
        and public.organization_is_operational(s.organization_id)
        and (
          s.acceptance_deadline is null
          or s.acceptance_deadline > now()
        )
      )
    );
end;
$$;

revoke all on function public.get_worker_shift_details(uuid) from public, anon;
grant execute on function public.get_worker_shift_details(uuid) to authenticated;
