-- 018_worker_commission_billing.sql
-- Phase 6: worker-funded commission billing (16% of approved gross).
-- Hospital pays worker approved gross separately.
-- Worker owes Bridge Hive commission via internal invoice + Stripe Checkout.
-- Migrations 001–017 remain frozen.

-- ---------------------------------------------------------------------------
-- 1. Enums and sequences
-- ---------------------------------------------------------------------------

create type public.worker_invoice_status as enum (
  'draft',
  'open',
  'payment_processing',
  'paid',
  'past_due',
  'void',
  'uncollectible'
);

create type public.worker_billing_standing as enum (
  'good_standing',
  'restricted'
);

create sequence public.worker_invoice_number_seq start 1;

-- ---------------------------------------------------------------------------
-- 2. Effective-dated commission rate rules
-- ---------------------------------------------------------------------------

create table public.commission_rate_rules (
  id uuid primary key default gen_random_uuid(),
  rate_bps integer not null check (rate_bps >= 0 and rate_bps <= 10000),
  effective_from timestamptz not null,
  effective_until timestamptz,
  scope text not null default 'global'
    check (scope in ('global', 'organization', 'worker_role')),
  scope_id uuid,
  created_by uuid references public.profiles (id) on delete set null,
  reason text not null check (char_length(trim(reason)) > 0),
  created_at timestamptz not null default now(),
  constraint commission_rate_rules_window check (
    effective_until is null or effective_until > effective_from
  ),
  constraint commission_rate_rules_scope_id check (
    (scope = 'global' and scope_id is null)
    or (scope <> 'global')
  )
);

create index commission_rate_rules_lookup_idx
  on public.commission_rate_rules (scope, effective_from desc);

-- Prevent overlapping active rules for the same scope (no btree_gist dependency).
create or replace function public.commission_rate_rules_guard_overlap()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if exists (
    select 1
    from public.commission_rate_rules r
    where r.id is distinct from coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid)
      and r.scope = new.scope
      and r.scope_id is not distinct from new.scope_id
      and tstzrange(r.effective_from, r.effective_until, '[)')
          && tstzrange(new.effective_from, new.effective_until, '[)')
  ) then
    raise exception 'COMMISSION_RULE_OVERLAP';
  end if;
  return new;
end;
$$;

create trigger commission_rate_rules_guard_overlap
before insert or update on public.commission_rate_rules
for each row
execute function public.commission_rate_rules_guard_overlap();

insert into public.commission_rate_rules (
  rate_bps, effective_from, scope, created_by, reason
)
values (
  1600,
  '1970-01-01 00:00:00+00'::timestamptz,
  'global',
  null,
  'Phase 6 system seed: default 16% worker-funded commission'
);

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
    v_rate := public.get_setting_int('default_commission_rate_bps', 1600);
  end if;

  return v_rate;
end;
$$;

revoke all on function public.get_effective_commission_rate_bps(timestamptz) from public;
grant execute on function public.get_effective_commission_rate_bps(timestamptz) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Worker commission invoices (authoritative internal ledger)
-- ---------------------------------------------------------------------------

create table public.worker_commission_invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null,
  worker_id uuid not null references public.worker_profiles (user_id) on delete restrict,
  assignment_id uuid not null references public.shift_assignments (id) on delete restrict,
  timesheet_id uuid not null references public.timesheets (id) on delete restrict,
  organization_id uuid not null references public.organizations (id) on delete restrict,

  currency text not null default 'EUR',
  approved_minutes integer not null check (approved_minutes >= 0),
  rate_minor integer not null check (rate_minor > 0),
  gross_amount_minor integer not null check (gross_amount_minor >= 0),
  commission_rate_bps integer not null check (
    commission_rate_bps >= 0 and commission_rate_bps <= 10000
  ),
  commission_amount_minor integer not null check (commission_amount_minor >= 0),

  status public.worker_invoice_status not null default 'open',
  issued_at timestamptz not null default now(),
  due_at timestamptz not null,
  paid_at timestamptz,
  past_due_at timestamptz,
  voided_at timestamptz,
  void_reason text,

  provider_name text not null default 'stripe',
  stripe_customer_id text,
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  provider_metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint worker_commission_invoices_number_unique unique (invoice_number),
  constraint worker_commission_invoices_timesheet_unique unique (timesheet_id),
  constraint worker_commission_invoices_assignment_unique unique (assignment_id),
  constraint worker_commission_invoices_currency_len check (char_length(currency) = 3),
  constraint worker_commission_invoices_due_after_issue check (due_at >= issued_at)
);

create trigger worker_commission_invoices_set_updated_at
before update on public.worker_commission_invoices
for each row
execute function public.set_updated_at();

create index worker_commission_invoices_worker_status_idx
  on public.worker_commission_invoices (worker_id, status);
create index worker_commission_invoices_due_open_idx
  on public.worker_commission_invoices (due_at)
  where status in ('open', 'payment_processing', 'past_due');
create index worker_commission_invoices_org_idx
  on public.worker_commission_invoices (organization_id);
create index worker_commission_invoices_stripe_session_idx
  on public.worker_commission_invoices (stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;

create or replace function public.worker_invoices_guard_immutable_snapshot()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    if new.invoice_number is distinct from old.invoice_number
       or new.worker_id is distinct from old.worker_id
       or new.assignment_id is distinct from old.assignment_id
       or new.timesheet_id is distinct from old.timesheet_id
       or new.organization_id is distinct from old.organization_id
       or new.currency is distinct from old.currency
       or new.approved_minutes is distinct from old.approved_minutes
       or new.rate_minor is distinct from old.rate_minor
       or new.gross_amount_minor is distinct from old.gross_amount_minor
       or new.commission_rate_bps is distinct from old.commission_rate_bps
       or new.commission_amount_minor is distinct from old.commission_amount_minor
       or new.issued_at is distinct from old.issued_at
       or new.due_at is distinct from old.due_at then
      if current_setting('bridgehive.allow_invoice_admin', true) is distinct from 'on' then
        raise exception 'INVOICE_SNAPSHOT_IMMUTABLE';
      end if;
    end if;

    -- Clients cannot flip to paid / void without privileged flag.
    if new.status is distinct from old.status
       and current_setting('bridgehive.allow_invoice_transition', true) is distinct from 'on' then
      raise exception 'INVOICE_STATUS_LOCKED';
    end if;
  end if;
  return new;
end;
$$;

create trigger worker_invoices_guard_immutable_snapshot
before update on public.worker_commission_invoices
for each row
execute function public.worker_invoices_guard_immutable_snapshot();

create or replace function public.worker_invoices_block_client_delete()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'INVOICE_DELETE_FORBIDDEN';
end;
$$;

create trigger worker_invoices_block_client_delete
before delete on public.worker_commission_invoices
for each row
execute function public.worker_invoices_block_client_delete();

-- ---------------------------------------------------------------------------
-- 4. Provider / invoice events (idempotent by provider_event_id)
-- ---------------------------------------------------------------------------

create table public.worker_invoice_events (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.worker_commission_invoices (id) on delete cascade,
  event_type text not null check (char_length(trim(event_type)) > 0),
  provider_event_id text,
  actor_user_id uuid references public.profiles (id) on delete set null,
  provider_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index worker_invoice_events_provider_event_uidx
  on public.worker_invoice_events (provider_event_id)
  where provider_event_id is not null;

create index worker_invoice_events_invoice_idx
  on public.worker_invoice_events (invoice_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 5. Payout constraint: org owes worker gross only (commission is worker-funded)
-- ---------------------------------------------------------------------------

-- Preserve historical commission_amount_minor on payouts for audit, but align
-- organization_total_due_minor to gross (hospital does not pay commission).
alter table public.payouts
  drop constraint if exists payouts_org_total;

-- Temporarily allow writes to snapshot columns for this one-time realignment.
create or replace function public.payouts_guard_immutable_snapshot()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' then
    if current_setting('bridgehive.allow_payout_realign', true) = 'on' then
      return new;
    end if;
    if new.gross_amount_minor is distinct from old.gross_amount_minor
       or new.commission_rate_bps is distinct from old.commission_rate_bps
       or new.commission_amount_minor is distinct from old.commission_amount_minor
       or new.worker_transfer_amount_minor is distinct from old.worker_transfer_amount_minor
       or new.organization_total_due_minor is distinct from old.organization_total_due_minor
       or new.currency is distinct from old.currency
       or new.approved_minutes is distinct from old.approved_minutes
       or new.rate_minor is distinct from old.rate_minor
       or new.assignment_id is distinct from old.assignment_id
       or new.worker_id is distinct from old.worker_id
       or new.organization_id is distinct from old.organization_id then
      raise exception 'PAYOUT_SNAPSHOT_IMMUTABLE';
    end if;
  end if;
  return new;
end;
$$;

select set_config('bridgehive.allow_payout_realign', 'on', true);

update public.payouts
set organization_total_due_minor = gross_amount_minor
where organization_total_due_minor is distinct from gross_amount_minor;

select set_config('bridgehive.allow_payout_realign', 'off', true);

alter table public.payouts
  add constraint payouts_org_total check (
    organization_total_due_minor = gross_amount_minor
  );

comment on constraint payouts_org_total on public.payouts is
  'Phase 6: hospital owes worker approved gross only. Commission is a separate worker obligation.';
-- ---------------------------------------------------------------------------
-- 6. Billing standing helpers
-- ---------------------------------------------------------------------------

create or replace function public.worker_has_overdue_commission(p_worker_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.worker_commission_invoices i
    where i.worker_id = p_worker_id
      and i.due_at <= now()
      and i.status in ('open', 'payment_processing', 'past_due')
  );
$$;

revoke all on function public.worker_has_overdue_commission(uuid) from public;
grant execute on function public.worker_has_overdue_commission(uuid) to authenticated;

create or replace function public.get_worker_billing_standing(p_worker_id uuid)
returns public.worker_billing_standing
language sql
stable
security definer
set search_path = public
as $$
  select case
    when public.worker_has_overdue_commission(p_worker_id) then 'restricted'::public.worker_billing_standing
    else 'good_standing'::public.worker_billing_standing
  end;
$$;

revoke all on function public.get_worker_billing_standing(uuid) from public;
grant execute on function public.get_worker_billing_standing(uuid) to authenticated;

-- Keep old name as alias via SQL view-like wrapper only if no type collision;
-- Prefer get_worker_billing_standing in application code.

create or replace function public.next_worker_invoice_number()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seq bigint;
begin
  v_seq := nextval('public.worker_invoice_number_seq');
  return 'WCI-' || to_char(timezone('UTC', now()), 'YYYY') || '-' || lpad(v_seq::text, 6, '0');
end;
$$;

revoke all on function public.next_worker_invoice_number() from public;

-- ---------------------------------------------------------------------------
-- 7. Deduplicated invoice notification helper
-- ---------------------------------------------------------------------------

create or replace function public.notify_worker_invoice(
  p_worker_id uuid,
  p_type text,
  p_title text,
  p_body text,
  p_invoice_id uuid,
  p_invoice_number text,
  p_dedupe_hours integer default 20
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1
    from public.notifications n
    where n.user_id = p_worker_id
      and n.type = p_type
      and n.data->>'invoice_id' = p_invoice_id::text
      and n.created_at > now() - make_interval(hours => greatest(p_dedupe_hours, 1))
  ) then
    return;
  end if;

  insert into public.notifications (user_id, type, title, body, data)
  values (
    p_worker_id,
    p_type,
    p_title,
    p_body,
    jsonb_build_object(
      'invoice_id', p_invoice_id,
      'invoice_number', p_invoice_number
    )
  );
end;
$$;

revoke all on function public.notify_worker_invoice(uuid, text, text, text, uuid, text, integer) from public;

-- ---------------------------------------------------------------------------
-- 8. Replace create_financial_snapshot (worker invoice + org owes gross)
-- ---------------------------------------------------------------------------

create or replace function public.create_financial_snapshot(p_assignment_id uuid)
returns public.payouts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_assignment public.shift_assignments;
  v_shift public.shifts;
  v_ts public.timesheets;
  v_account public.payout_accounts;
  v_payout public.payouts;
  v_invoice public.worker_commission_invoices;
  v_rate_bps integer;
  v_due_days integer;
  v_gross integer;
  v_commission_amt integer;
  v_issued_at timestamptz;
  v_due_at timestamptz;
  v_org_name text;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select * into v_assignment
  from public.shift_assignments
  where id = p_assignment_id;

  if not found then
    raise exception 'ASSIGNMENT_NOT_FOUND';
  end if;

  select * into v_payout from public.payouts where assignment_id = p_assignment_id;
  if found then
    return v_payout;
  end if;

  if v_assignment.status <> 'approved' then
    raise exception 'ASSIGNMENT_NOT_APPROVED';
  end if;

  select * into v_shift from public.shifts where id = v_assignment.shift_id;

  if not (
    public.has_org_role(
      v_shift.organization_id,
      array['org_admin'::public.org_role, 'org_scheduler'::public.org_role]
    )
    or public.is_platform_admin('platform_finance')
    or current_setting('bridgehive.allow_timesheet_review', true) = 'on'
  ) then
    raise exception 'NOT_AUTHORIZED';
  end if;

  select * into v_ts
  from public.timesheets
  where assignment_id = p_assignment_id
    and status = 'approved';

  if not found or v_ts.approved_minutes is null then
    raise exception 'APPROVED_TIMESHEET_REQUIRED';
  end if;

  -- Idempotent: invoice already exists for this timesheet
  select * into v_invoice
  from public.worker_commission_invoices
  where timesheet_id = v_ts.id;

  if found then
    select * into v_payout from public.payouts where assignment_id = p_assignment_id;
    if found then
      return v_payout;
    end if;
  end if;

  select * into v_account
  from public.payout_accounts
  where worker_id = v_assignment.worker_id
    and status = 'verified';

  v_issued_at := coalesce(v_ts.reviewed_at, now());
  v_rate_bps := public.get_effective_commission_rate_bps(v_issued_at);
  v_due_days := public.get_setting_int('payout_due_days', 7);

  -- Integer cents; round half up via numeric round()
  v_gross := round((v_shift.rate_minor::numeric * v_ts.approved_minutes::numeric) / 60.0)::integer;
  v_commission_amt := round((v_gross::numeric * v_rate_bps::numeric) / 10000.0)::integer;
  v_due_at := v_issued_at + interval '10 days';

  insert into public.payouts (
    worker_id, assignment_id, organization_id, payout_account_id,
    gross_amount_minor, commission_rate_bps, commission_amount_minor,
    worker_transfer_amount_minor, organization_total_due_minor,
    currency, approved_minutes, rate_minor, status, due_at
  )
  values (
    v_assignment.worker_id, v_assignment.id, v_shift.organization_id, v_account.id,
    v_gross, v_rate_bps, v_commission_amt,
    v_gross, v_gross, -- hospital owes worker gross only
    v_shift.currency, v_ts.approved_minutes, v_shift.rate_minor,
    case
      when v_account.id is not null then 'payment_instruction_ready'::public.payout_status
      else 'approved'::public.payout_status
    end,
    now() + make_interval(days => v_due_days)
  )
  returning * into v_payout;

  -- Legacy commission_obligations row kept for schema continuity, payer = worker.
  insert into public.commission_obligations (
    organization_id, worker_id, assignment_id, payout_id,
    gross_amount_minor, commission_rate_bps, commission_amount_minor,
    currency, payer_type, status, due_at, invoice_reference
  )
  values (
    v_shift.organization_id, v_assignment.worker_id, v_assignment.id, v_payout.id,
    v_gross, v_rate_bps, v_commission_amt, v_shift.currency,
    'worker', 'invoiced', v_due_at, null
  )
  on conflict (assignment_id) do nothing;

  perform set_config('bridgehive.allow_invoice_transition', 'on', true);

  insert into public.worker_commission_invoices (
    invoice_number, worker_id, assignment_id, timesheet_id, organization_id,
    currency, approved_minutes, rate_minor,
    gross_amount_minor, commission_rate_bps, commission_amount_minor,
    status, issued_at, due_at
  )
  values (
    public.next_worker_invoice_number(),
    v_assignment.worker_id,
    v_assignment.id,
    v_ts.id,
    v_shift.organization_id,
    v_shift.currency,
    v_ts.approved_minutes,
    v_shift.rate_minor,
    v_gross,
    v_rate_bps,
    v_commission_amt,
    'open',
    v_issued_at,
    v_due_at
  )
  on conflict (timesheet_id) do nothing
  returning * into v_invoice;

  if v_invoice.id is null then
    select * into v_invoice
    from public.worker_commission_invoices
    where timesheet_id = v_ts.id;
  end if;

  update public.commission_obligations
  set invoice_reference = v_invoice.invoice_number
  where assignment_id = v_assignment.id
    and invoice_reference is null;

  perform set_config('bridgehive.allow_invoice_transition', 'off', true);

  select coalesce(display_name, legal_name) into v_org_name
  from public.organizations
  where id = v_shift.organization_id;

  perform public.create_audit_event(
    v_shift.organization_id,
    'worker_commission_invoice',
    v_invoice.id,
    'invoice_created',
    null,
    jsonb_build_object(
      'invoice_number', v_invoice.invoice_number,
      'gross_amount_minor', v_gross,
      'commission_amount_minor', v_commission_amt,
      'commission_rate_bps', v_rate_bps,
      'due_at', v_due_at,
      'payout_id', v_payout.id
    )
  );

  perform public.notify_worker_invoice(
    v_assignment.worker_id,
    'invoice_issued',
    'Bridge Hive commission invoice',
    format(
      'Your Bridge Hive commission invoice %s is due in 10 calendar days. The hospital pays your approved gross shift amount separately.',
      v_invoice.invoice_number
    ),
    v_invoice.id,
    v_invoice.invoice_number,
    24
  );

  return v_payout;
end;
$$;

-- ---------------------------------------------------------------------------
-- 9. Eligibility: billing restriction blocks new claims
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
    select t.cred_type into v_missing
    from unnest(public.worker_required_credential_types(v_worker.worker_role)) as t(cred_type)
    where not exists (
      select 1
      from public.credentials c
      where c.worker_id = p_worker_id
        and c.credential_type = t.cred_type
        and c.status = 'verified'
        and (c.expires_at is null or c.expires_at > now())
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

-- Marketplace browse: hide new claimable shifts when billing-restricted
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
  )
  and not public.worker_has_overdue_commission(auth.uid())
);

-- ---------------------------------------------------------------------------
-- 10. Due-date processor (idempotent)
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
    end if;
  end loop;

  -- Reminder: 3 calendar days remaining
  for v_row in
    select *
    from public.worker_commission_invoices
    where status = 'open'
      and due_at > now()
      and due_at <= now() + interval '3 days'
      and due_at > now() + interval '1 day'
  loop
    perform public.notify_worker_invoice(
      v_row.worker_id,
      'invoice_due_soon',
      'Commission payment due soon',
      format('Invoice %s is due in 3 calendar days or less.', v_row.invoice_number),
      v_row.id,
      v_row.invoice_number,
      20
    );
    v_reminders_3d := v_reminders_3d + 1;
  end loop;

  -- Reminder: 1 calendar day remaining
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

  -- Reminder: due today
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

create or replace function public.run_worker_commission_due_dates()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if not (
    public.is_platform_admin('platform_finance')
    or public.is_platform_admin('platform_super_admin')
  ) then
    raise exception 'NOT_AUTHORIZED';
  end if;

  return public.process_worker_commission_due_dates();
end;
$$;

revoke all on function public.run_worker_commission_due_dates() from public;
grant execute on function public.run_worker_commission_due_dates() to authenticated;

-- Schedule via pg_cron when available (do not fail migration if missing).
do $$
begin
  if exists (
    select 1 from pg_available_extensions where name = 'pg_cron'
  ) then
    begin
      create extension if not exists pg_cron with schema extensions;
      perform cron.unschedule('process-worker-commission-overdue');
    exception when others then
      null;
    end;

    begin
      perform cron.schedule(
        'process-worker-commission-overdue',
        '15 * * * *',
        $cron$select public.process_worker_commission_due_dates()$cron$
      );
    exception when others then
      raise notice 'pg_cron schedule skipped: %', sqlerrm;
    end;
  else
    raise notice 'pg_cron not available; process_worker_commission_due_dates prepared but not scheduled';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 11. Checkout initiation + authoritative payment apply (server-only)
-- ---------------------------------------------------------------------------

create or replace function public.record_worker_invoice_checkout(
  p_invoice_id uuid,
  p_stripe_customer_id text,
  p_checkout_session_id text
)
returns public.worker_commission_invoices
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.worker_commission_invoices;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select * into v_row
  from public.worker_commission_invoices
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

  perform set_config('bridgehive.allow_invoice_transition', 'on', true);

  update public.worker_commission_invoices
  set
    stripe_customer_id = coalesce(nullif(trim(p_stripe_customer_id), ''), stripe_customer_id),
    stripe_checkout_session_id = trim(p_checkout_session_id),
    status = case
      when status = 'past_due' then 'past_due'::public.worker_invoice_status
      else 'payment_processing'::public.worker_invoice_status
    end,
    updated_at = now()
  where id = v_row.id
  returning * into v_row;

  perform set_config('bridgehive.allow_invoice_transition', 'off', true);

  insert into public.worker_invoice_events (
    invoice_id, event_type, actor_user_id, provider_data
  )
  values (
    v_row.id,
    'checkout_initiated',
    auth.uid(),
    jsonb_build_object('checkout_session_id', v_row.stripe_checkout_session_id)
  );

  perform public.create_audit_event(
    v_row.organization_id,
    'worker_commission_invoice',
    v_row.id,
    'checkout_initiated',
    null,
    jsonb_build_object('invoice_number', v_row.invoice_number)
  );

  return v_row;
end;
$$;

revoke all on function public.record_worker_invoice_checkout(uuid, text, text) from public;
grant execute on function public.record_worker_invoice_checkout(uuid, text, text) to authenticated;

create or replace function public.apply_worker_invoice_provider_event(
  p_provider_event_id text,
  p_event_type text,
  p_invoice_id uuid,
  p_amount_minor integer,
  p_currency text,
  p_payment_intent_id text default null,
  p_checkout_session_id text default null,
  p_provider_data jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.worker_commission_invoices;
  v_existing uuid;
  v_had_overdue boolean;
  v_still_overdue boolean;
  v_transitioned boolean;
begin
  if p_provider_event_id is null or char_length(trim(p_provider_event_id)) = 0 then
    raise exception 'PROVIDER_EVENT_REQUIRED';
  end if;

  select id into v_existing
  from public.worker_invoice_events
  where provider_event_id = trim(p_provider_event_id);

  if v_existing is not null then
    return jsonb_build_object('status', 'duplicate', 'event_id', v_existing);
  end if;

  if p_invoice_id is null then
    return jsonb_build_object('status', 'ignored', 'reason', 'unknown_invoice');
  end if;

  select * into v_row
  from public.worker_commission_invoices
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
      insert into public.worker_invoice_events (
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
          'received_currency', p_currency
        )
      );

      return jsonb_build_object('status', 'rejected', 'reason', 'amount_or_currency_mismatch');
    end if;

    v_had_overdue := public.worker_has_overdue_commission(v_row.worker_id);

    perform set_config('bridgehive.allow_invoice_transition', 'on', true);

    update public.worker_commission_invoices
    set
      status = 'paid',
      paid_at = coalesce(paid_at, now()),
      stripe_payment_intent_id = coalesce(p_payment_intent_id, stripe_payment_intent_id),
      stripe_checkout_session_id = coalesce(p_checkout_session_id, stripe_checkout_session_id),
      updated_at = now()
    where id = v_row.id
      and status in ('open', 'payment_processing', 'past_due')
    returning * into v_row;

    v_transitioned := found;

    perform set_config('bridgehive.allow_invoice_transition', 'off', true);

    if not v_transitioned then
      insert into public.worker_invoice_events (
        invoice_id, event_type, provider_event_id, provider_data
      )
      values (
        p_invoice_id,
        'payment_not_transitioned',
        trim(p_provider_event_id),
        jsonb_build_object(
          'reason', 'status_not_payable',
          'event_type', p_event_type
        )
      );

      return jsonb_build_object(
        'status', 'rejected',
        'reason', 'not_transitioned'
      );
    end if;

    insert into public.worker_invoice_events (
      invoice_id, event_type, provider_event_id, provider_data
    )
    values (
      v_row.id,
      'payment_confirmed',
      trim(p_provider_event_id),
      coalesce(p_provider_data, '{}'::jsonb)
    );

    update public.commission_obligations
    set status = 'paid', paid_at = coalesce(paid_at, now())
    where assignment_id = v_row.assignment_id
      and status is distinct from 'paid';

    perform public.create_audit_event(
      v_row.organization_id,
      'worker_commission_invoice',
      v_row.id,
      'payment_confirmed',
      null,
      jsonb_build_object('invoice_number', v_row.invoice_number)
    );

    perform public.notify_worker_invoice(
      v_row.worker_id,
      'payment_confirmed',
      'Payment confirmed',
      format('Payment for invoice %s is confirmed.', v_row.invoice_number),
      v_row.id,
      v_row.invoice_number,
      24
    );

    v_still_overdue := public.worker_has_overdue_commission(v_row.worker_id);

    if v_had_overdue and not v_still_overdue then
      perform public.notify_worker_invoice(
        v_row.worker_id,
        'marketplace_restored',
        'Marketplace access restored',
        'All overdue commission invoices are paid. You can claim new shifts again if otherwise eligible.',
        v_row.id,
        v_row.invoice_number,
        24
      );

      perform public.create_audit_event(
        v_row.organization_id,
        'worker_billing',
        v_row.worker_id,
        'billing_restriction_removed',
        null,
        jsonb_build_object('invoice_id', v_row.id)
      );
    end if;

    return jsonb_build_object('status', 'paid', 'invoice_id', v_row.id);
  end if;

  if lower(trim(coalesce(p_event_type, ''))) in (
    'payment_intent.payment_failed',
    'checkout.session.expired',
    'payment_failed',
    'checkout_expired'
  ) then
    insert into public.worker_invoice_events (
      invoice_id, event_type, provider_event_id, provider_data
    )
    values (
      v_row.id,
      case
        when lower(p_event_type) like '%expired%' then 'checkout_expired'
        else 'payment_failed'
      end,
      trim(p_provider_event_id),
      coalesce(p_provider_data, '{}'::jsonb)
    );

    if v_row.status = 'payment_processing' then
      perform set_config('bridgehive.allow_invoice_transition', 'on', true);
      update public.worker_commission_invoices
      set
        status = case
          when due_at <= now() then 'past_due'::public.worker_invoice_status
          else 'open'::public.worker_invoice_status
        end,
        past_due_at = case
          when due_at <= now() then coalesce(past_due_at, now())
          else past_due_at
        end,
        updated_at = now()
      where id = v_row.id;
      perform set_config('bridgehive.allow_invoice_transition', 'off', true);
    end if;

    perform public.notify_worker_invoice(
      v_row.worker_id,
      'payment_failed',
      'Payment not completed',
      format('Payment for invoice %s was not completed. You can try again.', v_row.invoice_number),
      v_row.id,
      v_row.invoice_number,
      6
    );

    return jsonb_build_object('status', 'recorded', 'reason', 'payment_failed_or_expired');
  end if;

  if lower(trim(coalesce(p_event_type, ''))) in (
    'charge.refunded',
    'refund',
    'charge.refund.updated'
  ) then
    insert into public.worker_invoice_events (
      invoice_id, event_type, provider_event_id, provider_data
    )
    values (
      v_row.id,
      'refund_exception',
      trim(p_provider_event_id),
      coalesce(p_provider_data, '{}'::jsonb)
    );

    perform public.create_audit_event(
      v_row.organization_id,
      'worker_commission_invoice',
      v_row.id,
      'refund_exception',
      null,
      jsonb_build_object('invoice_number', v_row.invoice_number)
    );

    return jsonb_build_object('status', 'recorded', 'reason', 'refund_exception');
  end if;

  insert into public.worker_invoice_events (
    invoice_id, event_type, provider_event_id, provider_data
  )
  values (
    v_row.id,
    coalesce(nullif(trim(p_event_type), ''), 'provider_event'),
    trim(p_provider_event_id),
    coalesce(p_provider_data, '{}'::jsonb)
  );

  return jsonb_build_object('status', 'recorded', 'reason', 'generic');
end;
$$;

revoke all on function public.apply_worker_invoice_provider_event(
  text, text, uuid, integer, text, text, text, jsonb
) from public;
grant execute on function public.apply_worker_invoice_provider_event(
  text, text, uuid, integer, text, text, text, jsonb
) to service_role;

-- ---------------------------------------------------------------------------
-- 11b. Finance void path (excludes voided invoices from overdue standing)
-- ---------------------------------------------------------------------------

create or replace function public.void_worker_commission_invoice(
  p_invoice_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.worker_commission_invoices;
  v_had_overdue boolean;
  v_still_overdue boolean;
  v_reason text := trim(coalesce(p_reason, ''));
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if not (
    public.is_platform_admin('platform_finance')
    or public.is_platform_admin('platform_super_admin')
  ) then
    raise exception 'NOT_AUTHORIZED';
  end if;

  if char_length(v_reason) < 3 then
    raise exception 'VOID_REASON_REQUIRED';
  end if;

  select * into v_row
  from public.worker_commission_invoices
  where id = p_invoice_id
  for update;

  if not found then
    raise exception 'INVOICE_NOT_FOUND';
  end if;

  if v_row.status = 'void' then
    return jsonb_build_object(
      'status', 'already_void',
      'invoice_id', v_row.id,
      'standing', public.get_worker_billing_standing(v_row.worker_id)
    );
  end if;

  if v_row.status = 'paid' then
    raise exception 'INVOICE_ALREADY_PAID';
  end if;

  if v_row.status not in ('open', 'past_due', 'payment_processing', 'draft') then
    raise exception 'INVOICE_NOT_VOIDABLE';
  end if;

  v_had_overdue := public.worker_has_overdue_commission(v_row.worker_id);

  perform set_config('bridgehive.allow_invoice_transition', 'on', true);

  update public.worker_commission_invoices
  set
    status = 'void',
    voided_at = coalesce(voided_at, now()),
    updated_at = now()
  where id = v_row.id
  returning * into v_row;

  perform set_config('bridgehive.allow_invoice_transition', 'off', true);

  update public.commission_obligations
  set status = 'waived'
  where assignment_id = v_row.assignment_id
    and status is distinct from 'paid'
    and status is distinct from 'waived';

  insert into public.worker_invoice_events (
    invoice_id, event_type, provider_event_id, provider_data
  )
  values (
    v_row.id,
    'finance_void',
    null,
    jsonb_build_object(
      'reason', v_reason,
      'voided_by', auth.uid()
    )
  );

  perform public.create_audit_event(
    v_row.organization_id,
    'worker_commission_invoice',
    v_row.id,
    'voided',
    null,
    jsonb_build_object(
      'invoice_number', v_row.invoice_number,
      'reason', v_reason
    )
  );

  perform public.notify_worker_invoice(
    v_row.worker_id,
    'invoice_voided',
    'Commission invoice voided',
    format('Invoice %s was voided by Bridge Hive finance.', v_row.invoice_number),
    v_row.id,
    v_row.invoice_number,
    24
  );

  v_still_overdue := public.worker_has_overdue_commission(v_row.worker_id);

  if v_had_overdue and not v_still_overdue then
    perform public.notify_worker_invoice(
      v_row.worker_id,
      'marketplace_restored',
      'Marketplace access restored',
      'All overdue commission invoices are cleared. You can claim new shifts again if otherwise eligible.',
      v_row.id,
      v_row.invoice_number,
      24
    );

    perform public.create_audit_event(
      v_row.organization_id,
      'worker_billing',
      v_row.worker_id,
      'billing_restriction_removed',
      null,
      jsonb_build_object('invoice_id', v_row.id, 'via', 'void')
    );
  end if;

  return jsonb_build_object(
    'status', 'void',
    'invoice_id', v_row.id,
    'standing', public.get_worker_billing_standing(v_row.worker_id)
  );
end;
$$;

revoke all on function public.void_worker_commission_invoice(uuid, text) from public;
grant execute on function public.void_worker_commission_invoice(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 12. Finance metrics + list RPCs
-- ---------------------------------------------------------------------------

create or replace function public.get_finance_metrics(
  p_period_start timestamptz default date_trunc('month', now()),
  p_period_end timestamptz default now()
)
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

  if not (
    public.is_platform_admin('platform_finance')
    or public.is_platform_admin('platform_super_admin')
  ) then
    raise exception 'NOT_AUTHORIZED';
  end if;

  return jsonb_build_object(
    'open_count', (
      select count(*)::integer from public.worker_commission_invoices where status = 'open'
    ),
    'open_amount_minor', (
      select coalesce(sum(commission_amount_minor), 0)::integer
      from public.worker_commission_invoices where status = 'open'
    ),
    'past_due_count', (
      select count(*)::integer
      from public.worker_commission_invoices
      where due_at <= now()
        and status in ('open', 'payment_processing', 'past_due')
    ),
    'past_due_amount_minor', (
      select coalesce(sum(commission_amount_minor), 0)::integer
      from public.worker_commission_invoices
      where due_at <= now()
        and status in ('open', 'payment_processing', 'past_due')
    ),
    'paid_count', (
      select count(*)::integer
      from public.worker_commission_invoices
      where status = 'paid'
        and paid_at >= p_period_start
        and paid_at <= p_period_end
    ),
    'paid_amount_minor', (
      select coalesce(sum(commission_amount_minor), 0)::integer
      from public.worker_commission_invoices
      where status = 'paid'
        and paid_at >= p_period_start
        and paid_at <= p_period_end
    ),
    'due_within_3_days_count', (
      select count(*)::integer
      from public.worker_commission_invoices
      where status in ('open', 'payment_processing')
        and due_at > now()
        and due_at <= now() + interval '3 days'
    ),
    'restricted_worker_count', (
      select count(distinct worker_id)::integer
      from public.worker_commission_invoices
      where due_at <= now()
        and status in ('open', 'payment_processing', 'past_due')
    ),
    'payment_exceptions_count', (
      select count(*)::integer
      from public.worker_invoice_events
      where event_type in ('payment_failed', 'refund_exception', 'payment_amount_mismatch')
        and created_at >= p_period_start
        and created_at <= p_period_end
    )
  );
end;
$$;

revoke all on function public.get_finance_metrics(timestamptz, timestamptz) from public;
grant execute on function public.get_finance_metrics(timestamptz, timestamptz) to authenticated;

create or replace function public.list_finance_invoices(
  p_status text default null,
  p_worker_role text default null,
  p_organization_id uuid default null,
  p_due_before timestamptz default null,
  p_due_after timestamptz default null,
  p_search text default null,
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  id uuid,
  invoice_number text,
  worker_id uuid,
  worker_name text,
  worker_role public.worker_role,
  organization_id uuid,
  organization_name text,
  shift_starts_at timestamptz,
  gross_amount_minor integer,
  commission_amount_minor integer,
  commission_rate_bps integer,
  currency text,
  issued_at timestamptz,
  due_at timestamptz,
  paid_at timestamptz,
  status public.worker_invoice_status,
  provider_name text,
  stripe_checkout_session_id text,
  stripe_payment_intent_id text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_limit integer := greatest(1, least(coalesce(p_limit, 50), 100));
  v_offset integer := greatest(0, coalesce(p_offset, 0));
  v_search text := nullif(trim(coalesce(p_search, '')), '');
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if not (
    public.is_platform_admin('platform_finance')
    or public.is_platform_admin('platform_super_admin')
  ) then
    raise exception 'NOT_AUTHORIZED';
  end if;

  return query
  select
    i.id,
    i.invoice_number,
    i.worker_id,
    p.full_name as worker_name,
    wp.worker_role,
    i.organization_id,
    coalesce(o.display_name, o.legal_name) as organization_name,
    s.starts_at as shift_starts_at,
    i.gross_amount_minor,
    i.commission_amount_minor,
    i.commission_rate_bps,
    i.currency,
    i.issued_at,
    i.due_at,
    i.paid_at,
    i.status,
    i.provider_name,
    i.stripe_checkout_session_id,
    i.stripe_payment_intent_id
  from public.worker_commission_invoices i
  join public.profiles p on p.id = i.worker_id
  join public.worker_profiles wp on wp.user_id = i.worker_id
  join public.organizations o on o.id = i.organization_id
  join public.shift_assignments a on a.id = i.assignment_id
  join public.shifts s on s.id = a.shift_id
  where (p_status is null or i.status::text = p_status)
    and (p_worker_role is null or wp.worker_role::text = p_worker_role)
    and (p_organization_id is null or i.organization_id = p_organization_id)
    and (p_due_before is null or i.due_at <= p_due_before)
    and (p_due_after is null or i.due_at >= p_due_after)
    and (
      v_search is null
      or i.invoice_number ilike '%' || v_search || '%'
      or p.full_name ilike '%' || v_search || '%'
      or coalesce(o.display_name, o.legal_name) ilike '%' || v_search || '%'
    )
  order by i.due_at asc, i.issued_at desc
  limit v_limit
  offset v_offset;
end;
$$;

revoke all on function public.list_finance_invoices(
  text, text, uuid, timestamptz, timestamptz, text, integer, integer
) from public;
grant execute on function public.list_finance_invoices(
  text, text, uuid, timestamptz, timestamptz, text, integer, integer
) to authenticated;

-- Worker helper: overdue summary for banner
create or replace function public.get_my_billing_restriction_summary()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_amount integer;
  v_count integer;
  v_oldest timestamptz;
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select
    coalesce(sum(commission_amount_minor), 0)::integer,
    count(*)::integer,
    min(due_at)
  into v_amount, v_count, v_oldest
  from public.worker_commission_invoices
  where worker_id = v_uid
    and due_at <= now()
    and status in ('open', 'payment_processing', 'past_due');

  return jsonb_build_object(
    'standing', public.get_worker_billing_standing(v_uid),
    'overdue_count', v_count,
    'overdue_amount_minor', v_amount,
    'oldest_due_at', v_oldest
  );
end;
$$;

revoke all on function public.get_my_billing_restriction_summary() from public;
grant execute on function public.get_my_billing_restriction_summary() to authenticated;

-- ---------------------------------------------------------------------------
-- 13. RLS
-- ---------------------------------------------------------------------------

alter table public.commission_rate_rules enable row level security;
alter table public.worker_commission_invoices enable row level security;
alter table public.worker_invoice_events enable row level security;

create policy "commission_rate_rules_select_finance"
on public.commission_rate_rules for select to authenticated
using (
  public.is_platform_admin('platform_finance')
  or public.is_platform_admin('platform_super_admin')
);

-- No direct client writes to rate rules in this phase (service/SQL only).

create policy "worker_invoices_select_own"
on public.worker_commission_invoices for select to authenticated
using (worker_id = auth.uid());

create policy "worker_invoices_select_finance"
on public.worker_commission_invoices for select to authenticated
using (
  public.is_platform_admin('platform_finance')
  or public.is_platform_admin('platform_super_admin')
);

-- No insert/update/delete policies for clients — SECURITY DEFINER RPCs only.

create policy "worker_invoice_events_select_finance"
on public.worker_invoice_events for select to authenticated
using (
  public.is_platform_admin('platform_finance')
  or public.is_platform_admin('platform_super_admin')
);

-- Org cannot read commission invoices (no org policy).
-- Workers cannot read provider events (no worker policy on events).

revoke all on table public.commission_rate_rules from anon;
revoke all on table public.worker_commission_invoices from anon;
revoke all on table public.worker_invoice_events from anon;

grant select on table public.commission_rate_rules to authenticated;
grant select on table public.worker_commission_invoices to authenticated;
grant select on table public.worker_invoice_events to authenticated;

-- Tighten legacy commission_obligations: org may still see own rows for historical
-- org-funded obligations; worker-funded rows must not expose Stripe fields (none on that table).
-- No change required beyond new invoices privacy.

comment on table public.worker_commission_invoices is
  'Authoritative Bridge Hive commission invoices owed by workers (16% of approved gross).';
comment on table public.commission_rate_rules is
  'Effective-dated commission rate configuration. Snapshots on invoices are immutable.';
comment on function public.process_worker_commission_due_dates() is
  'Idempotent overdue processor. Scheduled via pg_cron when available; otherwise invoke via service role or run_worker_commission_due_dates.';
