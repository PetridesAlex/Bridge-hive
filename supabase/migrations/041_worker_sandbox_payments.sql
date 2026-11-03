-- 041_worker_sandbox_payments.sql
-- SAME-PROJECT Stripe sandbox isolation ONLY (Bridge-Hive hfnymqjrbppculcofaag).
--
-- This migration does NOT:
--   - replace apply_worker_invoice_provider_event
--   - add record_worker_invoice_payment_intent for live invoices
--   - alter worker_commission_invoices columns or rows
--   - change commission_obligations, overdue standing, or billing notifications
--
-- Sandbox Edge secrets (never overwrite live STRIPE_*):
--   STRIPE_TEST_SECRET_KEY, STRIPE_TEST_WEBHOOK_SECRET
--
-- Live PaymentIntent hardening is deferred to 042 (not part of sandbox release).

-- ---------------------------------------------------------------------------
-- 1. Payment sandbox tester flag (server-authorized only)
-- ---------------------------------------------------------------------------

alter table public.worker_profiles
  add column if not exists is_payment_sandbox_tester boolean not null default false;

comment on column public.worker_profiles.is_payment_sandbox_tester is
  'Platform-admin only. Authorizes Stripe sandbox payment functions/tables. Not settable from the client.';

create index if not exists worker_profiles_payment_sandbox_tester_idx
  on public.worker_profiles (user_id)
  where is_payment_sandbox_tester;

create or replace function public.is_payment_sandbox_tester_worker(
  p_worker_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select wp.is_payment_sandbox_tester
      from public.worker_profiles wp
      where wp.user_id = coalesce(p_worker_id, auth.uid())
    ),
    false
  );
$$;

revoke all on function public.is_payment_sandbox_tester_worker(uuid) from public;
revoke all on function public.is_payment_sandbox_tester_worker(uuid) from anon;
grant execute on function public.is_payment_sandbox_tester_worker(uuid) to authenticated;
grant execute on function public.is_payment_sandbox_tester_worker(uuid) to service_role;

-- Guard: only privileged RPC may flip the flag
create or replace function public.worker_profiles_guard_payment_sandbox_tester()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_setting('bridgehive.allow_payment_sandbox_tester', true) = 'on' then
    return new;
  end if;

  if tg_op = 'UPDATE'
     and new.is_payment_sandbox_tester is distinct from old.is_payment_sandbox_tester then
    raise exception 'PAYMENT_SANDBOX_FLAG_IMMUTABLE';
  end if;

  if tg_op = 'INSERT' and coalesce(new.is_payment_sandbox_tester, false) then
    raise exception 'PAYMENT_SANDBOX_FLAG_IMMUTABLE';
  end if;

  return new;
end;
$$;

drop trigger if exists worker_profiles_guard_payment_sandbox_tester on public.worker_profiles;
create trigger worker_profiles_guard_payment_sandbox_tester
before insert or update on public.worker_profiles
for each row
execute function public.worker_profiles_guard_payment_sandbox_tester();

create or replace function public.set_worker_payment_sandbox_tester(
  p_worker_id uuid,
  p_enabled boolean,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_worker public.worker_profiles;
  v_old boolean;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if not public.is_platform_admin(auth.uid()) then
    raise exception 'NOT_AUTHORIZED';
  end if;

  select * into v_worker
  from public.worker_profiles
  where user_id = p_worker_id
  for update;

  if not found then
    raise exception 'WORKER_NOT_FOUND';
  end if;

  if coalesce(v_worker.is_app_review_demo, false) and p_enabled then
    raise exception 'APP_REVIEW_DEMO_CANNOT_BE_PAYMENT_TESTER';
  end if;

  v_old := v_worker.is_payment_sandbox_tester;

  perform set_config('bridgehive.allow_payment_sandbox_tester', 'on', true);

  update public.worker_profiles
  set
    is_payment_sandbox_tester = coalesce(p_enabled, false),
    updated_at = now()
  where user_id = p_worker_id
  returning * into v_worker;

  perform set_config('bridgehive.allow_payment_sandbox_tester', 'off', true);

  perform public.create_audit_event(
    null,
    'worker_profile',
    p_worker_id,
    case when p_enabled then 'enable_payment_sandbox_tester' else 'revoke_payment_sandbox_tester' end,
    jsonb_build_object('is_payment_sandbox_tester', v_old),
    jsonb_build_object(
      'is_payment_sandbox_tester', v_worker.is_payment_sandbox_tester,
      'reason', left(coalesce(p_reason, ''), 500)
    )
  );

  return jsonb_build_object(
    'worker_id', p_worker_id,
    'is_payment_sandbox_tester', v_worker.is_payment_sandbox_tester
  );
end;
$$;

revoke all on function public.set_worker_payment_sandbox_tester(uuid, boolean, text) from public;
revoke all on function public.set_worker_payment_sandbox_tester(uuid, boolean, text) from anon;
grant execute on function public.set_worker_payment_sandbox_tester(uuid, boolean, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Isolated sandbox invoice tables (never enter live finance)
-- ---------------------------------------------------------------------------

create table if not exists public.worker_sandbox_commission_invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null,
  worker_id uuid not null references public.worker_profiles (user_id) on delete restrict,

  currency text not null default 'EUR',
  gross_amount_minor integer not null check (gross_amount_minor >= 0),
  commission_rate_bps integer not null default 1700 check (
    commission_rate_bps >= 0 and commission_rate_bps <= 10000
  ),
  commission_amount_minor integer not null check (commission_amount_minor >= 0),

  status public.worker_invoice_status not null default 'open',
  issued_at timestamptz not null default now(),
  due_at timestamptz not null,
  paid_at timestamptz,

  provider_name text not null default 'stripe_test',
  stripe_customer_id text,
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  provider_metadata jsonb not null default '{}'::jsonb,

  label text not null default 'TEST',
  created_by uuid references auth.users (id),
  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint worker_sandbox_commission_invoices_number_unique unique (invoice_number),
  constraint worker_sandbox_commission_invoices_currency_len check (char_length(currency) = 3),
  constraint worker_sandbox_commission_invoices_due_after_issue check (due_at >= issued_at)
);

create trigger worker_sandbox_commission_invoices_set_updated_at
before update on public.worker_sandbox_commission_invoices
for each row
execute function public.set_updated_at();

create index if not exists worker_sandbox_invoices_worker_status_idx
  on public.worker_sandbox_commission_invoices (worker_id, status);

create table if not exists public.worker_sandbox_invoice_events (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.worker_sandbox_commission_invoices (id) on delete cascade,
  event_type text not null,
  provider_event_id text,
  actor_user_id uuid,
  provider_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint worker_sandbox_invoice_events_provider_event_unique unique (provider_event_id)
);

create index if not exists worker_sandbox_invoice_events_invoice_idx
  on public.worker_sandbox_invoice_events (invoice_id, created_at desc);

alter table public.worker_sandbox_commission_invoices enable row level security;
alter table public.worker_sandbox_invoice_events enable row level security;

drop policy if exists worker_sandbox_invoices_select_own on public.worker_sandbox_commission_invoices;
create policy worker_sandbox_invoices_select_own
  on public.worker_sandbox_commission_invoices
  for select
  to authenticated
  using (
    worker_id = auth.uid()
    and public.is_payment_sandbox_tester_worker(auth.uid())
  );

drop policy if exists worker_sandbox_invoice_events_deny_all on public.worker_sandbox_invoice_events;
create policy worker_sandbox_invoice_events_deny_all
  on public.worker_sandbox_invoice_events
  for all
  to authenticated
  using (false)
  with check (false);

-- ---------------------------------------------------------------------------
-- 3. Sandbox invoice RPCs
-- ---------------------------------------------------------------------------

create or replace function public.create_worker_sandbox_invoice(
  p_worker_id uuid,
  p_commission_amount_minor integer,
  p_currency text default 'EUR',
  p_gross_amount_minor integer default null,
  p_commission_rate_bps integer default 1700,
  p_notes text default null
)
returns public.worker_sandbox_commission_invoices
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.worker_sandbox_commission_invoices;
  v_gross integer;
  v_rate integer;
  v_number text;
  v_issued timestamptz := timezone('utc', now());
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if not public.is_platform_admin(auth.uid()) then
    raise exception 'NOT_AUTHORIZED';
  end if;

  if not public.is_payment_sandbox_tester_worker(p_worker_id) then
    raise exception 'WORKER_NOT_PAYMENT_SANDBOX_TESTER';
  end if;

  if coalesce(
    (select is_app_review_demo from public.worker_profiles where user_id = p_worker_id),
    false
  ) then
    raise exception 'APP_REVIEW_DEMO_FORBIDDEN';
  end if;

  if p_commission_amount_minor is null or p_commission_amount_minor <= 0 then
    raise exception 'INVALID_AMOUNT';
  end if;

  v_rate := coalesce(p_commission_rate_bps, 1700);
  v_gross := coalesce(
    p_gross_amount_minor,
    case when v_rate > 0 then round(p_commission_amount_minor::numeric * 10000 / v_rate)::integer else p_commission_amount_minor end
  );

  v_number := 'TEST-' || to_char(v_issued, 'YYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));

  insert into public.worker_sandbox_commission_invoices (
    invoice_number,
    worker_id,
    currency,
    gross_amount_minor,
    commission_rate_bps,
    commission_amount_minor,
    status,
    issued_at,
    due_at,
    label,
    created_by,
    notes
  )
  values (
    v_number,
    p_worker_id,
    upper(coalesce(nullif(trim(p_currency), ''), 'EUR')),
    v_gross,
    v_rate,
    p_commission_amount_minor,
    'open',
    v_issued,
    v_issued + interval '10 days',
    'TEST',
    auth.uid(),
    left(coalesce(p_notes, ''), 1000)
  )
  returning * into v_row;

  insert into public.worker_sandbox_invoice_events (
    invoice_id, event_type, actor_user_id, provider_data
  )
  values (
    v_row.id,
    'sandbox_invoice_created',
    auth.uid(),
    jsonb_build_object('invoice_number', v_row.invoice_number)
  );

  return v_row;
end;
$$;

revoke all on function public.create_worker_sandbox_invoice(uuid, integer, text, integer, integer, text) from public;
grant execute on function public.create_worker_sandbox_invoice(uuid, integer, text, integer, integer, text) to authenticated;

create or replace function public.list_my_sandbox_commission_invoices()
returns setof public.worker_sandbox_commission_invoices
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if not public.is_payment_sandbox_tester_worker(auth.uid()) then
    raise exception 'NOT_AUTHORIZED';
  end if;

  return query
  select *
  from public.worker_sandbox_commission_invoices
  where worker_id = auth.uid()
  order by due_at asc, issued_at desc;
end;
$$;

revoke all on function public.list_my_sandbox_commission_invoices() from public;
grant execute on function public.list_my_sandbox_commission_invoices() to authenticated;

create or replace function public.get_my_sandbox_commission_invoice(p_invoice_id uuid)
returns public.worker_sandbox_commission_invoices
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_row public.worker_sandbox_commission_invoices;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if not public.is_payment_sandbox_tester_worker(auth.uid()) then
    raise exception 'NOT_AUTHORIZED';
  end if;

  select * into v_row
  from public.worker_sandbox_commission_invoices
  where id = p_invoice_id
    and worker_id = auth.uid();

  if not found then
    raise exception 'INVOICE_NOT_FOUND';
  end if;

  return v_row;
end;
$$;

revoke all on function public.get_my_sandbox_commission_invoice(uuid) from public;
grant execute on function public.get_my_sandbox_commission_invoice(uuid) to authenticated;

create or replace function public.record_worker_sandbox_invoice_payment_intent(
  p_invoice_id uuid,
  p_stripe_customer_id text,
  p_payment_intent_id text
)
returns public.worker_sandbox_commission_invoices
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.worker_sandbox_commission_invoices;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if not public.is_payment_sandbox_tester_worker(auth.uid()) then
    raise exception 'NOT_AUTHORIZED';
  end if;

  if coalesce(
    (select is_app_review_demo from public.worker_profiles where user_id = auth.uid()),
    false
  ) then
    raise exception 'APP_REVIEW_DEMO_FORBIDDEN';
  end if;

  select * into v_row
  from public.worker_sandbox_commission_invoices
  where id = p_invoice_id
  for update;

  if not found then
    raise exception 'INVOICE_NOT_FOUND';
  end if;

  if v_row.worker_id <> auth.uid() then
    raise exception 'NOT_AUTHORIZED';
  end if;

  if v_row.status not in ('open', 'past_due', 'payment_processing') then
    raise exception 'INVOICE_NOT_PAYABLE';
  end if;

  if p_payment_intent_id is null or char_length(trim(p_payment_intent_id)) = 0 then
    raise exception 'PAYMENT_INTENT_REQUIRED';
  end if;

  update public.worker_sandbox_commission_invoices
  set
    stripe_customer_id = coalesce(nullif(trim(p_stripe_customer_id), ''), stripe_customer_id),
    stripe_payment_intent_id = trim(p_payment_intent_id),
    status = 'payment_processing',
    updated_at = now()
  where id = v_row.id
  returning * into v_row;

  insert into public.worker_sandbox_invoice_events (
    invoice_id, event_type, actor_user_id, provider_data
  )
  values (
    v_row.id,
    'payment_intent_initiated',
    auth.uid(),
    jsonb_build_object('payment_intent_id', v_row.stripe_payment_intent_id, 'lane', 'sandbox')
  );

  return v_row;
end;
$$;

revoke all on function public.record_worker_sandbox_invoice_payment_intent(uuid, text, text) from public;
grant execute on function public.record_worker_sandbox_invoice_payment_intent(uuid, text, text) to authenticated;

create or replace function public.record_worker_sandbox_invoice_checkout(
  p_invoice_id uuid,
  p_stripe_customer_id text,
  p_checkout_session_id text
)
returns public.worker_sandbox_commission_invoices
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.worker_sandbox_commission_invoices;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if not public.is_payment_sandbox_tester_worker(auth.uid()) then
    raise exception 'NOT_AUTHORIZED';
  end if;

  if coalesce(
    (select is_app_review_demo from public.worker_profiles where user_id = auth.uid()),
    false
  ) then
    raise exception 'APP_REVIEW_DEMO_FORBIDDEN';
  end if;

  select * into v_row
  from public.worker_sandbox_commission_invoices
  where id = p_invoice_id
  for update;

  if not found then
    raise exception 'INVOICE_NOT_FOUND';
  end if;

  if v_row.worker_id <> auth.uid() then
    raise exception 'NOT_AUTHORIZED';
  end if;

  if v_row.status not in ('open', 'past_due', 'payment_processing') then
    raise exception 'INVOICE_NOT_PAYABLE';
  end if;

  if p_checkout_session_id is null or char_length(trim(p_checkout_session_id)) = 0 then
    raise exception 'CHECKOUT_SESSION_REQUIRED';
  end if;

  update public.worker_sandbox_commission_invoices
  set
    stripe_customer_id = coalesce(nullif(trim(p_stripe_customer_id), ''), stripe_customer_id),
    stripe_checkout_session_id = trim(p_checkout_session_id),
    status = 'payment_processing',
    updated_at = now()
  where id = v_row.id
  returning * into v_row;

  insert into public.worker_sandbox_invoice_events (
    invoice_id, event_type, actor_user_id, provider_data
  )
  values (
    v_row.id,
    'checkout_initiated',
    auth.uid(),
    jsonb_build_object('checkout_session_id', v_row.stripe_checkout_session_id, 'lane', 'sandbox')
  );

  return v_row;
end;
$$;

revoke all on function public.record_worker_sandbox_invoice_checkout(uuid, text, text) from public;
grant execute on function public.record_worker_sandbox_invoice_checkout(uuid, text, text) to authenticated;

-- Service-role only. Never writes live invoices / obligations / standing.
create or replace function public.apply_worker_sandbox_invoice_provider_event(
  p_provider_event_id text,
  p_event_type text,
  p_invoice_id uuid,
  p_amount_minor integer,
  p_currency text,
  p_payment_intent_id text default null,
  p_checkout_session_id text default null,
  p_provider_data jsonb default '{}'::jsonb,
  p_livemode boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.worker_sandbox_commission_invoices;
  v_existing uuid;
  v_session_ok boolean;
  v_pi_ok boolean;
begin
  if p_provider_event_id is null or char_length(trim(p_provider_event_id)) = 0 then
    raise exception 'PROVIDER_EVENT_REQUIRED';
  end if;

  -- Sandbox webhook must never process live Stripe events.
  if coalesce(p_livemode, false) then
    return jsonb_build_object('status', 'ignored', 'reason', 'live_event_rejected');
  end if;

  select id into v_existing
  from public.worker_sandbox_invoice_events
  where provider_event_id = trim(p_provider_event_id);

  if v_existing is not null then
    return jsonb_build_object('status', 'duplicate', 'event_id', v_existing);
  end if;

  if p_invoice_id is null then
    return jsonb_build_object('status', 'ignored', 'reason', 'unknown_invoice');
  end if;

  select * into v_row
  from public.worker_sandbox_commission_invoices
  where id = p_invoice_id
  for update;

  if not found then
    return jsonb_build_object('status', 'ignored', 'reason', 'invoice_not_found');
  end if;

  if lower(trim(coalesce(p_event_type, ''))) in (
    'checkout.session.completed',
    'payment_intent.succeeded',
    'checkout_completed',
    'payment_succeeded'
  ) then
    if p_amount_minor is distinct from v_row.commission_amount_minor
       or upper(coalesce(p_currency, '')) is distinct from upper(v_row.currency) then
      insert into public.worker_sandbox_invoice_events (
        invoice_id, event_type, provider_event_id, provider_data
      )
      values (
        v_row.id,
        'payment_amount_mismatch',
        trim(p_provider_event_id),
        jsonb_build_object(
          'expected_amount', v_row.commission_amount_minor,
          'expected_currency', v_row.currency,
          'received_amount', p_amount_minor,
          'received_currency', p_currency,
          'lane', 'sandbox'
        )
      );
      return jsonb_build_object('status', 'rejected', 'reason', 'amount_or_currency_mismatch');
    end if;

    v_session_ok :=
      p_checkout_session_id is not null
      and char_length(trim(p_checkout_session_id)) > 0
      and v_row.stripe_checkout_session_id is not null
      and trim(p_checkout_session_id) = v_row.stripe_checkout_session_id;

    v_pi_ok :=
      p_payment_intent_id is not null
      and char_length(trim(p_payment_intent_id)) > 0
      and v_row.stripe_payment_intent_id is not null
      and trim(p_payment_intent_id) = v_row.stripe_payment_intent_id;

    if not (v_session_ok or v_pi_ok) then
      insert into public.worker_sandbox_invoice_events (
        invoice_id, event_type, provider_event_id, provider_data
      )
      values (
        v_row.id,
        'payment_provider_id_mismatch',
        trim(p_provider_event_id),
        jsonb_build_object(
          'stored_checkout_session_id', v_row.stripe_checkout_session_id,
          'stored_payment_intent_id', v_row.stripe_payment_intent_id,
          'received_checkout_session_id', p_checkout_session_id,
          'received_payment_intent_id', p_payment_intent_id,
          'lane', 'sandbox'
        )
      );
      return jsonb_build_object('status', 'rejected', 'reason', 'provider_id_mismatch');
    end if;

    update public.worker_sandbox_commission_invoices
    set
      status = 'paid',
      paid_at = coalesce(paid_at, now()),
      stripe_payment_intent_id = coalesce(p_payment_intent_id, stripe_payment_intent_id),
      stripe_checkout_session_id = coalesce(p_checkout_session_id, stripe_checkout_session_id),
      updated_at = now()
    where id = v_row.id
      and status in ('open', 'payment_processing', 'past_due')
    returning * into v_row;

    if not found then
      insert into public.worker_sandbox_invoice_events (
        invoice_id, event_type, provider_event_id, provider_data
      )
      values (
        p_invoice_id,
        'payment_not_transitioned',
        trim(p_provider_event_id),
        jsonb_build_object('lane', 'sandbox', 'event_type', p_event_type)
      );
      return jsonb_build_object('status', 'rejected', 'reason', 'not_transitioned');
    end if;

    insert into public.worker_sandbox_invoice_events (
      invoice_id, event_type, provider_event_id, provider_data
    )
    values (
      v_row.id,
      'payment_confirmed',
      trim(p_provider_event_id),
      coalesce(p_provider_data, '{}'::jsonb) || jsonb_build_object('lane', 'sandbox', 'livemode', false)
    );

    -- Intentionally no: live obligations, overdue standing, billing emails, accounting.
    return jsonb_build_object('status', 'paid', 'invoice_id', v_row.id, 'lane', 'sandbox');
  end if;

  if lower(trim(coalesce(p_event_type, ''))) in (
    'payment_intent.payment_failed',
    'checkout.session.expired',
    'payment_failed',
    'checkout_expired'
  ) then
    insert into public.worker_sandbox_invoice_events (
      invoice_id, event_type, provider_event_id, provider_data
    )
    values (
      v_row.id,
      case
        when lower(p_event_type) like '%expired%' then 'checkout_expired'
        else 'payment_failed'
      end,
      trim(p_provider_event_id),
      coalesce(p_provider_data, '{}'::jsonb) || jsonb_build_object('lane', 'sandbox')
    );

    if v_row.status = 'payment_processing' then
      update public.worker_sandbox_commission_invoices
      set status = 'open', updated_at = now()
      where id = v_row.id;
    end if;

    return jsonb_build_object('status', 'recorded', 'reason', 'payment_failed_or_expired', 'lane', 'sandbox');
  end if;

  insert into public.worker_sandbox_invoice_events (
    invoice_id, event_type, provider_event_id, provider_data
  )
  values (
    v_row.id,
    coalesce(nullif(trim(p_event_type), ''), 'provider_event'),
    trim(p_provider_event_id),
    coalesce(p_provider_data, '{}'::jsonb) || jsonb_build_object('lane', 'sandbox')
  );

  return jsonb_build_object('status', 'recorded', 'reason', 'generic', 'lane', 'sandbox');
end;
$$;

revoke all on function public.apply_worker_sandbox_invoice_provider_event(
  text, text, uuid, integer, text, text, text, jsonb, boolean
) from public;
grant execute on function public.apply_worker_sandbox_invoice_provider_event(
  text, text, uuid, integer, text, text, text, jsonb, boolean
) to service_role;
