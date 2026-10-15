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
# Apply migration 035 without resetting data
npx supabase migration up --local
npm run db:types
npx supabase test db
npm run test -w @bridge-hive/web
npm run typecheck
npm run lint
npm run build -w @bridge-hive/web
```

## Stripe test setup (user action — do not paste secrets into chat)

1. Create/use a Stripe **test-mode** account.
2. Copy test secret key and webhook signing secret into ignored local env only:
   - `supabase/functions/.env.local` (from `.env.local.example`)
   - root/web `.env.local` placeholders if needed for tooling
3. Serve functions: `npx supabase functions serve --env-file supabase/functions/.env.local`
4. Forward webhooks (if Stripe CLI already installed):
   `stripe listen --forward-to http://127.0.0.1:54321/functions/v1/stripe-webhook`
5. Worker taps **Pay invoice** → hosted Checkout. Payment methods follow the Stripe Dashboard
   configuration (card, Apple Pay, Google Pay when eligible). Expo Go cannot prove native Apple Pay.
6. Return URL shows **Payment confirmation pending** until the webhook marks paid.

Without Stripe credentials, invoices, restrictions, and dashboards still work; Pay shows a safe “temporarily unavailable” message.

## Local overdue fixture (privileged)

Do not wait 10 days. Backdate `due_at` with `bridgehive.allow_invoice_admin=on`, then:

```sql
select public.process_worker_commission_due_dates();
```

Or use ignored `scripts/local/simulate-worker-invoice-paid.sql` for payment simulation.

## pg_cron

If `pg_cron` is available, migration 018 schedules `process-worker-commission-overdue` hourly.
If not, claim-time eligibility remains the safety net; schedule via Supabase Cron later.

## Deferred

- Native Apple Pay (Merchant ID + Expo dev build)
- Credit notes / refunds UI / VAT treatment / Cyprus invoice legal format
- Pay-all-invoices batch
- Worker terms disclosure before production launch
