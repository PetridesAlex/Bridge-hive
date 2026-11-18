# Production approval manifest — three-day invoice reminder (post-staging)

**Status:** staging verification complete on Bridge-Hive-Test.  
**STOP:** no production SQL, cron/flag enablement, merge/deploy, EAS/OTA, or Stripe.

## Source freeze

| Field | Value |
| --- | --- |
| PR | https://github.com/PetridesAlex/Bridge-hive/pull/59 |
| Prior tip (pre Preview isolation) | `4fb5633f2fff2ae21a468e3ff1597ceba0cb7d87` |
| Isolation + claim-fix tip | *(filled after push of this manifest)* |
| Migration file | `supabase/migrations/20261118180000_worker_invoice_due_soon_reminder.sql` |
| Migration SHA-256 (**updated**) | `3da76ece8e2d5026e1001b2eef68ba5bffc704bdb7e60065c56b7253d1ed902d` |
| Prior authorized SHA (superseded) | `e46c4b1bd5ed830925c7664d8e0e51beddb9fd1c87026224ca0be68598ea96fd` |

**Do not apply the superseded checksum.** Staging required a PG-safe rewrite of the invoice invalidation clause inside `claim_worker_push_deliveries` (`EXISTS` instead of `UPDATE … FROM … LEFT JOIN` onto the target alias).

## Preview isolation (required)

- `VERCEL_ENV=preview` → commission due-dates cron **never** runs (`preview_isolation`), even if `WORKER_COMMISSION_DUE_DATES_CRON=1` or secrets are present.
- Staging used authenticated Bridge-Hive-Test RPC/SQL only — not a Preview HTTP cron.

## Staging target + apply record

| Field | Value |
| --- | --- |
| Project | Bridge-Hive-Test `egtpiprwqgmkogthkmew` |
| Pre-apply head | `20261116095752_org_worker_message_deletion` |
| Applied migration name(s) | `worker_invoice_due_soon_reminder` (+ follow-on `…_rpc_complete`, `…_claim_fix` to finish truncated MCP apply and claim fix) |
| Unrelated overdue before processor | **0** |
| Fixture tag | `STG-DUE3` (cleaned up) |

## Staging results

| Check | Result |
| --- | --- |
| First `process_worker_commission_due_dates` | `reminders_3d=4`, `marked_overdue=0`, `reminders_1d=0`, `reminders_due_today=0` |
| Durable in-app + push event | 4× `invoice_due_soon` notifications/events for non-demo open fixtures; 1 delivery/device for OPEN |
| Repeat processor | `reminders_3d=0`; re-enqueue OPEN → noop |
| Demo user | **0** notifications |
| Sandbox invoice table | **0** billing events |
| Paid / void / payment_processing | pending deliveries → `invalid` / `invoice_unavailable` via suppress trigger |
| Cross-user | other worker has **0** rows for OPEN invoice; owner has **1** |
| Claim (no Expo send) | claimed `eventType=invoice_due_soon`, `invoiceId` present |
| Provider / phone delivery | **NOT RUN** |
| Shift/message claim rechecks | still present (`shift_unavailable`, `message_unavailable`) |
| Fixture cleanup | invoices/profiles/sandbox left = 0 |

### Full processor effects (staging)

Running the full due-date processor can:

1. Mark `open`/`payment_processing` with `due_at <= now()` as `past_due` + audit/notify  
2. Enqueue **one** durable `invoice_due_soon` per open invoice in the 3-day window  
3. Soft-dedupe in-app `invoice_due_one_day` / `invoice_due_today`  
4. Invalidate pending due-soon deliveries when overdue  

On this staging run: only (2) fired (4 new durable reminders); no overdue mutations.

## Production recipient snapshot (read-only `hfnymqjrbppculcofaag`, 2026-11-18)

| Window | Count |
| --- | --- |
| Overdue open/processing (`due_at <= now()`) | **1** |
| Open in 3-day warning | **0** |
| Open 1-day (excl. today) | **0** |
| Open due today | **0** |

**Catch-up (3-day):** currently **none** (open_3d=0).  
**Overdue side effect:** first production processor run can mark that **1** overdue open/processing invoice `past_due` and emit past-due/restriction notifies if not already past_due — require explicit approval for that mutation scope.

## Older-installed-app compatibility gate

- Older builds that only parse shift/message push types must **not** be treated as E2E-ready for invoice taps.
- Keep `WORKER_COMMISSION_DUE_DATES_CRON` / vercel cron **off** for invoice push until a native build with `invoice_due_soon` + `/invoices/{uuid}` ships (or use a tested fallback).
- In-app due-soon banners from invoice list data can still help without the new push type.
- Preview isolation remains mandatory so Preview never hits production billing.

## Production activation checklist (Prompt 2)

1. Confirm PR head + migration SHA `3da76ece…`  
2. Re-read live recipient counts on `hfnymqjrbppculcofaag`  
3. Explicit approval for catch-up scope  
4. Apply **only** the frozen migration file (full content; one forward migration)  
5. Enable cron/flag only after client compatibility gate  
6. Merge only after backend gates; verify Vercel READY SHA  
7. TestFlight: prepare only — do not execute  
