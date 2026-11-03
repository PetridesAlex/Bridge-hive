# Sandbox-only payment release — approval request

**Project:** Bridge-Hive `hfnymqjrbppculcofaag`  
**Scope:** migration `041_worker_sandbox_payments` + deploy **only** three sandbox Edge Functions.  
**Not in this release:** live function redeploys, live secret changes, `042` live hardening, tester enablement, EAS builds, Stripe charges.

## Production read-only findings

| Check | Result |
| --- | --- |
| Applied migrations | `001` … `040` (latest `040_worker_push_calendar_hardening`) |
| Pending (active folder) | **`041_worker_sandbox_payments` only** |
| Deferred (not auto-applied) | `supabase/deferred_migrations/042_live_worker_invoice_payment_intent.sql` |
| Deployed Edge Functions | `create-worker-invoice-checkout` only (v1) |
| `worker_commission_invoices` rows | **0** |
| Sandbox tables / tester column | **absent** |
| Live `apply_worker_invoice_provider_event` | 8-arg signature (no `p_livemode`) |

## Migration 041 effects (sandbox-only rewrite)

**Does change when applied:**
- Adds `worker_profiles.is_payment_sandbox_tester` (default `false`) + guard trigger + admin RPC `set_worker_payment_sandbox_tester`
- Creates `worker_sandbox_commission_invoices` / `worker_sandbox_invoice_events` + RLS
- Adds sandbox RPCs only (`create_worker_sandbox_invoice`, list/get, record PI/checkout, `apply_worker_sandbox_invoice_provider_event`)

**Does NOT change:**
- `apply_worker_invoice_provider_event` (live) — left as currently deployed signature
- `record_worker_invoice_checkout` / live invoice columns / rows
- Commission obligations, overdue standing, billing emails
- Existing invoice data (there are none)

**Compatibility with deployed Checkout v1:** unchanged. Checkout still calls `record_worker_invoice_checkout` and live Stripe secrets. Sandbox release does not redeploy it.

**Why the previous combined 041 was not used:** it replaced live `apply_worker_invoice_provider_event` (provider-id match + `p_livemode`), which would alter the live billing contract even with zero invoice rows. Live hardening sits in deferred `042` for a later explicit approval.

## Fail-closed before webhook secret

Sandbox PaymentSheet / Checkout / test webhook all require **both**:
- `STRIPE_TEST_SECRET_KEY`
- `STRIPE_TEST_WEBHOOK_SECRET`

If the webhook secret is missing → HTTP 503 `payment_unavailable` / provider not configured. No PaymentIntent or Checkout Session is created.

## Proposed commands (do not run until approved)

```bash
# 0) Confirm branch SHA
git rev-parse HEAD

# 1) Backup readiness (Dashboard or CLI)
# Supabase Dashboard → Project Settings → Database → take a backup / note PITR window
# Or: pg_dump of public schema if you maintain off-platform backups

# 2) Apply ONLY pending active migration 041 (not deferred 042)
npx supabase db push --linked
# When prompted / listed, confirm only: 041_worker_sandbox_payments
# Do NOT copy 042 into supabase/migrations/ for this release.

# 3) Deploy sandbox functions ONLY (JWT defaults: checkout/sheet verify JWT; webhook verify_jwt=false via config)
npx supabase functions deploy create-sandbox-worker-invoice-payment-sheet --project-ref hfnymqjrbppculcofaag
npx supabase functions deploy create-sandbox-worker-invoice-checkout --project-ref hfnymqjrbppculcofaag
npx supabase functions deploy stripe-test-webhook --project-ref hfnymqjrbppculcofaag

# 4) AFTER Stripe test webhook endpoint exists, add secrets (new names only)
npx supabase secrets set STRIPE_TEST_SECRET_KEY=*** STRIPE_TEST_WEBHOOK_SECRET=*** --project-ref hfnymqjrbppculcofaag
# Never set/overwrite STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET in this release.

# 5) Post-deploy verification (read-only / safe probes)
# - Dashboard: functions list shows the three sandbox slugs ACTIVE
# - curl OPTIONS/unauthorized to payment-sheet → 401
# - invoke without STRIPE_TEST_WEBHOOK_SECRET configured → 503 (fail closed)
# - select to_regclass('public.worker_sandbox_commission_invoices') is not null
# - select count(*) from worker_commission_invoices still 0 / unchanged
# - live create-worker-invoice-checkout still the only pre-existing live payment function

# 6) Recovery
# - Function: redeploy previous (none for sandbox — delete function if needed)
# - Migration: forward-only; do not db reset. Compensating SQL would drop sandbox objects only if approved
# - Secrets: delete STRIPE_TEST_* only; never rotate live keys as “recovery”
```

## Post-deploy (later approvals — not this ask)

- Create Stripe test webhook → `…/functions/v1/stripe-test-webhook`
- Set `STRIPE_TEST_*` secrets
- `set_worker_payment_sandbox_tester` + `create_worker_sandbox_invoice`
- EAS `testflight-sandbox`

## Tests run / not run

**Run:** Jest `@bridge-hive/web` worker-commission suite (unit/domain + migration file assertions).  
**Not run:** `supabase test db` / pgTAP against production or local Docker; device PaymentSheet; real Stripe webhooks; EAS build.
