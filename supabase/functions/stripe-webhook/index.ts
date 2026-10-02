// stripe-webhook
// Verifies Stripe signature, deduplicates by event id, applies payment via RPC.
// Never marks an invoice paid from a mobile return URL.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import Stripe from 'https://esm.sh/stripe@17.5.0?target=deno';

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
  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  if (!stripeKey || !webhookSecret) {
    return new Response('payment provider not configured', { status: 503 });
  }

  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return new Response('missing signature', { status: 400 });
  }

  const rawBody = await req.text();
  const stripe = new Stripe(stripeKey, {
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
    const { data, error } = await supabase.rpc('apply_worker_invoice_provider_event', {
      p_provider_event_id: event.id,
      p_event_type: args.eventType,
      p_invoice_id: args.invoiceId,
      p_amount_minor: args.amountMinor,
      p_currency: args.currency,
      p_payment_intent_id: args.paymentIntentId,
      p_checkout_session_id: args.checkoutSessionId,
      p_provider_data: {
        type: event.type,
        ...(args.providerData ?? {}),
      },
    });

    if (error) {
      console.error('apply_worker_invoice_provider_event failed');
      return new Response('apply failed', { status: 500 });
    }

    return new Response(JSON.stringify(data ?? { ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  const applyPaidCheckoutSession = (
    session: Stripe.Checkout.Session,
    providerData?: Record<string, unknown>,
  ) =>
    apply({
      eventType: 'checkout.session.completed',
      invoiceId:
        (session.metadata?.bridge_hive_invoice_id as string | undefined) ?? null,
      amountMinor: session.amount_total,
      currency: session.currency ? session.currency.toUpperCase() : null,
      paymentIntentId: paymentIntentIdFrom(session.payment_intent),
      checkoutSessionId: session.id,
      providerData,
    });

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    // Unpaid / incomplete sessions must not be applied as paid.
    if (session.payment_status !== 'paid') {
      return new Response(
        JSON.stringify({
          status: 'ignored',
          reason: 'checkout_not_paid',
          payment_status: session.payment_status,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }
    return applyPaidCheckoutSession(session);
  }

  if (event.type === 'checkout.session.async_payment_succeeded') {
    const session = event.data.object as Stripe.Checkout.Session;
    return applyPaidCheckoutSession(session, { stripe_event_type: event.type });
  }

  if (event.type === 'payment_intent.succeeded') {
    const pi = event.data.object as Stripe.PaymentIntent;
    const invoiceId =
      (pi.metadata?.bridge_hive_invoice_id as string | undefined) ?? null;
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
    const invoiceId =
      (pi.metadata?.bridge_hive_invoice_id as string | undefined) ?? null;
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
    const invoiceId =
      (session.metadata?.bridge_hive_invoice_id as string | undefined) ?? null;
    return apply({
      eventType: 'checkout.session.expired',
      invoiceId,
      amountMinor: session.amount_total,
      currency: session.currency ? session.currency.toUpperCase() : null,
      paymentIntentId: paymentIntentIdFrom(session.payment_intent),
      checkoutSessionId: session.id,
    });
  }

  if (event.type === 'charge.refunded' || event.type === 'charge.refund.updated') {
    const charge = event.data.object as Stripe.Charge;
    const invoiceId =
      (charge.metadata?.bridge_hive_invoice_id as string | undefined) ?? null;
    return apply({
      eventType: event.type,
      invoiceId,
      amountMinor: charge.amount_refunded,
      currency: charge.currency ? charge.currency.toUpperCase() : null,
      paymentIntentId: paymentIntentIdFrom(charge.payment_intent),
      checkoutSessionId: null,
    });
  }

  // Acknowledge other events without mutating finance state.
  return new Response(JSON.stringify({ status: 'ignored', type: event.type }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
