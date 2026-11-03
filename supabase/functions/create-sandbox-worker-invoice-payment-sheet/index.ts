// create-sandbox-worker-invoice-payment-sheet
// Sandbox PaymentSheet for isolated TEST invoices on Bridge-Hive.
// Uses STRIPE_TEST_SECRET_KEY only. Requires is_payment_sandbox_tester.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import Stripe from 'https://esm.sh/stripe@17.5.0?target=deno';
import {
  paymentIntentIdempotencyKey,
  resolveSandboxPaymentSecrets,
} from '../_shared/stripe-mode.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Fail closed until BOTH test secret and test webhook secret are configured.
    const resolved = resolveSandboxPaymentSecrets({
      STRIPE_TEST_SECRET_KEY: Deno.env.get('STRIPE_TEST_SECRET_KEY'),
      STRIPE_TEST_WEBHOOK_SECRET: Deno.env.get('STRIPE_TEST_WEBHOOK_SECRET'),
    });
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnon = Deno.env.get('SUPABASE_ANON_KEY')!;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json({ error: 'unauthorized' }, 401);
    }

    if (!resolved) {
      return json(
        {
          error: 'payment_unavailable',
          message: 'Payment is temporarily unavailable. Please try again later.',
        },
        503,
      );
    }

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

    const { data: profile } = await supabase
      .from('worker_profiles')
      .select('is_app_review_demo, is_payment_sandbox_tester')
      .eq('user_id', user.id)
      .maybeSingle();

    if (profile?.is_app_review_demo === true) {
      return json(
        {
          error: 'app_review_demo_forbidden',
          message: 'Demonstration accounts cannot start payments.',
        },
        403,
      );
    }

    // Server flag only — client mode / email / key prefix cannot authorize.
    if (profile?.is_payment_sandbox_tester !== true) {
      return json(
        {
          error: 'sandbox_tester_required',
          message: 'Sandbox payments require a server-authorized test account.',
        },
        403,
      );
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
      .from('worker_sandbox_commission_invoices')
      .select(
        'id, invoice_number, worker_id, status, currency, commission_amount_minor, commission_rate_bps, stripe_customer_id, stripe_payment_intent_id, label',
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

    const stripe = new Stripe(resolved.key, {
      apiVersion: '2024-11-20.acacia',
      httpClient: Stripe.createFetchHttpClient(),
    });

    let customerId = invoice.stripe_customer_id as string | null;
    if (!customerId) {
      const customer = await stripe.customers.create(
        {
          email: user.email ?? undefined,
          metadata: {
            bridge_hive_worker_id: user.id,
            bridge_hive_lane: 'sandbox',
          },
        },
        { idempotencyKey: `sandbox-worker-customer-${user.id}` },
      );
      customerId = customer.id;
    }

    let priorIntentStatus: string | null = null;

    if (invoice.stripe_payment_intent_id) {
      try {
        const existing = await stripe.paymentIntents.retrieve(
          invoice.stripe_payment_intent_id,
        );
        priorIntentStatus = existing.status;
        if (
          (existing.status === 'requires_payment_method' ||
            existing.status === 'requires_confirmation' ||
            existing.status === 'requires_action') &&
          existing.client_secret &&
          existing.amount === invoice.commission_amount_minor &&
          existing.currency === String(invoice.currency).toLowerCase()
        ) {
          const customerSession = await stripe.customerSessions.create({
            customer: customerId,
            components: {
              mobile_payment_element: {
                enabled: true,
                features: {
                  payment_method_redisplay: 'enabled',
                  payment_method_save: 'enabled',
                  payment_method_remove: 'enabled',
                },
              },
            },
          });

          return json({
            paymentIntent: existing.client_secret,
            paymentIntentId: existing.id,
            customer: customerId,
            customerSessionClientSecret: customerSession.client_secret,
            reused: true,
            publishableKeyMode: 'test',
            lane: 'sandbox',
            receiptLabel: 'TEST',
          });
        }
      } catch {
        priorIntentStatus = null;
      }
    }

    const idempotencyKey = paymentIntentIdempotencyKey(
      invoice.id,
      invoice.stripe_payment_intent_id,
      priorIntentStatus,
      'sandbox-invoice-pi',
    );

    const rateBps =
      typeof invoice.commission_rate_bps === 'number'
        ? invoice.commission_rate_bps
        : 1700;
    const ratePercent = (rateBps / 100).toFixed(rateBps % 100 === 0 ? 0 : 2);

    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: invoice.commission_amount_minor,
        currency: String(invoice.currency).toLowerCase(),
        customer: customerId,
        automatic_payment_methods: { enabled: true },
        receipt_email: user.email ?? undefined,
        description: `TEST Bridge Hive commission ${invoice.invoice_number} — ${ratePercent}% (sandbox)`,
        metadata: {
          bridge_hive_invoice_id: invoice.id,
          bridge_hive_worker_id: user.id,
          bridge_hive_invoice_number: invoice.invoice_number,
          bridge_hive_stripe_mode: 'test',
          bridge_hive_lane: 'sandbox',
        },
      },
      { idempotencyKey },
    );

    if (!paymentIntent.client_secret) {
      return json({ error: 'payment_sheet_unavailable' }, 502);
    }

    const customerSession = await stripe.customerSessions.create({
      customer: customerId,
      components: {
        mobile_payment_element: {
          enabled: true,
          features: {
            payment_method_redisplay: 'enabled',
            payment_method_save: 'enabled',
            payment_method_remove: 'enabled',
          },
        },
      },
    });

    const { error: recordError } = await supabase.rpc(
      'record_worker_sandbox_invoice_payment_intent',
      {
        p_invoice_id: invoice.id,
        p_stripe_customer_id: customerId,
        p_payment_intent_id: paymentIntent.id,
      },
    );

    if (recordError) {
      console.error('record_worker_sandbox_invoice_payment_intent failed');
      return json({ error: 'payment_intent_record_failed' }, 500);
    }

    return json({
      paymentIntent: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      customer: customerId,
      customerSessionClientSecret: customerSession.client_secret,
      reused: false,
      publishableKeyMode: 'test',
      lane: 'sandbox',
      receiptLabel: 'TEST',
    });
  } catch {
    console.error('create-sandbox-worker-invoice-payment-sheet error');
    return json({ error: 'internal_error' }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
