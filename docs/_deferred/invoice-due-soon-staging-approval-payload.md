# Staging-only approval payload — invoice due-soon reminder

**Do not apply without explicit staging approval.** Target: Bridge-Hive-Test `egtpiprwqgmkogthkmew` only.

## Preconditions (read-only confirmed)

- Hosted migration head (test): `20261116095752_org_worker_message_deletion`
- Candidate migration: `20261118180000_worker_invoice_due_soon_reminder.sql`
- Production project `hfnymqjrbppculcofaag` is out of scope for this payload
- No real production invoices/users; no sandbox Stripe payments; no tester fixture that masquerades as live overdue suspension

## Requested writes (after approval)

1. Apply **only** `20261118180000_worker_invoice_due_soon_reminder.sql` to `egtpiprwqgmkogthkmew`.
2. Insert one disposable open `worker_commission_invoices` row for a non-demo test worker with `due_at = now() + interval '2 days 12 hours'` (inside the 3-day window).
3. Call `service_role` RPC `process_worker_commission_due_dates()` once.
4. Assert exactly one `notifications` row `type=invoice_due_soon` and one `worker_notification_events` row for that invoice+due_at.
5. Call `process_worker_commission_due_dates()` again — assert no second logical reminder.
6. Optional: with a registered Expo token on a supported native build, claim/dispatch once; otherwise record push as **not proven**.
7. Cleanup: void/delete the disposable invoice, delete notification/event/delivery rows created by the test.

## Explicit non-goals

- No production SQL/cron activation
- No `WORKER_COMMISSION_DUE_DATES_CRON=1` on production
- No vercel.json cron registration in this stage
- No EAS build / TestFlight / OTA
