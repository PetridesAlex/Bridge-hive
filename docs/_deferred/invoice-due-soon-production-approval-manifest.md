# Production approval manifest — invoice due-soon (post–staging Preview isolation)

**Status:** staging verification in progress / pending results section update.  
**STOP:** no production SQL, cron/flag enablement, merge/deploy, EAS/OTA, or Stripe.

## Source freeze (update after Preview-isolation push)

| Field | Value |
| --- | --- |
| PR | https://github.com/PetridesAlex/Bridge-hive/pull/59 |
| Prior Prompt 1 tip | `4fb5633f2fff2ae21a468e3ff1597ceba0cb7d87` |
| New head after Preview isolation | *(filled on push)* |
| Migration file | `supabase/migrations/20261118180000_worker_invoice_due_soon_reminder.sql` |
| Migration SHA-256 | `e46c4b1bd5ed830925c7664d8e0e51beddb9fd1c87026224ca0be68598ea96fd` (unchanged) |

## Preview isolation (required before any production cron)

- `VERCEL_ENV=preview` → `isWorkerCommissionDueDatesCronEnabled() === false` even if `WORKER_COMMISSION_DUE_DATES_CRON=1`
- Refusal reason: `preview_isolation`
- Staging verification uses authenticated Bridge-Hive-Test (`egtpiprwqgmkogthkmew`) RPC/SQL only

## Staging target confirmation

| Field | Value |
| --- | --- |
| Project | Bridge-Hive-Test |
| Ref | `egtpiprwqgmkogthkmew` |
| Pre-apply migration head | `20261116095752_org_worker_message_deletion` |
| Unrelated overdue open invoices before processor | 0 |
| Open invoices in 3-day window before fixtures | 0 |

## Staging results

*(filled after verification)*

## Production activation gates (unchanged policy)

1. Confirm new PR head + migration checksum above
2. Re-read eligible recipient counts on `hfnymqjrbppculcofaag`
3. Explicit approval for catch-up scope
4. Apply **only** this migration; enable cron/flag only after client compatibility
5. Older apps: do not claim E2E invoice push until compatible native build
