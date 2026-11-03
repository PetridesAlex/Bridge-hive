-- 042_live_worker_invoice_payment_intent.sql
-- DEFERRED — not part of the sandbox-only release.
-- Live PaymentIntent recording + apply_worker_invoice_provider_event hardening
-- (provider-id match, p_livemode). Apply only after explicit live-payment approval.
--
-- Compatibility note: currently deployed create-worker-invoice-checkout (v1) does not
-- call apply_worker_invoice_provider_event. Changing that RPC before stripe-webhook
-- is redeployed changes live billing contract for any future webhook apply.

-- 041_worker_invoice_payment_intent.sql
-- Same-project Stripe sandbox isolation + live PaymentSheet hardening.
--
-- Live path: PaymentIntent recording, provider-id match, livemode on apply.
-- Sandbox path: separate tables/RPCs; never settles live invoices, debts,
-- restrictions, commission totals, or normal billing emails.
--
-- Sandbox secrets (Edge only, never in this SQL):
--   STRIPE_TEST_SECRET_KEY, STRIPE_TEST_WEBHOOK_SECRET
-- Live secrets remain: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET

-- ---------------------------------------------------------------------------
-- 1. Live: record PaymentIntent when worker opens PaymentSheet
-- ---------------------------------------------------------------------------

create or replace function public.record_worker_invoice_payment_intent(
  p_invoice_id uuid,
  p_stripe_customer_id text,
  p_payment_intent_id text
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

  if coalesce(
    (select is_app_review_demo from public.worker_profiles where user_id = auth.uid()),
    false
  ) then
    raise exception 'APP_REVIEW_DEMO_FORBIDDEN';
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

  if p_payment_intent_id is null or char_length(trim(p_payment_intent_id)) = 0 then
    raise exception 'PAYMENT_INTENT_REQUIRED';
  end if;

  perform set_config('bridgehive.allow_invoice_transition', 'on', true);

  update public.worker_commission_invoices
  set
    stripe_customer_id = coalesce(nullif(trim(p_stripe_customer_id), ''), stripe_customer_id),
    stripe_payment_intent_id = trim(p_payment_intent_id),
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
    'payment_intent_initiated',
    auth.uid(),
    jsonb_build_object('payment_intent_id', v_row.stripe_payment_intent_id)
  );

  perform public.create_audit_event(
    v_row.organization_id,
    'worker_commission_invoice',
    v_row.id,
    'payment_intent_initiated',
    null,
    jsonb_build_object('invoice_number', v_row.invoice_number)
  );

  return v_row;
end;
$$;

revoke all on function public.record_worker_invoice_payment_intent(uuid, text, text) from public;
grant execute on function public.record_worker_invoice_payment_intent(uuid, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Live: apply provider events with livemode + stored provider id match
-- ---------------------------------------------------------------------------

drop function if exists public.apply_worker_invoice_provider_event(
  text, text, uuid, integer, text, text, text, jsonb
);

create or replace function public.apply_worker_invoice_provider_event(
  p_provider_event_id text,
  p_event_type text,
  p_invoice_id uuid,
  p_amount_minor integer,
  p_currency text,
  p_payment_intent_id text default null,
  p_checkout_session_id text default null,
  p_provider_data jsonb default '{}'::jsonb,
  p_livemode boolean default null
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
  v_session_ok boolean;
  v_pi_ok boolean;
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
          'received_currency', p_currency,
          'livemode', p_livemode
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
      insert into public.worker_invoice_events (
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
          'livemode', p_livemode
        )
      );

      return jsonb_build_object('status', 'rejected', 'reason', 'provider_id_mismatch');
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
          'event_type', p_event_type,
          'livemode', p_livemode
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
        || jsonb_build_object('livemode', p_livemode)
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
        || jsonb_build_object('livemode', p_livemode)
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
        || jsonb_build_object('livemode', p_livemode)
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
      || jsonb_build_object('livemode', p_livemode)
  );

  return jsonb_build_object('status', 'recorded', 'reason', 'generic');
end;
$$;

revoke all on function public.apply_worker_invoice_provider_event(
  text, text, uuid, integer, text, text, text, jsonb, boolean
) from public;
grant execute on function public.apply_worker_invoice_provider_event(
  text, text, uuid, integer, text, text, text, jsonb, boolean
) to service_role;
