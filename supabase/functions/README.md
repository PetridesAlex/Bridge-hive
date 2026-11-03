# Edge Functions

Privileged server actions for webhooks, push delivery, and finance.

## Worker commission billing (same project — live + sandbox lanes)

| Function | Lane | Secrets |
| --- | --- | --- |
| `create-worker-invoice-payment-sheet` | Live | `STRIPE_SECRET_KEY` |
| `create-worker-invoice-checkout` | Live | `STRIPE_SECRET_KEY` |
| `stripe-webhook` | Live | `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` |
| `create-sandbox-worker-invoice-payment-sheet` | Sandbox | `STRIPE_TEST_SECRET_KEY` |
| `create-sandbox-worker-invoice-checkout` | Sandbox | `STRIPE_TEST_SECRET_KEY` |
| `stripe-test-webhook` | Sandbox | `STRIPE_TEST_SECRET_KEY` + `STRIPE_TEST_WEBHOOK_SECRET` |

`stripe-webhook` and `stripe-test-webhook` have `verify_jwt = false` in `supabase/config.toml` because Stripe cannot present a Supabase JWT. Signature verification is enforced in each function.

Sandbox functions require `worker_profiles.is_payment_sandbox_tester` and write only to `worker_sandbox_*` tables.

### Secrets

```text
# Live — do not overwrite with test values
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_MODE=                # optional; inferred from key if unset

# Sandbox — separately named; never replace live secrets
STRIPE_TEST_SECRET_KEY=
STRIPE_TEST_WEBHOOK_SECRET=

APP_PUBLIC_URL=http://127.0.0.1:8081
```

Private setup: [docs/stripe-sandbox-private-config.md](../../docs/stripe-sandbox-private-config.md).

### Local

```bash
npx supabase functions serve --env-file supabase/functions/.env.local
stripe listen --forward-to http://127.0.0.1:54321/functions/v1/stripe-test-webhook
```
