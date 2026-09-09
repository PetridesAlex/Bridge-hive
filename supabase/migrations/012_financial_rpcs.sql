-- 012_financial_rpcs.sql
-- Financial workflow: snapshot on approval, payment instructions, report, reconcile.

create or replace function public.get_setting_int(p_key text, p_default integer)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select (value_json #>> '{}')::integer from public.platform_settings where key = p_key),
    p_default
  );
$$;

create or replace function public.submit_payout_account(
  p_country text,
  p_currency text,
  p_masked_iban text
)
returns public.payout_accounts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.payout_accounts;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if not exists (
    select 1 from public.worker_profiles where user_id = auth.uid()
  ) then
    raise exception 'WORKER_PROFILE_REQUIRED';
  end if;

  insert into public.payout_accounts (
    worker_id, country, currency, masked_iban, status
  )
  values (
    auth.uid(),
    upper(p_country),
    upper(p_currency),
    p_masked_iban,
    'pending'
  )
  on conflict (worker_id) do update
  set
    country = excluded.country,
    currency = excluded.currency,
    masked_iban = excluded.masked_iban,
    status = 'pending',
    verified_at = null,
    updated_at = now()
  where public.payout_accounts.status in ('pending', 'failed', 'rejected')
  returning * into v_row;

  if v_row.id is null then
    raise exception 'PAYOUT_ACCOUNT_LOCKED';
  end if;

  insert into public.payout_account_events (payout_account_id, event_type, actor_user_id)
  values (v_row.id, 'submitted', auth.uid());

  perform public.create_audit_event(
    null,
    'payout_account',
    v_row.id,
    'submit_payout_account',
    null,
    to_jsonb(v_row)
  );

  return v_row;
end;
$$;

create or replace function public.verify_payout_account(
  p_payout_account_id uuid,
  p_decision text,
  p_reason_code text default null
)
returns public.payout_accounts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.payout_accounts;
  v_decision text := lower(trim(p_decision));
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if not public.is_platform_admin('platform_finance') then
    raise exception 'NOT_AUTHORIZED';
  end if;

  if v_decision not in ('approve', 'reject') then
    raise exception 'INVALID_DECISION';
  end if;

  select * into v_row
  from public.payout_accounts
  where id = p_payout_account_id
  for update;

  if not found then
    raise exception 'PAYOUT_ACCOUNT_NOT_FOUND';
  end if;

  if v_decision = 'approve' then
    update public.payout_accounts
    set
      status = 'verified',
      verified_at = now(),
      last_verified_at = now(),
      updated_at = now()
    where id = v_row.id
    returning * into v_row;

    -- Promote awaiting payouts for this worker to payment_instruction_ready.
    update public.payouts
    set
      payout_account_id = v_row.id,
      status = 'payment_instruction_ready',
      updated_at = now()
    where worker_id = v_row.worker_id
      and status = 'approved'
      and payout_account_id is null;
  else
    update public.payout_accounts
    set status = 'rejected', updated_at = now()
    where id = v_row.id
    returning * into v_row;
  end if;

  insert into public.payout_account_events (
    payout_account_id, event_type, reason_code, actor_user_id
  )
  values (
    v_row.id,
    'verify_' || v_decision,
    p_reason_code,
    auth.uid()
  );

  perform public.create_audit_event(
    null,
    'payout_account',
    v_row.id,
    'verify_payout_account_' || v_decision,
    null,
    to_jsonb(v_row)
  );

  return v_row;
end;
$$;

create or replace function public.generate_payment_instructions(p_payout_id uuid)
returns public.payouts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payout public.payouts;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select * into v_payout
  from public.payouts
  where id = p_payout_id
  for update;

  if not found then
    raise exception 'PAYOUT_NOT_FOUND';
  end if;

  if not (
    public.has_org_role(
      v_payout.organization_id,
      array['org_admin'::public.org_role, 'org_billing'::public.org_role]
    )
    or public.is_platform_admin('platform_finance')
  ) then
    raise exception 'NOT_AUTHORIZED';
  end if;

  if v_payout.status not in ('approved', 'payment_instruction_ready') then
    raise exception 'PAYOUT_STATUS_INVALID';
  end if;

  if v_payout.payout_account_id is null then
    raise exception 'PAYOUT_ACCOUNT_REQUIRED';
  end if;

  update public.payouts
  set status = 'payment_instruction_ready', updated_at = now()
  where id = v_payout.id
  returning * into v_payout;

  perform public.create_audit_event(
    v_payout.organization_id,
    'payout',
    v_payout.id,
    'generate_payment_instructions',
    null,
    to_jsonb(v_payout)
  );

  return v_payout;
end;
$$;

create or replace function public.report_organization_payment(
  p_payout_id uuid,
  p_bank_reference text,
  p_evidence_storage_path text default null
)
returns public.organization_payment_reports
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payout public.payouts;
  v_report public.organization_payment_reports;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select * into v_payout
  from public.payouts
  where id = p_payout_id
  for update;

  if not found then
    raise exception 'PAYOUT_NOT_FOUND';
  end if;

  if not public.has_org_role(
    v_payout.organization_id,
    array['org_admin'::public.org_role, 'org_billing'::public.org_role]
  ) then
    raise exception 'NOT_AUTHORIZED';
  end if;

  if v_payout.status not in ('payment_instruction_ready', 'overdue', 'reported_paid', 'reconciliation_pending') then
    raise exception 'PAYOUT_STATUS_INVALID';
  end if;

  if p_bank_reference is null or char_length(trim(p_bank_reference)) = 0 then
    raise exception 'BANK_REFERENCE_REQUIRED';
  end if;

  -- Reporting is NEVER authoritative "paid" — moves to reconciliation_pending.
  update public.payouts
  set
    status = 'reconciliation_pending',
    reported_paid_at = now(),
    bank_reference = trim(p_bank_reference),
    updated_at = now()
  where id = v_payout.id
  returning * into v_payout;

  insert into public.organization_payment_reports (
    organization_id,
    payout_id,
    bank_reference,
    reported_by,
    evidence_storage_path
  )
  values (
    v_payout.organization_id,
    v_payout.id,
    trim(p_bank_reference),
    auth.uid(),
    p_evidence_storage_path
  )
  returning * into v_report;

  perform public.create_audit_event(
    v_payout.organization_id,
    'organization_payment_report',
    v_report.id,
    'report_organization_payment',
    null,
    to_jsonb(v_report)
  );

  insert into public.notifications (user_id, type, title, body, data)
  values (
    v_payout.worker_id,
    'payment_reported',
    'Payment reported by organization',
    'The organization reported a bank transfer. Reconciliation is pending.',
    jsonb_build_object('payout_id', v_payout.id, 'report_id', v_report.id)
  );

  return v_report;
end;
$$;

create or replace function public.reconcile_direct_transfer(
  p_payout_id uuid,
  p_admin_note text default null
)
returns public.payouts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payout public.payouts;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if not public.is_platform_admin('platform_finance') then
    raise exception 'NOT_AUTHORIZED';
  end if;

  select * into v_payout
  from public.payouts
  where id = p_payout_id
  for update;

  if not found then
    raise exception 'PAYOUT_NOT_FOUND';
  end if;

  if v_payout.status <> 'reconciliation_pending' then
    raise exception 'PAYOUT_NOT_PENDING_RECONCILIATION';
  end if;

  update public.payouts
  set
    status = 'reconciled',
    reconciled_at = now(),
    updated_at = now()
  where id = v_payout.id
  returning * into v_payout;

  update public.organization_payment_reports
  set
    reconciled_at = now(),
    reconciled_by = auth.uid()
  where payout_id = v_payout.id
    and reconciled_at is null;

  perform public.create_audit_event(
    v_payout.organization_id,
    'payout',
    v_payout.id,
    'reconcile_direct_transfer',
    jsonb_build_object('note', p_admin_note),
    to_jsonb(v_payout)
  );

  insert into public.notifications (user_id, type, title, body, data)
  values (
    v_payout.worker_id,
    'payment_reconciled',
    'Payment confirmed',
    'Your payout has been reconciled and confirmed.',
    jsonb_build_object('payout_id', v_payout.id)
  );

  return v_payout;
end;
$$;

create or replace function public.mark_payout_overdue(p_payout_id uuid)
returns public.payouts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payout public.payouts;
begin
  if not (
    public.is_platform_admin('platform_finance')
    or public.is_platform_admin('platform_support')
  ) then
    raise exception 'NOT_AUTHORIZED';
  end if;

  select * into v_payout from public.payouts where id = p_payout_id for update;
  if not found then
    raise exception 'PAYOUT_NOT_FOUND';
  end if;

  if v_payout.status not in ('approved', 'payment_instruction_ready') then
    raise exception 'PAYOUT_STATUS_INVALID';
  end if;

  if v_payout.due_at > now() then
    raise exception 'PAYOUT_NOT_PAST_DUE';
  end if;

  update public.payouts
  set status = 'overdue', updated_at = now()
  where id = v_payout.id
  returning * into v_payout;

  perform public.create_audit_event(
    v_payout.organization_id,
    'payout',
    v_payout.id,
    'mark_payout_overdue',
    null,
    to_jsonb(v_payout)
  );

  return v_payout;
end;
$$;

-- Re-assert review_timesheet always attempts financial snapshot after approve.
create or replace function public.review_timesheet(
  p_timesheet_id uuid,
  p_decision text,
  p_approved_minutes integer default null,
  p_review_note text default null
)
returns public.timesheets
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ts public.timesheets;
  v_assignment public.shift_assignments;
  v_shift public.shifts;
  v_decision text := lower(trim(p_decision));
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if v_decision not in ('approve', 'reject') then
    raise exception 'INVALID_DECISION';
  end if;

  select * into v_ts
  from public.timesheets
  where id = p_timesheet_id
  for update;

  if not found then
    raise exception 'TIMESHEET_NOT_FOUND';
  end if;

  if v_ts.status <> 'submitted' then
    raise exception 'TIMESHEET_NOT_SUBMITTED';
  end if;

  select * into v_assignment
  from public.shift_assignments
  where id = v_ts.assignment_id
  for update;

  select * into v_shift
  from public.shifts
  where id = v_assignment.shift_id;

  if not public.has_org_role(
    v_shift.organization_id,
    array['org_admin'::public.org_role, 'org_scheduler'::public.org_role]
  ) then
    raise exception 'NOT_AUTHORIZED';
  end if;

  perform set_config('bridgehive.allow_timesheet_review', 'on', true);

  if v_decision = 'approve' then
    if p_approved_minutes is null or p_approved_minutes < 0 then
      raise exception 'APPROVED_MINUTES_REQUIRED';
    end if;

    update public.timesheets
    set
      status = 'approved',
      approved_minutes = p_approved_minutes,
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      review_note = p_review_note,
      updated_at = now()
    where id = v_ts.id
    returning * into v_ts;

    update public.shift_assignments
    set status = 'approved', updated_at = now()
    where id = v_assignment.id;

    update public.shifts
    set status = 'completed', updated_at = now()
    where id = v_shift.id
      and status in ('filled', 'in_progress', 'awaiting_approval');

    perform public.create_financial_snapshot(v_assignment.id);
  else
    if p_review_note is null or char_length(trim(p_review_note)) = 0 then
      raise exception 'REVIEW_NOTE_REQUIRED';
    end if;

    update public.timesheets
    set
      status = 'rejected',
      approved_minutes = null,
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      review_note = p_review_note,
      updated_at = now()
    where id = v_ts.id
    returning * into v_ts;

    update public.shift_assignments
    set status = 'rejected', updated_at = now()
    where id = v_assignment.id;
  end if;

  perform set_config('bridgehive.allow_timesheet_review', 'off', true);

  perform public.create_audit_event(
    v_shift.organization_id,
    'timesheet',
    v_ts.id,
    'review_timesheet_' || v_decision,
    jsonb_build_object('status', 'submitted'),
    to_jsonb(v_ts)
  );

  insert into public.notifications (user_id, type, title, body, data)
  values (
    v_assignment.worker_id,
    'timesheet_' || v_decision,
    case when v_decision = 'approve' then 'Timesheet approved' else 'Timesheet rejected' end,
    case
      when v_decision = 'approve' then 'Your submitted hours were approved.'
      else coalesce(p_review_note, 'Your timesheet was rejected.')
    end,
    jsonb_build_object(
      'timesheet_id', v_ts.id,
      'assignment_id', v_assignment.id,
      'decision', v_decision
    )
  );

  return v_ts;
end;
$$;

-- Financial snapshot (immutable amounts). Called from review_timesheet after approve.
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
  v_commission public.commission_obligations;
  v_rate_bps integer;
  v_due_days integer;
  v_gross integer;
  v_commission_amt integer;
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

  select * into v_account
  from public.payout_accounts
  where worker_id = v_assignment.worker_id
    and status = 'verified';

  v_rate_bps := public.get_setting_int('default_commission_rate_bps', 1600);
  v_due_days := public.get_setting_int('payout_due_days', 7);

  v_gross := round((v_shift.rate_minor::numeric * v_ts.approved_minutes::numeric) / 60.0)::integer;
  v_commission_amt := round((v_gross::numeric * v_rate_bps::numeric) / 10000.0)::integer;

  insert into public.payouts (
    worker_id,
    assignment_id,
    organization_id,
    payout_account_id,
    gross_amount_minor,
    commission_rate_bps,
    commission_amount_minor,
    worker_transfer_amount_minor,
    organization_total_due_minor,
    currency,
    approved_minutes,
    rate_minor,
    status,
    due_at
  )
  values (
    v_assignment.worker_id,
    v_assignment.id,
    v_shift.organization_id,
    v_account.id,
    v_gross,
    v_rate_bps,
    v_commission_amt,
    v_gross,
    v_gross + v_commission_amt,
    v_shift.currency,
    v_ts.approved_minutes,
    v_shift.rate_minor,
    case
      when v_account.id is not null then 'payment_instruction_ready'::public.payout_status
      else 'approved'::public.payout_status
    end,
    now() + make_interval(days => v_due_days)
  )
  returning * into v_payout;

  insert into public.commission_obligations (
    organization_id,
    worker_id,
    assignment_id,
    payout_id,
    gross_amount_minor,
    commission_rate_bps,
    commission_amount_minor,
    currency,
    payer_type,
    status,
    due_at
  )
  values (
    v_shift.organization_id,
    v_assignment.worker_id,
    v_assignment.id,
    v_payout.id,
    v_gross,
    v_rate_bps,
    v_commission_amt,
    v_shift.currency,
    'organization',
    'pending',
    v_payout.due_at
  )
  returning * into v_commission;

  perform public.create_audit_event(
    v_shift.organization_id,
    'payout',
    v_payout.id,
    'create_financial_snapshot',
    null,
    jsonb_build_object(
      'payout', to_jsonb(v_payout),
      'commission', to_jsonb(v_commission)
    )
  );

  return v_payout;
end;
$$;

revoke all on function public.get_setting_int(text, integer) from public;
grant execute on function public.get_setting_int(text, integer) to authenticated;

revoke all on function public.create_financial_snapshot(uuid) from public;
grant execute on function public.create_financial_snapshot(uuid) to authenticated;

revoke all on function public.submit_payout_account(text, text, text) from public;
grant execute on function public.submit_payout_account(text, text, text) to authenticated;

revoke all on function public.verify_payout_account(uuid, text, text) from public;
grant execute on function public.verify_payout_account(uuid, text, text) to authenticated;

revoke all on function public.generate_payment_instructions(uuid) from public;
grant execute on function public.generate_payment_instructions(uuid) to authenticated;

revoke all on function public.report_organization_payment(uuid, text, text) from public;
grant execute on function public.report_organization_payment(uuid, text, text) to authenticated;

revoke all on function public.reconcile_direct_transfer(uuid, text) from public;
grant execute on function public.reconcile_direct_transfer(uuid, text) to authenticated;

revoke all on function public.mark_payout_overdue(uuid) from public;
grant execute on function public.mark_payout_overdue(uuid) to authenticated;
