# Edge Functions

Privileged server actions for webhooks, push delivery, and finance.

## Phase 6 — worker commission billing

| Function | Purpose |
| --- | --- |
| `create-worker-invoice-checkout` | Authenticated worker starts Stripe Checkout for one invoice |
| `stripe-webhook` | Verifies Stripe signatures and applies payment events via RPC |

`stripe-webhook` has `verify_jwt = false` in `supabase/config.toml` because Stripe cannot present a Supabase JWT. The function still rejects unsigned or invalid Stripe signatures before any payment apply.

### Required secrets (Supabase Edge / local `.env`)

```text
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
APP_PUBLIC_URL=http://127.0.0.1:8081
```

Never commit real values. Workers never receive Stripe secrets.

### Local webhook forwarding (optional)

If Stripe CLI is already installed:

```bash
stripe listen --forward-to http://127.0.0.1:54321/functions/v1/stripe-webhook
```

Serve functions:

```bash
npx supabase functions serve --env-file supabase/functions/.env.local
```

### Without Stripe credentials

Invoice generation, due dates, billing restrictions, and dashboards still work.
Checkout returns a safe “payment temporarily unavailable” response.
