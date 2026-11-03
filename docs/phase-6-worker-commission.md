# Phase 6 — Worker commission billing

## Model (locked)

- Hospital pays the worker the **approved gross** shift amount.
- Worker separately owes Bridge Hive **17%** of approved gross (1700 bps).
- One Bridge Hive commission invoice per approved timesheet.
- Due in **10 calendar days**.
- Overdue invoices restrict **new** marketplace claims; existing assignments remain usable.
- Paying an overdue invoice (or a finance void) restores claiming automatically.

## Attendance (locked)

- After the scheduled end, the worker submits **completed hours**.
- Check-in / check-out RPCs are retired.
- No invoice is created on claim or on hours submit — only on organization timesheet approval.

## Local verification

```bash
# Apply migration 041 without resetting data
npx supabase migration up --local
npm run db:types
npx supabase test db
npm run test -w @bridge-hive/web
npm run typecheck
npm run lint
npm run build -w @bridge-hive/web
```

## Stripe sandbox setup (same Bridge-Hive project — do not paste secrets into chat)

Full private steps: [stripe-sandbox-private-config.md](./stripe-sandbox-private-config.md).

Summary:

1. Keep mobile Supabase on **Bridge-Hive** (`hfnymqjrbppculcofaag`). Do not use Bridge-Hive-Test.
2. Add **separately named** secrets `STRIPE_TEST_SECRET_KEY` / `STRIPE_TEST_WEBHOOK_SECRET` — never overwrite live `STRIPE_SECRET_KEY`.
3. Sandbox functions: `create-sandbox-worker-invoice-payment-sheet`, `create-sandbox-worker-invoice-checkout`, `stripe-test-webhook`.
4. Isolated tables: `worker_sandbox_commission_invoices` — never settle live invoices/debts.
5. Authorize testers with `set_worker_payment_sandbox_tester` (server-only). App Review demo stays blocked.
6. EAS `testflight-sandbox` uses `EXPO_PUBLIC_STRIPE_PAYMENTS_MODE=sandbox` + `pk_test_` on preview env.
7. Client success only shows pending until `stripe-test-webhook` confirms.

Without Stripe credentials, invoices, restrictions, and dashboards still work; Pay shows a safe “temporarily unavailable” message.

## Native Apple Pay / Google Pay

- Merchant ID: `merchant.com.bridgehive.worker` (create in Apple Developer; upload CSR in Stripe).
- Requires a **development / store build**. Expo Go cannot prove Apple Pay / Google Pay.
- Code presence alone does **not** mean wallets are ready — certificates and native builds are required.
- Google Pay sandbox uses `testEnv: true` with `pk_test_`.

## Local overdue fixture (privileged)

Do not wait 10 days. Backdate `due_at` with `bridgehive.allow_invoice_admin=on`, then:

```sql
select public.process_worker_commission_due_dates();
```

Or use ignored `scripts/local/simulate-worker-invoice-paid.sql` for payment simulation.

## pg_cron

If `pg_cron` is available, migration 018 schedules `process-worker-commission-overdue` hourly.
If not, claim-time eligibility remains the safety net; schedule via Supabase Cron later.

## Deferred / separate approval

- Apply migration 041 to Bridge-Hive + deploy sandbox/live payment functions
- Add `STRIPE_TEST_*` secrets (without touching live Stripe secrets)
- Create `stripe-test-webhook` destination in Stripe test mode
- Authorize payment sandbox tester + create sandbox fixture invoice
- EAS `testflight-sandbox` / TestFlight (when approved)
- Credit notes / refunds UI / VAT treatment / Cyprus invoice legal format
- Pay-all-invoices batch
- Worker terms disclosure before production launch
