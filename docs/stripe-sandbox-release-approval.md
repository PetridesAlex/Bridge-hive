# Sandbox-only payment release — status + next approval

**Project:** Bridge-Hive `hfnymqjrbppculcofaag`  
**Approved source SHA (deployed):** `4c5e986f212b198babecbdaedd309e2ce4b0e3b5`

## Migration version mapping

| Item | Value |
| --- | --- |
| Approved release name | `041_worker_sandbox_payments` |
| Remote `schema_migrations` | version `20261103132451`, name `worker_sandbox_payments` |
| Local active file | `supabase/migrations/20261103132451_worker_sandbox_payments.sql` (renamed to match remote; SQL body of approved 041) |
| Deferred live hardening | `supabase/deferred_migrations/042_live_worker_invoice_payment_intent.sql` — **not** auto-applied |

Do **not** re-apply this SQL, insert a duplicate history row, or `db push` expecting a pending `041`.  
Any future active migration must be versioned **after** `20261103132451`. Do not renumber or move deferred `042` into `supabase/migrations/` without a separate live release approval.

## Deployed (sandbox lane)

- Secrets (names only): `STRIPE_TEST_SECRET_KEY`, `STRIPE_TEST_WEBHOOK_SECRET`
- Functions: `create-sandbox-worker-invoice-payment-sheet`, `create-sandbox-worker-invoice-checkout`, `stripe-test-webhook`
- Live Checkout / live webhook / live secrets: not in this sandbox release scope

## Next controlled test — approval request (not executed until you confirm)

See chat for the exact account / amount / Checkout-first scope. Default proposed amount unless you override: **€42.50** commission (`4250` minor) on **€250.00** gross (`25000` minor), rate **1700** bps, notes clearly labelled sandbox TEST.

**In scope after approval:** enable one non-demo tester → create one sandbox invoice → one hosted Checkout card payment → verify webhook + sandbox paid state → confirm live billing untouched → revoke tester.

**Out of scope:** PaymentSheet/wallets, EAS, production merge, live function changes, migration 042.
