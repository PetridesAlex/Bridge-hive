-- Durable three-day invoice_due_soon reminder (in-app + push outbox).
-- Restriction deadline remains worker_commission_invoices.due_at (unchanged).
-- Does not schedule production cron; pg_cron may still be unavailable.
-- Never reads worker_sandbox_commission_invoices.

-- ---------------------------------------------------------------------------
-- Schema: invoice push events
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
    'org_worker_message',
    'invoice_due_soon'
  ));

alter table public.worker_notification_events
  add column if not exists invoice_id uuid
    references public.worker_commission_invoices (id) on delete cascade;

create unique index if not exists worker_notification_events_invoice_due_soon_uidx
  on public.worker_notification_events (publication_key)
  where event_type = 'invoice_due_soon';

-- One logical in-app three-day reminder per invoice + authoritative due_at.
create unique index if not exists notifications_invoice_due_soon_once
  on public.notifications (
    user_id,
    ((data ->> 'invoice_id')),
    ((data ->> 'due_at'))
  )
  where type = 'invoice_due_soon';

comment on column public.worker_notification_events.invoice_id is
  'Worker commission invoice for invoice_due_soon push events. Never sandbox fixtures.';

-- ---------------------------------------------------------------------------
-- Enqueue: durable in-app row + push outbox (atomic per invoice+due_at)
-- ---------------------------------------------------------------------------

create or replace function public.enqueue_invoice_due_soon_notification(p_invoice_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invoice public.worker_commission_invoices;
  v_event_id uuid;
  v_notification_id uuid;
  v_publication_key text;
  v_due_at_key text;
  v_deadline_text text;
  v_title text;
  v_body text;
  v_days_left numeric;
begin
  if p_invoice_id is null then
    return null;
  end if;

  select * into v_invoice
  from public.worker_commission_invoices
  where id = p_invoice_id
  for update;

  if not found then
    return null;
  end if;

  -- Only live open commission invoices in the warning window.
  if v_invoice.status <> 'open' then
    return null;
  end if;

  if v_invoice.due_at <= now() or v_invoice.due_at > now() + interval '3 days' then
    return null;
  end if;

  if public.is_app_review_demo_worker(v_invoice.worker_id) then
    return null;
  end if;

  if not exists (
    select 1
    from public.profiles p
    join public.worker_profiles wp on wp.user_id = p.id
    where p.id = v_invoice.worker_id
      and p.account_status = 'active'
      and coalesce(wp.is_app_review_demo, false) = false
  ) then
    return null;
  end if;

  v_due_at_key :=
    to_char(v_invoice.due_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
  v_publication_key :=
    'invoice_due_soon:' || v_invoice.id::text || ':' || v_due_at_key;

  -- Already enqueued for this invoice + due_at version.
  select id into v_event_id
  from public.worker_notification_events
  where event_type = 'invoice_due_soon'
    and publication_key = v_publication_key;

  if v_event_id is not null then
    return null;
  end if;

  v_deadline_text :=
    to_char(v_invoice.due_at at time zone 'UTC', 'YYYY-MM-DD HH24:MI') || ' UTC';

  v_days_left := extract(epoch from (v_invoice.due_at - now())) / 86400.0;

  v_title := 'Invoice payment reminder';
  if v_days_left > 2 then
    v_body := format(
      'Please settle your pending Bridge Hive invoice by %s to avoid a pause on accepting new shifts.',
      v_deadline_text
    );
  elsif v_days_left > 1 then
    v_body := format(
      'Please settle your pending Bridge Hive invoice by %s (about 2 days left) to avoid a pause on accepting new shifts.',
      v_deadline_text
    );
  elsif v_days_left > 0 then
    v_body := format(
      'Please settle your pending Bridge Hive invoice by %s soon to avoid a pause on accepting new shifts.',
      v_deadline_text
    );
  else
    return null;
  end if;

  insert into public.notifications (user_id, type, title, body, data)
  values (
    v_invoice.worker_id,
    'invoice_due_soon',
    v_title,
    v_body,
    jsonb_build_object(
      'invoice_id', v_invoice.id,
      'invoice_number', v_invoice.invoice_number,
      'due_at', v_due_at_key,
      'type', 'invoice_due_soon',
      'invoiceId', v_invoice.id,
      'url', 'bridgehive://invoices/' || lower(v_invoice.id::text)
    )
  )
  on conflict (user_id, (data->>'invoice_id'), (data->>'due_at'))
    where type = 'invoice_due_soon'
  do nothing
  returning id into v_notification_id;

  insert into public.worker_notification_events (
    shift_id,
    event_type,
    publication_key,
    expires_at,
    payload,
    invoice_id
  )
  values (
    null,
    'invoice_due_soon',
    v_publication_key,
    v_invoice.due_at,
    jsonb_build_object(
      'invoiceId', v_invoice.id,
      'dueAt', v_due_at_key,
      'invoiceNumber', v_invoice.invoice_number
    ),
    v_invoice.id
  )
  on conflict (publication_key) where event_type = 'invoice_due_soon'
  do nothing
  returning id into v_event_id;

  if v_event_id is null then
    return null;
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
    v_invoice.worker_id,
    'pending'
  from public.worker_push_devices d
  where d.worker_id = v_invoice.worker_id
    and d.invalidated_at is null
    and d.notification_enabled
  on conflict (event_id, device_id) do nothing;

  return v_event_id;
end;
$$;

revoke all on function public.enqueue_invoice_due_soon_notification(uuid)
  from public, anon, authenticated;
grant execute on function public.enqueue_invoice_due_soon_notification(uuid)
  to service_role;

comment on function public.enqueue_invoice_due_soon_notification(uuid) is
  'Creates at most one invoice_due_soon in-app notification and push event per invoice+due_at.';

-- ---------------------------------------------------------------------------
-- Invalidate pending invoice_due_soon deliveries when no longer applicable
-- ---------------------------------------------------------------------------

create or replace function public.invalidate_invoice_due_soon_pending(p_invoice_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
begin
  if p_invoice_id is null then
    return 0;
  end if;

  update public.worker_notification_deliveries d
  set
    status = 'invalid',
    receipt_error = 'invoice_unavailable',
    updated_at = now()
  from public.worker_notification_events e
  left join public.worker_commission_invoices i on i.id = e.invoice_id
  where d.event_id = e.id
    and d.status in ('pending', 'sending')
    and e.event_type = 'invoice_due_soon'
    and e.invoice_id = p_invoice_id
    and (
      i.id is null
      or i.status <> 'open'
      or i.due_at <= now()
      or public.is_app_review_demo_worker(d.worker_id)
    );

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.invalidate_invoice_due_soon_pending(uuid)
  from public, anon, authenticated;
grant execute on function public.invalidate_invoice_due_soon_pending(uuid)
  to service_role;

-- ---------------------------------------------------------------------------
-- Processor: reuse overdue + 1d/today; harden three-day durable enqueue
-- ---------------------------------------------------------------------------

create or replace function public.process_worker_commission_due_dates()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_marked_overdue integer := 0;
  v_reminders_3d integer := 0;
  v_reminders_1d integer := 0;
  v_reminders_due integer := 0;
  v_row public.worker_commission_invoices;
  v_restored integer := 0;
  v_event_id uuid;
begin
  perform set_config('bridgehive.allow_invoice_transition', 'on', true);

  for v_row in
    select *
    from public.worker_commission_invoices
    where status in ('open', 'payment_processing')
      and due_at <= now()
    for update skip locked
  loop
    update public.worker_commission_invoices
    set
      status = 'past_due',
      past_due_at = coalesce(past_due_at, now()),
      updated_at = now()
    where id = v_row.id
      and status in ('open', 'payment_processing');

    if found then
      v_marked_overdue := v_marked_overdue + 1;

      insert into public.worker_invoice_events (invoice_id, event_type, provider_data)
      values (
        v_row.id,
        'invoice_past_due',
        jsonb_build_object('due_at', v_row.due_at)
      );

      perform public.create_audit_event(
        v_row.organization_id,
        'worker_commission_invoice',
        v_row.id,
        'invoice_past_due',
        jsonb_build_object('status', v_row.status),
        jsonb_build_object('status', 'past_due')
      );

      perform public.notify_worker_invoice(
        v_row.worker_id,
        'invoice_past_due',
        'Commission invoice past due',
        format(
          'Invoice %s is past due. New shift access is paused because a commission invoice is overdue.',
          v_row.invoice_number
        ),
        v_row.id,
        v_row.invoice_number,
        20
      );

      perform public.notify_worker_invoice(
        v_row.worker_id,
        'marketplace_restricted',
        'New shift access paused',
        'New shift access is paused because a commission invoice is overdue.',
        v_row.id,
        v_row.invoice_number,
        20
      );

      perform public.invalidate_invoice_due_soon_pending(v_row.id);
    end if;
  end loop;

  -- Three-day warning through due_at (catch-up). Durable once per invoice+due_at.
  -- Excludes payment_processing (confirmation pending — do not encourage another charge).
  -- Never selects from worker_sandbox_commission_invoices.
  for v_row in
    select i.*
    from public.worker_commission_invoices i
    join public.profiles p on p.id = i.worker_id
    join public.worker_profiles wp on wp.user_id = i.worker_id
    where i.status = 'open'
      and i.due_at > now()
      and i.due_at <= now() + interval '3 days'
      and p.account_status = 'active'
      and coalesce(wp.is_app_review_demo, false) = false
  loop
    v_event_id := public.enqueue_invoice_due_soon_notification(v_row.id);
    if v_event_id is not null then
      v_reminders_3d := v_reminders_3d + 1;
    end if;
  end loop;

  -- Reminder: 1 calendar day remaining (soft-dedupe in-app; unchanged kind)
  for v_row in
    select *
    from public.worker_commission_invoices
    where status = 'open'
      and due_at > now()
      and due_at <= now() + interval '1 day'
      and due_at::date > current_date
  loop
    perform public.notify_worker_invoice(
      v_row.worker_id,
      'invoice_due_one_day',
      'Commission payment due tomorrow',
      format('Invoice %s is due within one calendar day.', v_row.invoice_number),
      v_row.id,
      v_row.invoice_number,
      20
    );
    v_reminders_1d := v_reminders_1d + 1;
  end loop;

  -- Reminder: due today (soft-dedupe in-app; unchanged kind)
  for v_row in
    select *
    from public.worker_commission_invoices
    where status = 'open'
      and due_at::date = current_date
      and due_at > now()
  loop
    perform public.notify_worker_invoice(
      v_row.worker_id,
      'invoice_due_today',
      'Commission payment due today',
      format('Invoice %s is due today.', v_row.invoice_number),
      v_row.id,
      v_row.invoice_number,
      20
    );
    v_reminders_due := v_reminders_due + 1;
  end loop;

  perform set_config('bridgehive.allow_invoice_transition', 'off', true);

  return jsonb_build_object(
    'marked_overdue', v_marked_overdue,
    'reminders_3d', v_reminders_3d,
    'reminders_1d', v_reminders_1d,
    'reminders_due_today', v_reminders_due,
    'restrictions_removed', v_restored
  );
end;
$$;

revoke all on function public.process_worker_commission_due_dates() from public;
grant execute on function public.process_worker_commission_due_dates() to service_role;

-- ---------------------------------------------------------------------------
-- Claim path: recheck invoice eligibility; return invoiceId for Expo builder
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

  -- Drop invoice reminders when paid/void/processing/past due/demo/deleted.
  update public.worker_notification_deliveries d
  set
    status = 'invalid',
    receipt_error = 'invoice_unavailable',
    updated_at = now()
  from public.worker_notification_events e
  left join public.worker_commission_invoices i on i.id = e.invoice_id
  left join public.profiles p on p.id = d.worker_id
  where d.event_id = e.id
    and d.status = 'pending'
    and e.event_type = 'invoice_due_soon'
    and (
      i.id is null
      or i.worker_id <> d.worker_id
      or i.status <> 'open'
      or i.due_at <= now()
      or public.is_app_review_demo_worker(d.worker_id)
      or p.id is null
      or p.account_status <> 'active'
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
          e.invoice_id as "invoiceId",
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

-- Suppress unsent due-soon pushes when a payment session starts (processing).
create or replace function public.suppress_invoice_due_soon_on_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE'
     and new.status is distinct from old.status
     and new.status in ('payment_processing', 'paid', 'void', 'uncollectible', 'past_due') then
    perform public.invalidate_invoice_due_soon_pending(new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists worker_commission_invoices_suppress_due_soon
  on public.worker_commission_invoices;

create trigger worker_commission_invoices_suppress_due_soon
after update of status on public.worker_commission_invoices
for each row
execute function public.suppress_invoice_due_soon_on_status_change();
