-- 040_worker_push_calendar_hardening.sql
-- Harden worker push outbox (sending lease, batch summary, cancel hooks,
-- preferred_locale, eligibility/expiry recheck). Forward-only; do not edit 034.

-- ---------------------------------------------------------------------------
-- Schema: preferred_locale, sending status, event kinds, expiry, receipt retries
-- ---------------------------------------------------------------------------

alter table public.worker_push_devices
  add column if not exists preferred_locale text not null default 'en';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'worker_push_devices_preferred_locale_check'
  ) then
    alter table public.worker_push_devices
      add constraint worker_push_devices_preferred_locale_check
      check (preferred_locale in ('en', 'el'));
  end if;
end $$;

alter table public.worker_notification_events
  drop constraint if exists worker_notification_events_type_check;

alter table public.worker_notification_events
  add constraint worker_notification_events_type_check
  check (event_type in (
    'shift_published',
    'shift_published_batch',
    'shift_cancelled',
    'assignment_cancelled'
  ));

alter table public.worker_notification_events
  alter column shift_id drop not null;

alter table public.worker_notification_events
  drop constraint if exists worker_notification_events_shift_publication_unique;

alter table public.worker_notification_events
  add column if not exists batch_id uuid references public.shift_creation_batches (id) on delete cascade;

alter table public.worker_notification_events
  add column if not exists assignment_id uuid references public.shift_assignments (id) on delete cascade;

alter table public.worker_notification_events
  add column if not exists expires_at timestamptz;

alter table public.worker_notification_events
  add column if not exists payload jsonb not null default '{}'::jsonb;

create unique index if not exists worker_notification_events_shift_publication_uidx
  on public.worker_notification_events (shift_id, publication_key)
  where shift_id is not null;

create unique index if not exists worker_notification_events_batch_publication_uidx
  on public.worker_notification_events (batch_id, publication_key)
  where batch_id is not null;

create unique index if not exists worker_notification_events_assignment_publication_uidx
  on public.worker_notification_events (assignment_id, publication_key)
  where assignment_id is not null;

alter table public.worker_notification_deliveries
  drop constraint if exists worker_notification_deliveries_status_check;

alter table public.worker_notification_deliveries
  add constraint worker_notification_deliveries_status_check
  check (status in ('pending', 'sending', 'sent', 'failed', 'invalid'));

alter table public.worker_notification_deliveries
  add column if not exists receipt_attempts integer not null default 0;

alter table public.worker_notification_deliveries
  drop constraint if exists worker_notification_deliveries_receipt_attempts_check;

alter table public.worker_notification_deliveries
  add constraint worker_notification_deliveries_receipt_attempts_check
  check (receipt_attempts >= 0);

drop index if exists worker_notification_deliveries_pending_idx;
create index worker_notification_deliveries_pending_idx
  on public.worker_notification_deliveries (next_attempt_at, created_at)
  where status in ('pending', 'sending');

comment on column public.worker_push_devices.preferred_locale is
  'Worker-chosen push copy locale. Synced from the mobile app (en|el).';

comment on column public.worker_notification_events.expires_at is
  'Dispatcher drops pending deliveries after this time.';

-- ---------------------------------------------------------------------------
-- Locale RPC + register extension
-- ---------------------------------------------------------------------------

create or replace function public.set_worker_push_locale(p_locale text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_locale text := lower(trim(coalesce(p_locale, '')));
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if v_locale not in ('en', 'el') then
    raise exception 'INVALID_LOCALE';
  end if;

  update public.worker_push_devices
  set preferred_locale = v_locale
  where worker_id = v_uid
    and invalidated_at is null;

  return v_locale;
end;
$$;

revoke all on function public.set_worker_push_locale(text) from public, anon;
grant execute on function public.set_worker_push_locale(text) to authenticated;

create or replace function public.register_worker_push_device(
  p_expo_push_token text,
  p_platform text,
  p_app_version text default null,
  p_preferred_locale text default null
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
  v_locale text := lower(trim(coalesce(p_preferred_locale, '')));
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

  if v_locale = '' then
    v_locale := null;
  elsif v_locale not in ('en', 'el') then
    raise exception 'INVALID_LOCALE';
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
      preferred_locale = coalesce(v_locale, preferred_locale),
      invalidated_at = null,
      last_seen_at = now()
    where id = v_id;
  elsif found then
    update public.worker_push_devices
    set
      worker_id = v_uid,
      platform = v_platform,
      app_version = v_version,
      preferred_locale = coalesce(v_locale, 'en'),
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
      preferred_locale,
      last_seen_at
    )
    values (v_uid, v_token, v_platform, true, v_version, coalesce(v_locale, 'en'), now())
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

revoke all on function public.register_worker_push_device(text, text, text) from public, anon, authenticated;
revoke all on function public.register_worker_push_device(text, text, text, text) from public, anon;
grant execute on function public.register_worker_push_device(text, text, text, text) to authenticated;

-- Drop ambiguous 3-arg signature if present; 4-arg has default locale null.
drop function if exists public.register_worker_push_device(text, text, text);

-- ---------------------------------------------------------------------------
-- Eligible device helper
-- ---------------------------------------------------------------------------

create or replace function public.worker_push_device_is_eligible(
  p_device_id uuid,
  p_required_role public.worker_role default null
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.worker_push_devices d
    join public.worker_profiles wp on wp.user_id = d.worker_id
    join public.profiles p on p.id = wp.user_id
    where d.id = p_device_id
      and d.invalidated_at is null
      and d.notification_enabled
      and wp.verification_status = 'verified'
      and p.account_status = 'active'
      and coalesce(wp.is_app_review_demo, false) = false
      and (p_required_role is null or wp.worker_role = p_required_role)
  );
$$;

revoke all on function public.worker_push_device_is_eligible(uuid, public.worker_role)
  from public, anon, authenticated;
grant execute on function public.worker_push_device_is_eligible(uuid, public.worker_role)
  to service_role;

-- ---------------------------------------------------------------------------
-- Single shift enqueue (exclude demo; set expires_at; honor suppress GUC)
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
  if current_setting('bridgehive.suppress_shift_push_enqueue', true) = 'on' then
    return null;
  end if;

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

  insert into public.worker_notification_events (
    shift_id, event_type, publication_key, expires_at, payload
  )
  values (
    v_shift.id,
    'shift_published',
    'initial',
    least(v_shift.starts_at, now() + interval '24 hours'),
    jsonb_build_object(
      'type', 'shift_published',
      'shiftId', v_shift.id::text,
      'url', 'bridgehive://shifts/' || v_shift.id::text
    )
  )
  on conflict (shift_id, publication_key) where shift_id is not null do nothing
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
    and coalesce(wp.is_app_review_demo, false) = false
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
    and coalesce(wp.is_app_review_demo, false) = false
  on conflict (event_id, device_id) do nothing;

  return v_event_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Batch summary enqueue
-- ---------------------------------------------------------------------------

create or replace function public.enqueue_shift_batch_published_notification(p_batch_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_batch public.shift_creation_batches;
  v_event_id uuid;
  v_shift_count integer;
  v_roles public.worker_role[];
  v_expires timestamptz;
  v_payload jsonb;
begin
  select * into v_batch
  from public.shift_creation_batches
  where id = p_batch_id;

  if not found then
    return null;
  end if;

  if not public.organization_is_operational(v_batch.organization_id) then
    return null;
  end if;

  select
    count(*)::integer,
    array_agg(distinct s.required_role),
    min(s.starts_at)
  into v_shift_count, v_roles, v_expires
  from public.shifts s
  where s.creation_batch_id = p_batch_id
    and s.status = 'published'
    and public.shift_open_positions(s.id) > 0;

  if v_shift_count is null or v_shift_count < 2 then
    return null;
  end if;

  v_expires := least(coalesce(v_expires, now() + interval '24 hours'), now() + interval '24 hours');
  v_payload := jsonb_build_object(
    'type', 'shift_published_batch',
    'batchId', p_batch_id::text,
    'shiftCount', v_shift_count,
    'url', 'bridgehive://shifts?filter=new'
  );

  insert into public.worker_notification_events (
    shift_id, batch_id, event_type, publication_key, expires_at, payload
  )
  values (
    null,
    p_batch_id,
    'shift_published_batch',
    'batch',
    v_expires,
    v_payload
  )
  on conflict (batch_id, publication_key) where batch_id is not null do nothing
  returning id into v_event_id;

  if v_event_id is null then
    select id into v_event_id
    from public.worker_notification_events
    where batch_id = p_batch_id
      and publication_key = 'batch';
    return v_event_id;
  end if;

  insert into public.notifications (user_id, type, title, body, data)
  select
    wp.user_id,
    'shift_published_batch',
    case when coalesce(d.preferred_locale, 'en') = 'el'
      then 'Νέες βάρδιες διαθέσιμες'
      else 'New shifts available'
    end,
    case when coalesce(d.preferred_locale, 'en') = 'el'
      then v_shift_count::text || ' νέες βάρδιες ταιριάζουν με τον ρόλο σας'
      else v_shift_count::text || ' new shifts match your role'
    end,
    v_payload
  from public.worker_profiles wp
  join public.profiles p on p.id = wp.user_id
  left join lateral (
    select preferred_locale
    from public.worker_push_devices d2
    where d2.worker_id = wp.user_id
      and d2.invalidated_at is null
    order by d2.last_seen_at desc nulls last
    limit 1
  ) d on true
  where wp.worker_role = any (v_roles)
    and wp.verification_status = 'verified'
    and p.account_status = 'active'
    and coalesce(wp.is_app_review_demo, false) = false
    and not (
      exists (
        select 1 from public.worker_push_devices dx where dx.worker_id = wp.user_id
      )
      and not exists (
        select 1 from public.worker_push_devices dx
        where dx.worker_id = wp.user_id and dx.notification_enabled
      )
    )
  ;

  insert into public.worker_notification_deliveries (event_id, worker_id, device_id, status)
  select v_event_id, d.worker_id, d.id, 'pending'
  from public.worker_push_devices d
  join public.worker_profiles wp on wp.user_id = d.worker_id
  join public.profiles p on p.id = wp.user_id
  where d.invalidated_at is null
    and d.notification_enabled
    and wp.worker_role = any (v_roles)
    and wp.verification_status = 'verified'
    and p.account_status = 'active'
    and coalesce(wp.is_app_review_demo, false) = false
  on conflict (event_id, device_id) do nothing;

  return v_event_id;
end;
$$;

revoke all on function public.enqueue_shift_batch_published_notification(uuid)
  from public, anon, authenticated;
grant execute on function public.enqueue_shift_batch_published_notification(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- Cancel / assignment cancel enqueue
-- ---------------------------------------------------------------------------

create or replace function public.enqueue_shift_cancelled_notification(p_shift_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_shift public.shifts;
  v_event_id uuid;
  v_payload jsonb;
  v_org_name text;
begin
  select * into v_shift from public.shifts where id = p_shift_id;
  if not found or v_shift.status <> 'cancelled' then
    return null;
  end if;

  select coalesce(nullif(trim(o.name), ''), 'Organization')
  into v_org_name
  from public.organizations o
  where o.id = v_shift.organization_id;

  v_payload := jsonb_build_object(
    'type', 'shift_cancelled',
    'shiftId', v_shift.id::text,
    'url', 'bridgehive://shifts/' || v_shift.id::text
  );

  insert into public.worker_notification_events (
    shift_id, event_type, publication_key, expires_at, payload
  )
  values (
    v_shift.id,
    'shift_cancelled',
    'cancelled',
    now() + interval '24 hours',
    v_payload
  )
  on conflict (shift_id, publication_key) where shift_id is not null do nothing
  returning id into v_event_id;

  if v_event_id is null then
    select id into v_event_id
    from public.worker_notification_events
    where shift_id = v_shift.id and publication_key = 'cancelled';
    return v_event_id;
  end if;

  insert into public.worker_notification_deliveries (event_id, worker_id, device_id, status)
  select distinct v_event_id, a.worker_id, d.id, 'pending'
  from public.shift_assignments a
  join public.worker_push_devices d on d.worker_id = a.worker_id
  join public.worker_profiles wp on wp.user_id = a.worker_id
  join public.profiles p on p.id = wp.user_id
  where a.shift_id = v_shift.id
    and a.status in ('accepted', 'checked_in', 'checked_out', 'cancelled', 'withdrawn')
    and d.invalidated_at is null
    and d.notification_enabled
    and wp.verification_status = 'verified'
    and p.account_status = 'active'
    and coalesce(wp.is_app_review_demo, false) = false
  on conflict (event_id, device_id) do nothing;

  return v_event_id;
exception when others then
  raise warning 'shift_cancelled_notification_enqueue_failed:%', p_shift_id;
  return null;
end;
$$;

create or replace function public.enqueue_assignment_cancelled_notification(p_assignment_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_assignment public.shift_assignments;
  v_shift public.shifts;
  v_event_id uuid;
  v_payload jsonb;
begin
  select * into v_assignment from public.shift_assignments where id = p_assignment_id;
  if not found or v_assignment.status not in ('cancelled', 'withdrawn') then
    return null;
  end if;

  select * into v_shift from public.shifts where id = v_assignment.shift_id;
  if not found then
    return null;
  end if;

  v_payload := jsonb_build_object(
    'type', 'assignment_cancelled',
    'shiftId', v_shift.id::text,
    'assignmentId', v_assignment.id::text,
    'url', 'bridgehive://shifts/' || v_shift.id::text
  );

  insert into public.worker_notification_events (
    shift_id, assignment_id, event_type, publication_key, expires_at, payload
  )
  values (
    v_shift.id,
    v_assignment.id,
    'assignment_cancelled',
    'cancelled',
    now() + interval '24 hours',
    v_payload
  )
  on conflict (assignment_id, publication_key) where assignment_id is not null do nothing
  returning id into v_event_id;

  if v_event_id is null then
    select id into v_event_id
    from public.worker_notification_events
    where assignment_id = v_assignment.id and publication_key = 'cancelled';
    return v_event_id;
  end if;

  insert into public.worker_notification_deliveries (event_id, worker_id, device_id, status)
  select v_event_id, d.worker_id, d.id, 'pending'
  from public.worker_push_devices d
  join public.worker_profiles wp on wp.user_id = d.worker_id
  join public.profiles p on p.id = wp.user_id
  where d.worker_id = v_assignment.worker_id
    and d.invalidated_at is null
    and d.notification_enabled
    and wp.verification_status = 'verified'
    and p.account_status = 'active'
    and coalesce(wp.is_app_review_demo, false) = false
  on conflict (event_id, device_id) do nothing;

  return v_event_id;
exception when others then
  raise warning 'assignment_cancelled_notification_enqueue_failed:%', p_assignment_id;
  return null;
end;
$$;

revoke all on function public.enqueue_shift_cancelled_notification(uuid)
  from public, anon, authenticated;
revoke all on function public.enqueue_assignment_cancelled_notification(uuid)
  from public, anon, authenticated;
grant execute on function public.enqueue_shift_cancelled_notification(uuid) to service_role;
grant execute on function public.enqueue_assignment_cancelled_notification(uuid) to service_role;

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
    if current_setting('bridgehive.suppress_shift_push_enqueue', true) = 'on' then
      return new;
    end if;
    begin
      perform public.enqueue_shift_published_notification(new.id);
    exception when others then
      raise warning 'shift_published_notification_enqueue_failed:%', new.id;
    end;
  elsif tg_op = 'UPDATE'
     and old.status is distinct from new.status
     and new.status = 'cancelled'
     and old.status in ('published', 'filled', 'draft') then
    begin
      perform public.enqueue_shift_cancelled_notification(new.id);
    exception when others then
      raise warning 'shift_cancelled_notification_enqueue_failed:%', new.id;
    end;
  end if;
  return new;
end;
$$;

create or replace function public.assignments_enqueue_cancelled_notifications()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE'
     and old.status is distinct from new.status
     and new.status in ('cancelled', 'withdrawn')
     and old.status in ('accepted', 'checked_in', 'checked_out') then
    begin
      perform public.enqueue_assignment_cancelled_notification(new.id);
    exception when others then
      raise warning 'assignment_cancelled_notification_enqueue_failed:%', new.id;
    end;
  end if;
  return new;
end;
$$;

drop trigger if exists assignments_enqueue_cancelled_notifications on public.shift_assignments;
create trigger assignments_enqueue_cancelled_notifications
after update of status on public.shift_assignments
for each row
execute function public.assignments_enqueue_cancelled_notifications();

-- ---------------------------------------------------------------------------
-- Claim / apply / receipts with sending lease + eligibility recheck
-- ---------------------------------------------------------------------------

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
  -- Recover stale sending leases
  update public.worker_notification_deliveries d
  set
    status = 'pending',
    next_attempt_at = now(),
    updated_at = now()
  where d.status = 'sending'
    and d.next_attempt_at is not null
    and d.next_attempt_at <= now();

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
    receipt_error = 'expired',
    updated_at = now()
  from public.worker_notification_events e
  where d.event_id = e.id
    and d.status = 'pending'
    and e.expires_at is not null
    and e.expires_at <= now();

  update public.worker_notification_deliveries d
  set
    status = 'invalid',
    receipt_error = 'shift_unavailable',
    updated_at = now()
  from public.worker_notification_events e
  left join public.shifts s on s.id = e.shift_id
  where d.event_id = e.id
    and d.status = 'pending'
    and e.event_type = 'shift_published'
    and (
      s.id is null
      or s.status <> 'published'
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
          and coalesce(wp.is_app_review_demo, false) = false
      )
    );

  update public.worker_notification_deliveries d
  set
    status = 'invalid',
    receipt_error = 'batch_unavailable',
    updated_at = now()
  from public.worker_notification_events e
  where d.event_id = e.id
    and d.status = 'pending'
    and e.event_type = 'shift_published_batch'
    and (
      e.batch_id is null
      or not exists (
        select 1
        from public.shifts s
        where s.creation_batch_id = e.batch_id
          and s.status = 'published'
          and public.shift_open_positions(s.id) > 0
      )
    );

  with candidate as (
    select d.id
    from public.worker_notification_deliveries d
    join public.worker_push_devices dev on dev.id = d.device_id
    join public.worker_notification_events e on e.id = d.event_id
    where d.status = 'pending'
      and d.attempts < 8
      and (d.next_attempt_at is null or d.next_attempt_at <= now())
      and (e.expires_at is null or e.expires_at > now())
      and dev.invalidated_at is null
      and dev.notification_enabled
    order by d.created_at
    limit v_limit
    for update of d skip locked
  ),
  claimed as (
    update public.worker_notification_deliveries d
    set
      status = 'sending',
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
          coalesce(dev.preferred_locale, 'en') as "preferredLocale",
          e.event_type as "eventType",
          e.payload,
          e.shift_id as "shiftId",
          e.batch_id as "batchId",
          e.assignment_id as "assignmentId",
          case
            when e.event_type = 'shift_published' then public.shift_open_positions(s.id)
            when e.event_type = 'shift_published_batch' then coalesce((e.payload ->> 'shiftCount')::integer, 0)
            else 0
          end as "openPositions",
          coalesce(s.status, 'published') as status,
          s.starts_at as "startsAt",
          s.ends_at as "endsAt",
          coalesce(
            nullif(trim(l.timezone), ''),
            nullif(trim(o.timezone), ''),
            'Europe/Nicosia'
          ) as "timeZone",
          coalesce(nullif(trim(w.name), ''), nullif(trim(l.name), ''), '') as place,
          s.required_role as "requiredRole",
          coalesce(s.rate_minor, 0) as "rateMinor",
          coalesce(s.currency, 'EUR') as currency,
          coalesce(nullif(trim(o.name), ''), 'Organization') as "organizationName"
        from public.worker_notification_deliveries d
        join public.worker_push_devices dev on dev.id = d.device_id
        join public.worker_notification_events e on e.id = d.event_id
        left join public.shifts s on s.id = e.shift_id
        left join public.locations l on l.id = s.location_id
        left join public.organizations o on o.id = coalesce(s.organization_id, (
          select b.organization_id from public.shift_creation_batches b where b.id = e.batch_id
        ))
        left join public.wards w on w.id = s.ward_id
        where d.id = any (v_ids)
      ) claimed_row
    ),
    '[]'::jsonb
  );
end;
$$;

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
      and status in ('sending', 'pending')
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
  v_receipt_attempts integer;
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

    select device_id, attempts, receipt_attempts
    into v_device, v_attempts, v_receipt_attempts
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
    elsif v_status = 'pending' or v_error in ('expo_unreachable', 'receipt_not_ready', 'expo_receipt_missing') then
      -- Transient Expo lag: leave unchecked; bump receipt_attempts and stop after bound
      if coalesce(v_receipt_attempts, 0) >= 8 then
        update public.worker_notification_deliveries
        set
          receipt_status = 'error',
          receipt_error = 'receipt_timeout',
          receipt_checked_at = now(),
          updated_at = now()
        where id = v_id;
      else
        update public.worker_notification_deliveries
        set
          receipt_attempts = coalesce(receipt_attempts, 0) + 1,
          receipt_error = nullif(v_error, ''),
          sent_at = least(sent_at + interval '10 minutes', now()),
          updated_at = now()
        where id = v_id;
      end if;
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


-- ---------------------------------------------------------------------------
-- Bulk create: suppress per-shift enqueue, one batch summary
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

  if v_status = 'published' then
    perform set_config('bridgehive.suppress_shift_push_enqueue', 'on', true);
  end if;

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

  if v_status = 'published' then
    begin
      perform public.enqueue_shift_batch_published_notification(v_batch_id);
    exception when others then
      raise warning 'shift_batch_published_notification_enqueue_failed:%', v_batch_id;
    end;
  end if;

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
revoke all on function public.create_shifts_batch(uuid, text, text, text, jsonb) from anon;
grant execute on function public.create_shifts_batch(uuid, text, text, text, jsonb) to authenticated;
