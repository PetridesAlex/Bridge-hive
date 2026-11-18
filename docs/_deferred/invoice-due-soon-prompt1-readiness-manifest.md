# Prompt 1 — frozen readiness manifest

**Status:** implementation complete; STOP before Prompt 2 production activation.  
**Generated:** 2026-11-18  
**Canonical checkout:** `/Users/petridesaalex/Desktop/Bridge-Hive-release-candidate`  
(also reachable via Desktop symlink after folder move)

## Source

| Field | Value |
| --- | --- |
| Branch | `feat/invoice-due-soon-3day-reminder` |
| Base main | `9db2168fcbb6afced88b1431794d2768187a5000` (PRs #57/#58) |
| PR | *(filled after `gh pr create`)* |
| Head SHA | `30d0bb2e5536a682f22e4c0c01f8952be2e5f743` |

### Included

- Durable `invoice_due_soon` reminder (in-app + push outbox)
- Domain push type / route validation / lock-screen copy
- Mobile notifications banner copy (EN/EL), billing Android channel
- Preserved mobile design: Privacy TOC/rail/controller card, invoice MoneySummary/% rate, BillingRestrictionAlert, StickyActionBar tab inset
- Prepared (gated) API route `apps/web/app/api/internal/worker-commission-due-dates` — **not** in `vercel.json`
- Staging approval payload doc

### Excluded

- `.tmp/`, `.env`, secrets
- Production SQL/cron activation, EAS/OTA/TestFlight execution, Stripe live setup
- Maps / account-deletion deferred packages
- Stale Stripe checkout branches

## Restriction + warning rule

- **Restriction deadline:** `worker_commission_invoices.due_at` via `worker_has_overdue_commission` (unchanged). New-shift access only.
- **Warning window:** first scheduler run at/after `due_at - 3 days` through `due_at` (catch-up allowed; truthful copy).
- **Commission / deadline policy:** 1700 bps (17%), 10 calendar days — unchanged.
- **Hosted processor (prod):** matches migration 018; **no `cron.job`** (pg_cron absent). Push dispatch cron in `vercel.json` unchanged (`*/2`, `*/15`).

## Migration / RPC / config

| Artifact | Detail |
| --- | --- |
| Migration | `supabase/migrations/20261118180000_worker_invoice_due_soon_reminder.sql` |
| SHA-256 | `e46c4b1bd5ed830925c7664d8e0e51beddb9fd1c87026224ca0be68598ea96fd` |
| After hosted heads | prod `20261116095833`; test `20261116095752` |
| RPCs | `enqueue_invoice_due_soon_notification`, `invalidate_invoice_due_soon_pending`; updated `process_worker_commission_due_dates`, `claim_worker_push_deliveries` |
| Scheduler | **Not registered.** Route gated by `WORKER_COMMISSION_DUE_DATES_CRON=1` |
| Catch-up policy (for Prompt 2) | Existing open invoices already inside the 3-day window **will** receive one catch-up reminder on first enabled processor run |

## Tests / gates actually run

| Gate | Result |
| --- | --- |
| Mobile Jest (full) | 24 suites / 141 tests passed |
| Web `worker-push` Jest | 12 passed |
| Domain `invoice-due-soon*` Jest | 12 passed |
| Mobile `tsc` | passed |
| Web `tsc` | passed |
| Next `build` | passed |
| Expo export iOS | passed → `/tmp/bh-invoice-reminder-ios-export` |
| Expo export Android | passed → `/tmp/bh-invoice-reminder-android-export` |
| Staging fixture write / device push | **not run** — awaiting staging approval (`docs/_deferred/invoice-due-soon-staging-approval-payload.md`) |
| Production SQL / cron | **not run** |

## Production activation request (exact Prompt 2 input)

Use only this manifest + PR head SHA. Before writes on `hfnymqjrbppculcofaag`, show:

1. Frozen migration checksum `e46c4b1bd5ed830925c7664d8e0e51beddb9fd1c87026224ca0be68598ea96fd`
2. Read-only eligible open-invoice count in the 3-day window (prod snapshot at Prompt 1 freeze: **0**)
3. Explicit approval that catch-up notifications **will** send to those invoices once (if count > 0 at activation)
4. Then apply only this migration; enable `WORKER_COMMISSION_DUE_DATES_CRON=1` + vercel cron for `/api/internal/worker-commission-due-dates` only after backend/client gate
5. Merge PR only after backend prerequisites; verify Vercel READY SHA = merged main
6. Older apps: invoice push type unknown → keep feature gated until compatible native build; in-app banner still works from invoice list data
7. TestFlight: prepare command only — do not execute

## TestFlight preflight (do not execute)

- App: `com.bridgehive.worker` / scheme `bridgehive` / EAS `@webrunner-agency/bridge-hive-worker`
- Merchant: `merchant.com.bridgehive.worker`
- Profile: `testflight-sandbox` (sandbox-only; confirm `pk_test_` + preview Supabase URL)
- Build source: this PR head after merge (or the frozen branch SHA below)
- Suggested command (not run):  
  `eas build -p ios --profile testflight-sandbox --project-dir apps/worker-mobile`

## Older-app compatibility

- Apps that only understand shift/message push types will ignore unknown `invoice_due_soon` payloads safely if they reject unknown routes; do not claim E2E phone delivery until a build with this domain is installed.
- In-app due-soon banner does not require the new push type.
