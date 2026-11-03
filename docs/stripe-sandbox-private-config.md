# Stripe sandbox on Bridge-Hive (same project) — private configuration

**Project:** Bridge-Hive only — `hfnymqjrbppculcofaag`  
Do **not** use Bridge-Hive-Test. Do **not** change the mobile Supabase URL or publishable anon key.

Do **not** paste `pk_`, `sk_`, `rk_`, or `whsec_` values into chat, issues, or commits.

## Approach (isolation)

Sandbox payments use **separately named Edge Functions and secrets** on the same Supabase project:

| Lane | Secrets (never overwrite the other lane) | Functions |
| --- | --- | --- |
| **Live** | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (optional `STRIPE_MODE`) | `create-worker-invoice-payment-sheet`, `create-worker-invoice-checkout`, `stripe-webhook` |
| **Sandbox** | `STRIPE_TEST_SECRET_KEY`, `STRIPE_TEST_WEBHOOK_SECRET` | `create-sandbox-worker-invoice-payment-sheet`, `create-sandbox-worker-invoice-checkout`, `stripe-test-webhook` |

Sandbox invoices live in **`worker_sandbox_commission_invoices`** (and sandbox events). They never settle live invoices, clear live debt, change suspension/standing, enter commission exports, or send normal billing emails.

Sandbox payment access requires **`worker_profiles.is_payment_sandbox_tester = true`**, set only by platform admin RPC `set_worker_payment_sandbox_tester`. Client env, email, or `pk_test_` alone cannot authorize.

App Review demo guards are unchanged: demo accounts cannot start live or sandbox payments.

## Exact variable names

| Variable | Value | Destination |
| --- | --- | --- |
| `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_test_…` | EAS **preview** (used by `testflight-sandbox`); local mobile `.env` for sandbox testing |
| `EXPO_PUBLIC_STRIPE_PAYMENTS_MODE` | `sandbox` | Built into `testflight-sandbox` profile (`eas.json`) |
| `STRIPE_TEST_SECRET_KEY` | `sk_test_…` or `rk_test_…` | Bridge-Hive Edge Function secrets (**new** secret — do not edit `STRIPE_SECRET_KEY`) |
| `STRIPE_TEST_WEBHOOK_SECRET` | `whsec_…` | Bridge-Hive Edge Function secrets (**new**) |

Live secrets stay as-is:

| Variable | Notes |
| --- | --- |
| `STRIPE_SECRET_KEY` | Live/restricted key — **do not replace with test** |
| `STRIPE_WEBHOOK_SECRET` | Live webhook signing secret — **do not replace with test** |
| `STRIPE_MODE` | Optional for live (`live`). Infer from key if unset |

Mobile Supabase stays on Bridge-Hive (`EXPO_PUBLIC_SUPABASE_URL` / publishable key unchanged).

## A. Stripe Dashboard (sandbox / test mode)

1. Open [dashboard.stripe.com](https://dashboard.stripe.com) → ensure **Test mode** / Sandbox banner.
2. **Developers** → **API keys** → copy **Publishable key** (`pk_test_`).
3. Prefer a restricted key named `bridgehive-edge-sandbox` (Write: Customers, PaymentIntents, Checkout Sessions, Customer sessions). Or use `sk_test_`.
4. After `stripe-test-webhook` is deployed (separate approval): **Developers** → **Webhooks** → Add endpoint  
   `https://hfnymqjrbppculcofaag.supabase.co/functions/v1/stripe-test-webhook`  
   Events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.expired`, `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`, `charge.refund.updated`.  
   Reveal **Signing secret** → use as `STRIPE_TEST_WEBHOOK_SECRET`.

## B. Supabase — Bridge-Hive only (`hfnymqjrbppculcofaag`)

1. Dashboard → project **Bridge-Hive** (URL contains `hfnymqjrbppculcofaag`).
2. **Edge Functions** → **Secrets** → **Add new secret** (do not edit existing Stripe live secrets):
   - `STRIPE_TEST_SECRET_KEY` = test secret/restricted key
   - `STRIPE_TEST_WEBHOOK_SECRET` = sandbox webhook signing secret (after A.4)
3. Confirm existing `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` were **not** changed.

## C. Expo (EAS) — publishable test key for sandbox builds

1. [expo.dev](https://expo.dev) → **webrunner-agency** → **bridge-hive-worker** → **Environment variables**.
2. Add/update `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` = `pk_test_…` for **preview** only (Visibility Sensitive).  
   Do **not** put `pk_test_` on **production**.
3. Confirm `EXPO_PUBLIC_SUPABASE_URL` still points at `hfnymqjrbppculcofaag`.
4. Profile `testflight-sandbox` already sets `EXPO_PUBLIC_STRIPE_PAYMENTS_MODE=sandbox` and store distribution. Production sets `live`.

## D. Authorize a payment test account (after sandbox migration applied)

Platform admin (SQL/RPC, not client). **Not part of the first deploy approval** — enable only after webhook secrets exist:

```sql
select public.set_worker_payment_sandbox_tester('<worker_user_uuid>', true, 'Stripe sandbox TestFlight');
select public.create_worker_sandbox_invoice('<worker_user_uuid>', 4250, 'EUR', 25000, 1700, 'Sandbox fixture');
```

### Migration version mapping

| Approved release name | Local / remote history version | Status |
| --- | --- | --- |
| `041_worker_sandbox_payments` | `20261103132451` / `worker_sandbox_payments` | Applied on Bridge-Hive; local file renamed to match remote |
| Live PaymentIntent hardening | Deferred file only: `supabase/deferred_migrations/042_live_worker_invoice_payment_intent.sql` | **Not** in `supabase/migrations/`; not applied by `db push` |

Any **future** active migration under `supabase/migrations/` must use a version ordered **after** `20261103132451`. Do not renumber, move, or silently activate deferred `042`.

## E. Local (optional)

`supabase/functions/.env.local`:

```text
STRIPE_TEST_SECRET_KEY=
STRIPE_TEST_WEBHOOK_SECRET=
# Leave live keys alone if present:
# STRIPE_SECRET_KEY=
# STRIPE_WEBHOOK_SECRET=
```

Mobile `.env` for sandbox lane:

```text
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_…
EXPO_PUBLIC_STRIPE_PAYMENTS_MODE=sandbox
```

## Not done until separately approved

- Controlled sandbox tester enablement + one TEST invoice + one Checkout payment
- Native PaymentSheet / Apple Pay / Google Pay device verification
- EAS `testflight-sandbox` build / TestFlight upload
- Any live billing charges or live function changes

## Apple Pay / Google Pay (native build readiness)

**Apple Pay**

1. Merchant ID `merchant.com.bridgehive.worker` (Apple Developer + Stripe sandbox Payment Processing Certificate).
2. Apple Pay capability enabled on App ID `com.bridgehive.worker`.
3. App config / `StripeProvider` / iOS entitlement must all use the same merchant id (Stripe Expo plugin + `BridgeHiveApp.entitlements`).
4. Next iOS provisioning profile for `com.bridgehive.worker` must include **Apple Pay** (do not revoke existing signing certs — regenerate/select profile after capability enable).
5. Requires a **development / store build** (not Expo Go).

**Google Pay**

1. Stripe plugin `enableGooglePay: true` → AndroidManifest `com.google.android.gms.wallet.api.enabled=true`.
2. Sandbox PaymentSheet: `googlePay.testEnv: true`, merchant country `CY`, invoice currency from server (EUR).
3. Card entry remains available when a wallet is unsupported (PaymentSheet default + hosted Checkout fallback).
4. Live Google Pay Business Console approval is a later step. Not available in Expo Go.

**EAS Preview env (private)** — required for `testflight-sandbox` / `android-sandbox`.

Audit finding: **preview currently has no EAS environment variables** (production has Supabase URL/key for `hfnymqjrbppculcofaag` only; no Stripe publishable key listed there either). Configure preview privately before any sandbox build:

```bash
cd apps/worker-mobile
npx eas-cli env:list preview

# Create each missing preview variable (values stay private; visibility sensitive where appropriate):
npx eas-cli env:create --environment preview --name EXPO_PUBLIC_SUPABASE_URL \
  --value 'https://hfnymqjrbppculcofaag.supabase.co' --visibility plaintext --type string
npx eas-cli env:create --environment preview --name EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY \
  --value '<same Bridge-Hive anon/publishable as production>' --visibility sensitive --type string
npx eas-cli env:create --environment preview --name EXPO_PUBLIC_WEB_APP_URL \
  --value 'https://bridgehive.app' --visibility plaintext --type string
npx eas-cli env:create --environment preview --name EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY \
  --value 'pk_test_…' --visibility sensitive --type string

# Verify names only (do not use --include-sensitive in shared logs):
npx eas-cli env:list preview
# Confirm EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY exists, then privately confirm it starts with pk_test_
```

`testflight-sandbox` / `android-sandbox` already set `EXPO_PUBLIC_STRIPE_PAYMENTS_MODE=sandbox` in `eas.json` profile `env`.  
Never paste full key values into chat. Leave EAS **production** values unchanged (no live Stripe publishable key changes in this prep).
