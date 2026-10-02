// create-worker-invoice-checkout
// Authenticated worker starts Stripe-hosted Checkout for one commission invoice.
// Client may send only { invoice_id }. Amount/currency/ownership are server-derived.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import Stripe from 'https://esm.sh/stripe@17.5.0?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

function isAllowedCheckoutOrigin(appPublicUrl: string, extraAllowed: string[]): boolean {
  let parsed: URL;
  try {
    parsed = new URL(appPublicUrl);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return false;
  }
  if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
    return true;
  }
  return extraAllowed.some((entry) => {
    try {
      return new URL(entry).origin === parsed.origin;
    } catch {
      return entry === parsed.origin;
    }
  });
}

function checkoutIdempotencyKey(
  invoiceId: string,
  priorCheckoutSessionId: string | null | undefined,
  priorSessionStatus: string | null | undefined,
): string {
  if (
    priorCheckoutSessionId &&
    priorSessionStatus &&
    priorSessionStatus !== 'open'
  ) {
    return `invoice-checkout-${invoiceId}-${priorCheckoutSessionId}`;
  }
  if (priorCheckoutSessionId && !priorSessionStatus) {
    return `invoice-checkout-${invoiceId}-${priorCheckoutSessionId}`;
  }
  return `invoice-checkout-${invoiceId}-v1`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    const rawAppUrl = Deno.env.get('APP_PUBLIC_URL') ?? 'http://127.0.0.1:8081';
    const extraOrigins = (Deno.env.get('CHECKOUT_ALLOWED_ORIGINS') ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnon = Deno.env.get('SUPABASE_ANON_KEY')!;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json({ error: 'unauthorized' }, 401);
    }

    if (!stripeKey) {
      return json(
        {
          error: 'payment_unavailable',
          message: 'Payment is temporarily unavailable. Please try again later.',
        },
        503,
      );
    }

    if (!isAllowedCheckoutOrigin(rawAppUrl, extraOrigins)) {
      return json(
        {
          error: 'payment_unavailable',
          message: 'Payment is temporarily unavailable. Please try again later.',
        },
        503,
      );
    }

    const appUrl = new URL(rawAppUrl).origin;

    const supabase = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return json({ error: 'unauthorized' }, 401);
    }

    const body = await req.json().catch(() => ({}));

    if (body?.amount !== undefined || body?.currency !== undefined) {
      return json({ error: 'client_amount_rejected' }, 400);
    }

    const invoiceId = typeof body?.invoice_id === 'string' ? body.invoice_id : null;
    if (!invoiceId) {
      return json({ error: 'invoice_required' }, 400);
    }

    const { data: invoice, error: invoiceError } = await supabase
      .from('worker_commission_invoices')
      .select(
        'id, invoice_number, worker_id, status, currency, commission_amount_minor, stripe_customer_id, stripe_checkout_session_id',
      )
      .eq('id', invoiceId)
      .eq('worker_id', user.id)
      .maybeSingle();

    if (invoiceError || !invoice) {
      return json({ error: 'invoice_not_found' }, 404);
    }

    if (!['open', 'past_due', 'payment_processing'].includes(invoice.status)) {
      return json({ error: 'invoice_not_payable' }, 400);
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2024-11-20.acacia',
      httpClient: Stripe.createFetchHttpClient(),
    });

    let customerId = invoice.stripe_customer_id as string | null;
    if (!customerId) {
      const customer = await stripe.customers.create(
        {
          metadata: { bridge_hive_worker_id: user.id },
        },
        { idempotencyKey: `worker-customer-${user.id}` },
      );
      customerId = customer.id;
    }

    let priorSessionStatus: string | null = null;

    // Reuse an open Checkout Session when possible.
    if (invoice.stripe_checkout_session_id) {
      try {
        const existing = await stripe.checkout.sessions.retrieve(
          invoice.stripe_checkout_session_id,
        );
        priorSessionStatus = existing.status;
        if (
          existing.status === 'open' &&
          existing.url &&
          existing.amount_total === invoice.commission_amount_minor
        ) {
          return json({ url: existing.url, reused: true });
        }
      } catch {
        priorSessionStatus = null;
      }
    }

    const idempotencyKey = checkoutIdempotencyKey(
      invoice.id,
      invoice.stripe_checkout_session_id,
      priorSessionStatus,
    );

    const session = await stripe.checkout.sessions.create(
      {
        customer: customerId,
        mode: 'payment',
        // Card (+ Apple Pay / Google Pay when Stripe + device/browser are eligible).
        // Do not implement a native Apple Pay button in this phase.
        payment_method_types: ['card'],
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: String(invoice.currency).toLowerCase(),
              unit_amount: invoice.commission_amount_minor,
              product_data: {
                name: 'Bridge Hive commission invoice',
                description: `Invoice ${invoice.invoice_number} — 16% of approved gross shift pay`,
              },
            },
          },
        ],
        success_url: `${appUrl}/invoices/${invoice.id}?payment_status=pending`,
        cancel_url: `${appUrl}/invoices/${invoice.id}?payment_status=cancelled`,
        metadata: {
          bridge_hive_invoice_id: invoice.id,
          bridge_hive_worker_id: user.id,
          bridge_hive_invoice_number: invoice.invoice_number,
        },
        payment_intent_data: {
          metadata: {
            bridge_hive_invoice_id: invoice.id,
            bridge_hive_worker_id: user.id,
          },
        },
      },
      { idempotencyKey },
    );

    if (!session.url) {
      return json({ error: 'checkout_unavailable' }, 502);
    }

    const { error: recordError } = await supabase.rpc('record_worker_invoice_checkout', {
      p_invoice_id: invoice.id,
      p_stripe_customer_id: customerId,
      p_checkout_session_id: session.id,
    });

    if (recordError) {
      console.error('record_worker_invoice_checkout failed');
      return json({ error: 'checkout_record_failed' }, 500);
    }

    return json({ url: session.url, reused: false });
  } catch (err) {
    console.error('create-worker-invoice-checkout error');
    return json({ error: 'internal_error' }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
