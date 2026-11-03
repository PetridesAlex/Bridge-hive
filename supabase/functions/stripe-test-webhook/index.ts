// stripe-test-webhook
// Verifies Stripe TEST webhook signatures with STRIPE_TEST_WEBHOOK_SECRET.
// Applies only to worker_sandbox_* tables. Never touches live invoices,
// debts, suspension, commission totals, or normal billing emails.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import Stripe from 'https://esm.sh/stripe@17.5.0?target=deno';
import { resolveSandboxPaymentSecrets } from '../_shared/stripe-mode.ts';

function paymentIntentIdFrom(
  value: string | Stripe.PaymentIntent | null | undefined,
): string | null {
  if (typeof value === 'string' && value.length > 0) return value;
  if (value && typeof value === 'object' && typeof value.id === 'string') {
    return value.id;
  }
  return null;
}

Deno.serve(async (req) => {
  const resolved = resolveSandboxPaymentSecrets({
    STRIPE_TEST_SECRET_KEY: Deno.env.get('STRIPE_TEST_SECRET_KEY'),
    STRIPE_TEST_WEBHOOK_SECRET: Deno.env.get('STRIPE_TEST_WEBHOOK_SECRET'),
  });
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  if (!resolved) {
    return new Response('sandbox payment provider not configured', { status: 503 });
  }
  const webhookSecret = resolved.webhookSecret;

  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return new Response('missing signature', { status: 400 });
  }

  const rawBody = await req.text();
  const stripe = new Stripe(resolved.key, {
    apiVersion: '2024-11-20.acacia',
    httpClient: Stripe.createFetchHttpClient(),
  });

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      webhookSecret,
    );
  } catch {
    return new Response('invalid signature', { status: 400 });
  }

  // Reject any live-mode event — sandbox lane is test-only.
  if (event.livemode) {
    return new Response(
      JSON.stringify({
        status: 'ignored',
        reason: 'live_event_rejected',
        lane: 'sandbox',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  const apply = async (args: {
    eventType: string;
    invoiceId: string | null;
    amountMinor: number | null;
    currency: string | null;
    paymentIntentId: string | null;
    checkoutSessionId: string | null;
    providerData?: Record<string, unknown>;
  }) => {
    const { data, error } = await supabase.rpc(
      'apply_worker_sandbox_invoice_provider_event',
      {
        p_provider_event_id: event.id,
        p_event_type: args.eventType,
        p_invoice_id: args.invoiceId,
        p_amount_minor: args.amountMinor,
        p_currency: args.currency,
        p_payment_intent_id: args.paymentIntentId,
        p_checkout_session_id: args.checkoutSessionId,
        p_provider_data: {
          type: event.type,
          livemode: event.livemode,
          lane: 'sandbox',
          ...(args.providerData ?? {}),
        },
        p_livemode: false,
      },
    );

    if (error) {
      console.error('apply_worker_sandbox_invoice_provider_event failed');
      return new Response('apply failed', { status: 500 });
    }

    return new Response(JSON.stringify(data ?? { ok: true, lane: 'sandbox' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  const resolveSandboxInvoiceId = async (
    paymentIntentId: string | null,
    metadataInvoiceId: string | null,
    metadataLane: string | null | undefined,
  ): Promise<string | null> => {
    if (metadataLane && metadataLane !== 'sandbox') {
      return null;
    }
    if (metadataInvoiceId) return metadataInvoiceId;
    if (!paymentIntentId) return null;

    const { data } = await supabase
      .from('worker_sandbox_commission_invoices')
      .select('id')
      .eq('stripe_payment_intent_id', paymentIntentId)
      .maybeSingle();

    return (data?.id as string | undefined) ?? null;
  };

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.payment_status !== 'paid') {
      return new Response(
        JSON.stringify({
          status: 'ignored',
          reason: 'checkout_not_paid',
          lane: 'sandbox',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }
    if (session.metadata?.bridge_hive_lane !== 'sandbox') {
      return new Response(
        JSON.stringify({ status: 'ignored', reason: 'not_sandbox_lane' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }
    return apply({
      eventType: 'checkout.session.completed',
      invoiceId:
        (session.metadata?.bridge_hive_invoice_id as string | undefined) ?? null,
      amountMinor: session.amount_total,
      currency: session.currency ? session.currency.toUpperCase() : null,
      paymentIntentId: paymentIntentIdFrom(session.payment_intent),
      checkoutSessionId: session.id,
    });
  }

  if (event.type === 'checkout.session.async_payment_succeeded') {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.metadata?.bridge_hive_lane !== 'sandbox') {
      return new Response(
        JSON.stringify({ status: 'ignored', reason: 'not_sandbox_lane' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }
    return apply({
      eventType: 'checkout.session.completed',
      invoiceId:
        (session.metadata?.bridge_hive_invoice_id as string | undefined) ?? null,
      amountMinor: session.amount_total,
      currency: session.currency ? session.currency.toUpperCase() : null,
      paymentIntentId: paymentIntentIdFrom(session.payment_intent),
      checkoutSessionId: session.id,
      providerData: { stripe_event_type: event.type },
    });
  }

  if (event.type === 'payment_intent.succeeded') {
    const pi = event.data.object as Stripe.PaymentIntent;
    const invoiceId = await resolveSandboxInvoiceId(
      pi.id,
      (pi.metadata?.bridge_hive_invoice_id as string | undefined) ?? null,
      pi.metadata?.bridge_hive_lane,
    );
    if (!invoiceId) {
      return new Response(
        JSON.stringify({ status: 'ignored', reason: 'not_sandbox_lane' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }
    return apply({
      eventType: 'payment_intent.succeeded',
      invoiceId,
      amountMinor: pi.amount_received ?? pi.amount,
      currency: pi.currency ? pi.currency.toUpperCase() : null,
      paymentIntentId: pi.id,
      checkoutSessionId: null,
    });
  }

  if (event.type === 'payment_intent.payment_failed') {
    const pi = event.data.object as Stripe.PaymentIntent;
    const invoiceId = await resolveSandboxInvoiceId(
      pi.id,
      (pi.metadata?.bridge_hive_invoice_id as string | undefined) ?? null,
      pi.metadata?.bridge_hive_lane,
    );
    return apply({
      eventType: 'payment_intent.payment_failed',
      invoiceId,
      amountMinor: pi.amount,
      currency: pi.currency ? pi.currency.toUpperCase() : null,
      paymentIntentId: pi.id,
      checkoutSessionId: null,
    });
  }

  if (event.type === 'checkout.session.expired') {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.metadata?.bridge_hive_lane !== 'sandbox') {
      return new Response(
        JSON.stringify({ status: 'ignored', reason: 'not_sandbox_lane' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }
    return apply({
      eventType: 'checkout.session.expired',
      invoiceId:
        (session.metadata?.bridge_hive_invoice_id as string | undefined) ?? null,
      amountMinor: session.amount_total,
      currency: session.currency ? session.currency.toUpperCase() : null,
      paymentIntentId: paymentIntentIdFrom(session.payment_intent),
      checkoutSessionId: session.id,
    });
  }

  if (event.type === 'charge.refunded' || event.type === 'charge.refund.updated') {
    const charge = event.data.object as Stripe.Charge;
    const paymentIntentId = paymentIntentIdFrom(charge.payment_intent);
    const invoiceId = await resolveSandboxInvoiceId(
      paymentIntentId,
      (charge.metadata?.bridge_hive_invoice_id as string | undefined) ?? null,
      charge.metadata?.bridge_hive_lane,
    );
    return apply({
      eventType: event.type,
      invoiceId,
      amountMinor: charge.amount_refunded,
      currency: charge.currency ? charge.currency.toUpperCase() : null,
      paymentIntentId,
      checkoutSessionId: null,
    });
  }

  return new Response(
    JSON.stringify({ status: 'ignored', type: event.type, lane: 'sandbox' }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
});
