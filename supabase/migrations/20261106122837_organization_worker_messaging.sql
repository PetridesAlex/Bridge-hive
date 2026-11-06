-- 20261106122837_organization_worker_messaging.sql
-- Organization ↔ worker 1:1 text messaging.
-- Ordered after 20261106121000_shift_capacity_occupancy_guard.
-- Does not alter claim_shift, timesheets, invoices, payouts, or maps.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.organization_worker_conversations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  worker_id uuid not null references public.worker_profiles (user_id) on delete restrict,
  last_message_at timestamptz,
  last_message_preview text,
  last_sender_kind text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organization_worker_conversations_pair_unique
    unique (organization_id, worker_id),
  constraint organization_worker_conversations_last_sender_kind_check
    check (
      last_sender_kind is null
      or last_sender_kind in ('worker', 'organization_staff')
    ),
  constraint organization_worker_conversations_preview_len_check
    check (
      last_message_preview is null
      or char_length(last_message_preview) <= 280
    )
);

create trigger organization_worker_conversations_set_updated_at
before update on public.organization_worker_conversations
for each row
execute function public.set_updated_at();

create index organization_worker_conversations_org_last_idx
  on public.organization_worker_conversations (organization_id, last_message_at desc nulls last);

create index organization_worker_conversations_worker_last_idx
  on public.organization_worker_conversations (worker_id, last_message_at desc nulls last);

create table public.organization_worker_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null
    references public.organization_worker_conversations (id) on delete cascade,
  sender_user_id uuid not null references public.profiles (id) on delete restrict,
  sender_kind text not null,
  body text not null,
  client_message_id uuid not null,
  created_at timestamptz not null default now(),
  constraint organization_worker_messages_sender_kind_check
    check (sender_kind in ('worker', 'organization_staff')),
  constraint organization_worker_messages_body_nonempty
    check (char_length(trim(body)) > 0),
  constraint organization_worker_messages_body_maxlen
    check (char_length(body) <= 2000),
  constraint organization_worker_messages_client_unique
    unique (conversation_id, client_message_id)
);

create index organization_worker_messages_conversation_created_idx
  on public.organization_worker_messages (conversation_id, created_at desc, id desc);

create table public.organization_worker_conversation_reads (
  conversation_id uuid not null
    references public.organization_worker_conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  last_read_message_id uuid
    references public.organization_worker_messages (id) on delete set null,
  last_read_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

comment on table public.organization_worker_conversations is
  'One conversation per organization + worker pair after approved completed work.';
comment on table public.organization_worker_messages is
  'Text-only chat messages. Writes go through send_org_worker_message RPC.';
comment on table public.organization_worker_conversation_reads is
  'Per-user read cursor. One staff member reading does not mark read for others.';

-- ---------------------------------------------------------------------------
-- RLS (select only; mutations via SECURITY DEFINER RPCs)
-- ---------------------------------------------------------------------------

alter table public.organization_worker_conversations enable row level security;
alter table public.organization_worker_messages enable row level security;
alter table public.organization_worker_conversation_reads enable row level security;

create policy organization_worker_conversations_select_worker
on public.organization_worker_conversations
for select
to authenticated
using (
  worker_id = auth.uid()
  and not public.is_app_review_demo_worker(auth.uid())
);

create policy organization_worker_conversations_select_org_staff
on public.organization_worker_conversations
for select
to authenticated
using (
  public.has_org_role(
    organization_id,
    array['org_admin'::public.org_role, 'org_scheduler'::public.org_role]
  )
  and public.organization_is_operational(organization_id)
);

create policy organization_worker_messages_select_worker
on public.organization_worker_messages
for select
to authenticated
using (
  exists (
    select 1
    from public.organization_worker_conversations c
    where c.id = conversation_id
      and c.worker_id = auth.uid()
      and not public.is_app_review_demo_worker(auth.uid())
  )
);

create policy organization_worker_messages_select_org_staff
on public.organization_worker_messages
for select
to authenticated
using (
  exists (
    select 1
    from public.organization_worker_conversations c
    where c.id = conversation_id
      and public.has_org_role(
        c.organization_id,
        array['org_admin'::public.org_role, 'org_scheduler'::public.org_role]
      )
      and public.organization_is_operational(c.organization_id)
  )
);

create policy organization_worker_conversation_reads_select_own
on public.organization_worker_conversation_reads
for select
to authenticated
using (user_id = auth.uid());

revoke insert, update, delete on public.organization_worker_conversations
  from public, anon, authenticated;
revoke insert, update, delete on public.organization_worker_messages
  from public, anon, authenticated;
revoke insert, update, delete on public.organization_worker_conversation_reads
  from public, anon, authenticated;

grant select on public.organization_worker_conversations to authenticated;
grant select on public.organization_worker_messages to authenticated;
grant select on public.organization_worker_conversation_reads to authenticated;

-- ---------------------------------------------------------------------------
-- Configurable limits (server-enforced; clients may mirror for UX only)
-- ---------------------------------------------------------------------------

insert into public.platform_settings (key, value_json)
values
  ('org_worker_message_max_length', '2000'::jsonb),
  ('org_worker_message_rate_limit_count', '30'::jsonb),
  ('org_worker_message_rate_limit_window_seconds', '60'::jsonb)
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- Eligibility
-- ---------------------------------------------------------------------------

create or replace function public.org_worker_messaging_eligible(
  p_organization_id uuid,
  p_worker_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if p_organization_id is null or p_worker_id is null then
    return false;
  end if;

  if public.is_app_review_demo_worker(p_worker_id) then
    return false;
  end if;

  if not public.organization_is_operational(p_organization_id) then
    return false;
  end if;

  if not exists (
    select 1
    from public.worker_profiles wp
    join public.profiles p on p.id = wp.user_id
    where wp.user_id = p_worker_id
      and wp.verification_status = 'verified'
      and p.account_status = 'active'
      and wp.worker_role in (
        'registered_nurse'::public.worker_role,
        'ward_assistant'::public.worker_role,
        'physiotherapist'::public.worker_role
      )
      and coalesce(wp.is_app_review_demo, false) = false
  ) then
    return false;
  end if;

  return exists (
    select 1
    from public.shift_assignments sa
    join public.shifts s on s.id = sa.shift_id
    join public.timesheets t on t.assignment_id = sa.id
    where sa.worker_id = p_worker_id
      and s.organization_id = p_organization_id
      and sa.status = 'approved'
      and t.status = 'approved'
  );
end;
$$;

revoke all on function public.org_worker_messaging_eligible(uuid, uuid)
  from public, anon;
grant execute on function public.org_worker_messaging_eligible(uuid, uuid)
  to authenticated;

-- ---------------------------------------------------------------------------
-- Push outbox extension for org_worker_message
-- ---------------------------------------------------------------------------

alter table public.worker_notification_events
  drop constraint if exists worker_notification_events_type_check;

alter table public.worker_notification_events
  add constraint worker_notification_events_type_check
  check (event_type in (
    'shift_published',
    'shift_published_batch',
    'shift_cancelled',
    'assignment_cancelled',
    'org_worker_message'
  ));

alter table public.worker_notification_events
  add column if not exists conversation_id uuid
    references public.organization_worker_conversations (id) on delete cascade;

create unique index if not exists worker_notification_events_message_publication_uidx
  on public.worker_notification_events (publication_key)
  where event_type = 'org_worker_message';

create or replace function public.enqueue_org_worker_message_notification(
  p_conversation_id uuid,
  p_message_id uuid,
  p_worker_id uuid,
  p_organization_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id uuid;
  v_org_name text;
  v_publication_key text := p_message_id::text;
begin
  if p_conversation_id is null
     or p_message_id is null
     or p_worker_id is null
     or p_organization_id is null then
    return null;
  end if;

  if public.is_app_review_demo_worker(p_worker_id) then
    return null;
  end if;

  select coalesce(nullif(trim(o.display_name), ''), 'Organization')
  into v_org_name
  from public.organizations o
  where o.id = p_organization_id;

  if v_org_name is null then
    return null;
  end if;

  insert into public.worker_notification_events (
    shift_id,
    event_type,
    publication_key,
    expires_at,
    payload,
    conversation_id
  )
  values (
    null,
    'org_worker_message',
    v_publication_key,
    now() + interval '7 days',
    jsonb_build_object(
      'conversationId', p_conversation_id,
      'messageId', p_message_id,
      'organizationId', p_organization_id,
      'organizationName', v_org_name
    ),
    p_conversation_id
  )
  on conflict (publication_key) where event_type = 'org_worker_message'
  do nothing
  returning id into v_event_id;

  if v_event_id is null then
    select id into v_event_id
    from public.worker_notification_events
    where event_type = 'org_worker_message'
      and publication_key = v_publication_key;
    return v_event_id;
  end if;

  insert into public.worker_notification_deliveries (
    event_id,
    device_id,
    worker_id,
    status
  )
  select
    v_event_id,
    d.id,
    p_worker_id,
    'pending'
  from public.worker_push_devices d
  where d.worker_id = p_worker_id
    and d.invalidated_at is null
    and d.notification_enabled
  on conflict (event_id, device_id) do nothing;

  return v_event_id;
exception
  when others then
    raise warning 'org_worker_message_notification_enqueue_failed:%', p_message_id;
    return null;
end;
$$;

revoke all on function public.enqueue_org_worker_message_notification(uuid, uuid, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.enqueue_org_worker_message_notification(uuid, uuid, uuid, uuid)
  to service_role;

-- Keep claim_worker_push_deliveries returning organizationName for chat events.
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

  -- Drop chat pushes when the conversation is gone, the worker is demo, or
  -- the pair is no longer messaging-eligible (approved work / account rules).
  update public.worker_notification_deliveries d
  set
    status = 'invalid',
    receipt_error = 'message_unavailable',
    updated_at = now()
  from public.worker_notification_events e
  left join public.organization_worker_conversations c on c.id = e.conversation_id
  where d.event_id = e.id
    and d.status = 'pending'
    and e.event_type = 'org_worker_message'
    and (
      c.id is null
      or public.is_app_review_demo_worker(d.worker_id)
      or not public.org_worker_messaging_eligible(c.organization_id, c.worker_id)
      or c.worker_id <> d.worker_id
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
          e.conversation_id as "conversationId",
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
          coalesce(
            nullif(trim(e.payload ->> 'organizationName'), ''),
            nullif(trim(o.display_name), ''),
            'Organization'
          ) as "organizationName"
        from public.worker_notification_deliveries d
        join public.worker_push_devices dev on dev.id = d.device_id
        join public.worker_notification_events e on e.id = d.event_id
        left join public.shifts s on s.id = e.shift_id
        left join public.locations l on l.id = s.location_id
        left join public.organization_worker_conversations c on c.id = e.conversation_id
        left join public.organizations o on o.id = coalesce(
          s.organization_id,
          c.organization_id,
          (
            select b.organization_id
            from public.shift_creation_batches b
            where b.id = e.batch_id
          )
        )
        left join public.wards w on w.id = s.ward_id
        where d.id = any (v_ids)
        order by d.created_at
      ) claimed_row
    ),
    '[]'::jsonb
  );
end;
$$;

revoke all on function public.claim_worker_push_deliveries(integer)
  from public, anon, authenticated;
grant execute on function public.claim_worker_push_deliveries(integer)
  to service_role;

-- ---------------------------------------------------------------------------
-- Conversation / message RPCs
-- ---------------------------------------------------------------------------

create or replace function public.get_or_create_org_worker_conversation(
  p_organization_id uuid,
  p_worker_id uuid
)
returns public.organization_worker_conversations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.organization_worker_conversations;
  v_is_worker boolean;
  v_is_staff boolean;
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if p_organization_id is null or p_worker_id is null then
    raise exception 'INVALID_ARGUMENTS';
  end if;

  if public.is_app_review_demo_worker(v_uid)
     or public.is_app_review_demo_worker(p_worker_id) then
    raise exception 'APP_REVIEW_DEMO_FORBIDDEN';
  end if;

  if not public.org_worker_messaging_eligible(p_organization_id, p_worker_id) then
    raise exception 'MESSAGING_NOT_ELIGIBLE';
  end if;

  v_is_worker := (v_uid = p_worker_id);
  v_is_staff := public.has_org_role(
    p_organization_id,
    array['org_admin'::public.org_role, 'org_scheduler'::public.org_role]
  );

  if not v_is_worker and not v_is_staff then
    raise exception 'MESSAGING_FORBIDDEN';
  end if;

  insert into public.organization_worker_conversations (organization_id, worker_id)
  values (p_organization_id, p_worker_id)
  on conflict (organization_id, worker_id) do update
    set updated_at = public.organization_worker_conversations.updated_at
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.get_or_create_org_worker_conversation(uuid, uuid)
  from public, anon;
grant execute on function public.get_or_create_org_worker_conversation(uuid, uuid)
  to authenticated;

create or replace function public.send_org_worker_message(
  p_conversation_id uuid,
  p_body text,
  p_client_message_id uuid
)
returns public.organization_worker_messages
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_conversation public.organization_worker_conversations;
  v_existing public.organization_worker_messages;
  v_message public.organization_worker_messages;
  v_body text := trim(coalesce(p_body, ''));
  v_sender_kind text;
  v_preview text;
  v_max_length integer := public.get_setting_int('org_worker_message_max_length', 2000);
  v_rate_count integer := public.get_setting_int('org_worker_message_rate_limit_count', 30);
  v_rate_window_seconds integer :=
    public.get_setting_int('org_worker_message_rate_limit_window_seconds', 60);
  v_recent_count integer;
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if p_conversation_id is null or p_client_message_id is null then
    raise exception 'INVALID_ARGUMENTS';
  end if;

  if char_length(v_body) = 0 then
    raise exception 'MESSAGE_BODY_REQUIRED';
  end if;

  if v_max_length < 1 then
    v_max_length := 2000;
  end if;

  if char_length(v_body) > v_max_length then
    raise exception 'MESSAGE_BODY_TOO_LONG';
  end if;

  if public.is_app_review_demo_worker(v_uid) then
    raise exception 'APP_REVIEW_DEMO_FORBIDDEN';
  end if;

  select * into v_conversation
  from public.organization_worker_conversations
  where id = p_conversation_id
  for update;

  if not found then
    raise exception 'CONVERSATION_NOT_FOUND';
  end if;

  if not public.org_worker_messaging_eligible(
    v_conversation.organization_id,
    v_conversation.worker_id
  ) then
    raise exception 'MESSAGING_NOT_ELIGIBLE';
  end if;

  if v_uid = v_conversation.worker_id then
    v_sender_kind := 'worker';
  elsif public.has_org_role(
    v_conversation.organization_id,
    array['org_admin'::public.org_role, 'org_scheduler'::public.org_role]
  ) then
    v_sender_kind := 'organization_staff';
  else
    raise exception 'MESSAGING_FORBIDDEN';
  end if;

  select * into v_existing
  from public.organization_worker_messages
  where conversation_id = p_conversation_id
    and client_message_id = p_client_message_id;

  if found then
    return v_existing;
  end if;

  -- Rate limit new sends only (idempotent retries of the same client_message_id
  -- return above and do not consume quota).
  if v_rate_count > 0 and v_rate_window_seconds > 0 then
    select count(*)::integer
    into v_recent_count
    from public.organization_worker_messages m
    where m.conversation_id = p_conversation_id
      and m.sender_user_id = v_uid
      and m.created_at > now() - make_interval(secs => v_rate_window_seconds);

    if v_recent_count >= v_rate_count then
      raise exception 'MESSAGE_RATE_LIMITED';
    end if;
  end if;

  insert into public.organization_worker_messages (
    conversation_id,
    sender_user_id,
    sender_kind,
    body,
    client_message_id
  )
  values (
    p_conversation_id,
    v_uid,
    v_sender_kind,
    v_body,
    p_client_message_id
  )
  returning * into v_message;

  v_preview := left(v_body, 280);

  update public.organization_worker_conversations
  set
    last_message_at = v_message.created_at,
    last_message_preview = v_preview,
    last_sender_kind = v_sender_kind,
    updated_at = now()
  where id = p_conversation_id;

  -- Sender has read through their own message.
  insert into public.organization_worker_conversation_reads (
    conversation_id,
    user_id,
    last_read_message_id,
    last_read_at
  )
  values (p_conversation_id, v_uid, v_message.id, now())
  on conflict (conversation_id, user_id) do update
  set
    last_read_message_id = excluded.last_read_message_id,
    last_read_at = excluded.last_read_at;

  if v_sender_kind = 'organization_staff' then
    perform public.enqueue_org_worker_message_notification(
      p_conversation_id,
      v_message.id,
      v_conversation.worker_id,
      v_conversation.organization_id
    );
  end if;

  return v_message;
exception
  when unique_violation then
    select * into v_existing
    from public.organization_worker_messages
    where conversation_id = p_conversation_id
      and client_message_id = p_client_message_id;
    if found then
      return v_existing;
    end if;
    raise;
end;
$$;

revoke all on function public.send_org_worker_message(uuid, text, uuid)
  from public, anon;
grant execute on function public.send_org_worker_message(uuid, text, uuid)
  to authenticated;

create or replace function public.list_org_worker_conversations(
  p_organization_id uuid default null,
  p_limit integer default 50
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 100);
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if public.is_app_review_demo_worker(v_uid) then
    raise exception 'APP_REVIEW_DEMO_FORBIDDEN';
  end if;

  if p_organization_id is not null then
    if not public.has_org_role(
      p_organization_id,
      array['org_admin'::public.org_role, 'org_scheduler'::public.org_role]
    ) then
      raise exception 'MESSAGING_FORBIDDEN';
    end if;
  end if;

  return coalesce(
    (
      select jsonb_agg(to_jsonb(row_data) order by row_data."lastMessageAt" desc nulls last)
      from (
        select
          c.id,
          c.organization_id as "organizationId",
          c.worker_id as "workerId",
          c.last_message_at as "lastMessageAt",
          c.last_message_preview as "lastMessagePreview",
          c.last_sender_kind as "lastSenderKind",
          c.created_at as "createdAt",
          o.display_name as "organizationName",
          p.full_name as "workerName",
          wp.worker_role as "workerRole",
          coalesce(
            (
              select count(*)::integer
              from public.organization_worker_messages m
              left join public.organization_worker_conversation_reads r
                on r.conversation_id = c.id
               and r.user_id = v_uid
              left join public.organization_worker_messages last_read
                on last_read.id = r.last_read_message_id
               and last_read.conversation_id = c.id
              where m.conversation_id = c.id
                and m.sender_user_id <> v_uid
                and (
                  r.last_read_message_id is null
                  or last_read.id is null
                  or (m.created_at, m.id) > (last_read.created_at, last_read.id)
                )
            ),
            0
          ) as "unreadCount"
        from public.organization_worker_conversations c
        join public.organizations o on o.id = c.organization_id
        join public.profiles p on p.id = c.worker_id
        join public.worker_profiles wp on wp.user_id = c.worker_id
        where (
          p_organization_id is not null
          and c.organization_id = p_organization_id
          and public.has_org_role(
            c.organization_id,
            array['org_admin'::public.org_role, 'org_scheduler'::public.org_role]
          )
        )
        or (
          p_organization_id is null
          and c.worker_id = v_uid
        )
        order by c.last_message_at desc nulls last, c.created_at desc
        limit v_limit
      ) row_data
    ),
    '[]'::jsonb
  );
end;
$$;

revoke all on function public.list_org_worker_conversations(uuid, integer)
  from public, anon;
grant execute on function public.list_org_worker_conversations(uuid, integer)
  to authenticated;

create or replace function public.list_org_worker_messages(
  p_conversation_id uuid,
  p_before_created_at timestamptz default null,
  p_before_id uuid default null,
  p_limit integer default 50
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_conversation public.organization_worker_conversations;
  v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 100);
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if public.is_app_review_demo_worker(v_uid) then
    raise exception 'APP_REVIEW_DEMO_FORBIDDEN';
  end if;

  select * into v_conversation
  from public.organization_worker_conversations
  where id = p_conversation_id;

  if not found then
    raise exception 'CONVERSATION_NOT_FOUND';
  end if;

  if v_uid <> v_conversation.worker_id
     and not public.has_org_role(
       v_conversation.organization_id,
       array['org_admin'::public.org_role, 'org_scheduler'::public.org_role]
     ) then
    raise exception 'MESSAGING_FORBIDDEN';
  end if;

  return coalesce(
    (
      select jsonb_agg(to_jsonb(row_data) order by row_data."createdAt" asc, row_data.id asc)
      from (
        select *
        from (
          select
            m.id,
            m.conversation_id as "conversationId",
            m.sender_user_id as "senderUserId",
            m.sender_kind as "senderKind",
            m.body,
            m.client_message_id as "clientMessageId",
            m.created_at as "createdAt",
            coalesce(nullif(trim(p.full_name), ''), 'Member') as "senderName"
          from public.organization_worker_messages m
          join public.profiles p on p.id = m.sender_user_id
          where m.conversation_id = p_conversation_id
            and (
              p_before_created_at is null
              or (m.created_at, m.id) < (p_before_created_at, p_before_id)
            )
          order by m.created_at desc, m.id desc
          limit v_limit
        ) newest_first
      ) row_data
    ),
    '[]'::jsonb
  );
end;
$$;

revoke all on function public.list_org_worker_messages(uuid, timestamptz, uuid, integer)
  from public, anon;
grant execute on function public.list_org_worker_messages(uuid, timestamptz, uuid, integer)
  to authenticated;

create or replace function public.mark_org_worker_conversation_read(
  p_conversation_id uuid,
  p_message_id uuid
)
returns public.organization_worker_conversation_reads
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_conversation public.organization_worker_conversations;
  v_message public.organization_worker_messages;
  v_prev public.organization_worker_messages;
  v_existing public.organization_worker_conversation_reads;
  v_row public.organization_worker_conversation_reads;
  v_should_advance boolean := true;
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if public.is_app_review_demo_worker(v_uid) then
    raise exception 'APP_REVIEW_DEMO_FORBIDDEN';
  end if;

  select * into v_conversation
  from public.organization_worker_conversations
  where id = p_conversation_id;

  if not found then
    raise exception 'CONVERSATION_NOT_FOUND';
  end if;

  if v_uid <> v_conversation.worker_id
     and not public.has_org_role(
       v_conversation.organization_id,
       array['org_admin'::public.org_role, 'org_scheduler'::public.org_role]
     ) then
    raise exception 'MESSAGING_FORBIDDEN';
  end if;

  -- Candidate must belong to this authorized conversation (never trust UUID alone).
  select * into v_message
  from public.organization_worker_messages
  where id = p_message_id
    and conversation_id = p_conversation_id;

  if not found then
    raise exception 'MESSAGE_NOT_FOUND';
  end if;

  select * into v_existing
  from public.organization_worker_conversation_reads
  where conversation_id = p_conversation_id
    and user_id = v_uid;

  if found and v_existing.last_read_message_id is not null then
    select * into v_prev
    from public.organization_worker_messages
    where id = v_existing.last_read_message_id
      and conversation_id = p_conversation_id;

    if found then
      -- Authoritative order is (created_at, id), matching list_org_worker_messages.
      -- A lexicographically larger UUID alone must not advance the cursor.
      v_should_advance :=
        (v_message.created_at, v_message.id) > (v_prev.created_at, v_prev.id);
    end if;
  end if;

  if not v_should_advance then
    return v_existing;
  end if;

  insert into public.organization_worker_conversation_reads (
    conversation_id,
    user_id,
    last_read_message_id,
    last_read_at
  )
  values (p_conversation_id, v_uid, p_message_id, v_message.created_at)
  on conflict (conversation_id, user_id) do update
  set
    last_read_message_id = excluded.last_read_message_id,
    last_read_at = excluded.last_read_at
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.mark_org_worker_conversation_read(uuid, uuid)
  from public, anon;
grant execute on function public.mark_org_worker_conversation_read(uuid, uuid)
  to authenticated;

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------

do $$
begin
  alter publication supabase_realtime add table public.organization_worker_messages;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.organization_worker_conversations;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

alter table public.organization_worker_messages replica identity full;
alter table public.organization_worker_conversations replica identity full;
