-- 011_financial_layer.sql
-- Direct organization-to-worker bank transfer pilot + commission obligations.
-- Product decisions (docs/product-decisions.md):
--   - Organization pays worker GROSS; organization pays platform commission separately
--   - Payout accounts store masked IBAN only (no raw IBAN in app DB for MVP)

create type public.payout_account_status as enum (
  'pending',
  'verified',
  'failed',
  'rejected',
  'expired',
  'suspended'
);

create type public.payout_status as enum (
  'approved',
  'payment_instruction_ready',
  'reported_paid',
  'reconciliation_pending',
  'reconciled',
  'overdue',
  'disputed',
  'failed',
  'cancelled'
);

create type public.commission_payer_type as enum (
  'organization',
  'worker'
);

create type public.commission_status as enum (
  'pending',
  'invoiced',
  'paid',
  'overdue',
  'disputed',
  'waived'
);

create type public.pay_run_status as enum (
  'draft',
  'approved',
  'released',
  'cancelled'
);

-- Default platform commission rate in basis points (1600 = 16%).
-- Historical snapshots store the rate used at approval time.
create table public.platform_settings (
  key text primary key,
  value_json jsonb not null,
  updated_at timestamptz not null default now()
);

insert into public.platform_settings (key, value_json)
values
  ('default_commission_rate_bps', '1600'::jsonb),
  ('payout_due_days', '7'::jsonb)
on conflict (key) do nothing;

alter table public.platform_settings enable row level security;

create policy "platform_settings_select_authenticated"
on public.platform_settings
for select
to authenticated
using (true);

revoke all on table public.platform_settings from anon;
grant select on table public.platform_settings to authenticated;

-- ---------------------------------------------------------------------------
-- Payout accounts (worker bank destination — masked display only)
-- ---------------------------------------------------------------------------

create table public.payout_accounts (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references public.worker_profiles (user_id) on delete cascade,
  provider text not null default 'manual_bank',
  external_account_id text,
  country text not null default 'CY',
  currency text not null default 'EUR',
  masked_iban text not null,
  status public.payout_account_status not null default 'pending',
  verified_at timestamptz,
  last_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payout_accounts_worker_unique unique (worker_id),
  constraint payout_accounts_currency_len check (char_length(currency) = 3),
  constraint payout_accounts_masked_nonempty check (char_length(trim(masked_iban)) > 0)
);

create trigger payout_accounts_set_updated_at
before update on public.payout_accounts
for each row
execute function public.set_updated_at();

create table public.payout_account_events (
  id uuid primary key default gen_random_uuid(),
  payout_account_id uuid not null references public.payout_accounts (id) on delete cascade,
  event_type text not null,
  provider_event_id text,
  reason_code text,
  actor_user_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint payout_account_events_type_nonempty check (char_length(trim(event_type)) > 0)
);

-- ---------------------------------------------------------------------------
-- Pay runs (optional batching)
-- ---------------------------------------------------------------------------

create table public.pay_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  period_start timestamptz not null,
  period_end timestamptz not null,
  status public.pay_run_status not null default 'draft',
  total_minor integer not null default 0 check (total_minor >= 0),
  approved_by uuid references public.profiles (id) on delete set null,
  released_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pay_runs_period_check check (period_end > period_start)
);

create trigger pay_runs_set_updated_at
before update on public.pay_runs
for each row
execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Payouts = immutable financial snapshot + direct-transfer lifecycle
-- ---------------------------------------------------------------------------

create table public.payouts (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references public.worker_profiles (user_id) on delete restrict,
  assignment_id uuid not null references public.shift_assignments (id) on delete restrict,
  organization_id uuid not null references public.organizations (id) on delete restrict,
  pay_run_id uuid references public.pay_runs (id) on delete set null,
  payout_account_id uuid references public.payout_accounts (id) on delete restrict,

  -- Immutable snapshot at timesheet approval
  gross_amount_minor integer not null check (gross_amount_minor >= 0),
  commission_rate_bps integer not null check (commission_rate_bps >= 0 and commission_rate_bps <= 10000),
  commission_amount_minor integer not null check (commission_amount_minor >= 0),
  worker_transfer_amount_minor integer not null check (worker_transfer_amount_minor >= 0),
  organization_total_due_minor integer not null check (organization_total_due_minor >= 0),
  currency text not null,
  approved_minutes integer not null check (approved_minutes >= 0),
  rate_minor integer not null check (rate_minor > 0),

  status public.payout_status not null default 'approved',
  due_at timestamptz not null,
  reported_paid_at timestamptz,
  reconciled_at timestamptz,
  bank_reference text,
  failure_code text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint payouts_one_per_assignment unique (assignment_id),
  constraint payouts_currency_len check (char_length(currency) = 3),
  -- Pilot model: worker receives gross; org also owes commission separately.
  constraint payouts_worker_gets_gross check (worker_transfer_amount_minor = gross_amount_minor),
  constraint payouts_org_total check (
    organization_total_due_minor = gross_amount_minor + commission_amount_minor
  )
);

create trigger payouts_set_updated_at
before update on public.payouts
for each row
execute function public.set_updated_at();

-- Block client mutation of immutable snapshot fields.
create or replace function public.payouts_guard_immutable_snapshot()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' then
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

create trigger payouts_guard_immutable_snapshot
before update on public.payouts
for each row
execute function public.payouts_guard_immutable_snapshot();

-- ---------------------------------------------------------------------------
-- Commission obligations (org-funded in pilot)
-- ---------------------------------------------------------------------------

create table public.commission_obligations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  worker_id uuid references public.worker_profiles (user_id) on delete set null,
  assignment_id uuid not null references public.shift_assignments (id) on delete restrict,
  payout_id uuid not null references public.payouts (id) on delete restrict,

  gross_amount_minor integer not null check (gross_amount_minor >= 0),
  commission_rate_bps integer not null check (commission_rate_bps >= 0 and commission_rate_bps <= 10000),
  commission_amount_minor integer not null check (commission_amount_minor >= 0),
  currency text not null,

  payer_type public.commission_payer_type not null default 'organization',
  status public.commission_status not null default 'pending',
  due_at timestamptz not null,
  paid_at timestamptz,
  invoice_reference text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint commission_obligations_one_per_assignment unique (assignment_id),
  constraint commission_obligations_currency_len check (char_length(currency) = 3)
);

create trigger commission_obligations_set_updated_at
before update on public.commission_obligations
for each row
execute function public.set_updated_at();

create or replace function public.commission_guard_immutable_amounts()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' then
    if new.gross_amount_minor is distinct from old.gross_amount_minor
       or new.commission_rate_bps is distinct from old.commission_rate_bps
       or new.commission_amount_minor is distinct from old.commission_amount_minor
       or new.currency is distinct from old.currency
       or new.payer_type is distinct from old.payer_type
       or new.assignment_id is distinct from old.assignment_id
       or new.payout_id is distinct from old.payout_id then
      raise exception 'COMMISSION_SNAPSHOT_IMMUTABLE';
    end if;
  end if;
  return new;
end;
$$;

create trigger commission_guard_immutable_amounts
before update on public.commission_obligations
for each row
execute function public.commission_guard_immutable_amounts();

-- ---------------------------------------------------------------------------
-- Organization payment reports (evidence; not authoritative "paid")
-- ---------------------------------------------------------------------------

create table public.organization_payment_reports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  payout_id uuid not null references public.payouts (id) on delete restrict,
  bank_reference text not null,
  reported_at timestamptz not null default now(),
  reported_by uuid not null references public.profiles (id) on delete restrict,
  evidence_storage_path text,
  reconciled_at timestamptz,
  reconciled_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint organization_payment_reports_ref_nonempty check (
    char_length(trim(bank_reference)) > 0
  )
);

-- Optional payment adjustments (never silently rewrite approved snapshots)
create table public.payment_adjustments (
  id uuid primary key default gen_random_uuid(),
  payout_id uuid not null references public.payouts (id) on delete restrict,
  organization_id uuid not null references public.organizations (id) on delete restrict,
  adjustment_minor integer not null,
  currency text not null,
  reason text not null,
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint payment_adjustments_reason_nonempty check (char_length(trim(reason)) > 0),
  constraint payment_adjustments_currency_len check (char_length(currency) = 3)
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index if not exists payout_accounts_worker_id_idx on public.payout_accounts (worker_id);
create index if not exists payout_accounts_status_idx on public.payout_accounts (status);
create index if not exists payout_account_events_account_idx on public.payout_account_events (payout_account_id, created_at desc);

create index if not exists pay_runs_org_idx on public.pay_runs (organization_id, status);
create index if not exists payouts_org_status_idx on public.payouts (organization_id, status);
create index if not exists payouts_worker_status_idx on public.payouts (worker_id, status);
create index if not exists payouts_due_at_idx on public.payouts (due_at);
create index if not exists commission_obligations_org_status_idx on public.commission_obligations (organization_id, status);
create index if not exists organization_payment_reports_payout_idx on public.organization_payment_reports (payout_id);
create index if not exists payment_adjustments_payout_idx on public.payment_adjustments (payout_id);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.payout_accounts enable row level security;
alter table public.payout_account_events enable row level security;
alter table public.pay_runs enable row level security;
alter table public.payouts enable row level security;
alter table public.commission_obligations enable row level security;
alter table public.organization_payment_reports enable row level security;
alter table public.payment_adjustments enable row level security;

-- Payout accounts: worker owns; org sees only masked fields via payouts join (not full table by default).
create policy "payout_accounts_select_own"
on public.payout_accounts for select to authenticated
using (
  worker_id = auth.uid()
  or public.is_platform_admin('platform_finance')
);

create policy "payout_accounts_insert_own"
on public.payout_accounts for insert to authenticated
with check (worker_id = auth.uid());

create policy "payout_accounts_update_own_pending"
on public.payout_accounts for update to authenticated
using (worker_id = auth.uid() and status in ('pending', 'failed', 'rejected'))
with check (worker_id = auth.uid());

create policy "payout_accounts_update_platform_finance"
on public.payout_accounts for update to authenticated
using (public.is_platform_admin('platform_finance'))
with check (public.is_platform_admin('platform_finance'));

-- Events
create policy "payout_account_events_select_own"
on public.payout_account_events for select to authenticated
using (
  exists (
    select 1 from public.payout_accounts pa
    where pa.id = payout_account_events.payout_account_id
      and (pa.worker_id = auth.uid() or public.is_platform_admin('platform_finance'))
  )
);

-- Pay runs
create policy "pay_runs_select_org"
on public.pay_runs for select to authenticated
using (
  public.is_org_member(organization_id)
  or public.is_platform_admin('platform_finance')
);

create policy "pay_runs_mutate_org_billing"
on public.pay_runs for all to authenticated
using (
  public.has_org_role(organization_id, array['org_admin'::public.org_role, 'org_billing'::public.org_role])
)
with check (
  public.has_org_role(organization_id, array['org_admin'::public.org_role, 'org_billing'::public.org_role])
);

-- Payouts
create policy "payouts_select_worker"
on public.payouts for select to authenticated
using (worker_id = auth.uid());

create policy "payouts_select_org"
on public.payouts for select to authenticated
using (
  public.is_org_member(organization_id)
  or public.is_platform_admin('platform_finance')
);

-- Commission
create policy "commission_obligations_select_org"
on public.commission_obligations for select to authenticated
using (
  public.is_org_member(organization_id)
  or public.is_platform_admin('platform_finance')
);

-- Payment reports
create policy "organization_payment_reports_select_org"
on public.organization_payment_reports for select to authenticated
using (
  public.is_org_member(organization_id)
  or public.is_platform_admin('platform_finance')
);

create policy "organization_payment_reports_insert_org_billing"
on public.organization_payment_reports for insert to authenticated
with check (
  public.has_org_role(
    organization_id,
    array['org_admin'::public.org_role, 'org_billing'::public.org_role]
  )
);

-- Adjustments
create policy "payment_adjustments_select_org_or_finance"
on public.payment_adjustments for select to authenticated
using (
  public.is_org_member(organization_id)
  or public.is_platform_admin('platform_finance')
);

create policy "payment_adjustments_insert_platform_finance"
on public.payment_adjustments for insert to authenticated
with check (public.is_platform_admin('platform_finance'));

revoke all on table public.payout_accounts from anon;
revoke all on table public.payout_account_events from anon;
revoke all on table public.pay_runs from anon;
revoke all on table public.payouts from anon;
revoke all on table public.commission_obligations from anon;
revoke all on table public.organization_payment_reports from anon;
revoke all on table public.payment_adjustments from anon;

grant select, insert, update on table public.payout_accounts to authenticated;
grant select on table public.payout_account_events to authenticated;
grant select, insert, update, delete on table public.pay_runs to authenticated;
grant select on table public.payouts to authenticated;
grant select on table public.commission_obligations to authenticated;
grant select, insert on table public.organization_payment_reports to authenticated;
grant select, insert on table public.payment_adjustments to authenticated;
