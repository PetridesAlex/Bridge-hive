# Continuation — all-platform source save (2026-11-27)

Non-secret handover for continuing **payment integration** from this saved source.
This document is **not** a production release approval and **does not** authorize a native build.

## Authoritative source

| Item | Value |
|------|--------|
| Folder | `/Users/petridesaalex/src/Bridge-Hive-build7-validate` |
| Branch | `fix/ios-build7-regressions` |
| HEAD | `31084f74fd3e34f852bde26474cfd9081cd6e253` |
| PR | https://github.com/PetridesAlex/Bridge-hive/pull/60 |
| Remote | `https://github.com/PetridesAlex/Bridge-hive.git` |
| Preview backend | Production Bridge-Hive Supabase `hfnymqjrbppculcofaag` |
| Payments mode | Stripe **sandbox** only |
| Builds | **Deferred** until payment integration is finished and the owner explicitly authorizes |

## Local preview

```bash
cd /Users/petridesaalex/src/Bridge-Hive-build7-validate
BH_DEV_ALLOW_BRANCH=fix/ios-build7-regressions ./scripts/bh-dev-launch.sh status
BH_DEV_ALLOW_BRANCH=fix/ios-build7-regressions ./scripts/bh-dev-launch.sh start
BH_DEV_ALLOW_BRANCH=fix/ios-build7-regressions ./scripts/bh-dev-launch.sh restart-mobile
BH_DEV_ALLOW_BRANCH=fix/ios-build7-regressions ./scripts/bh-dev-launch.sh stop
```

Expected when ready:

- Web: http://localhost:3000
- Metro / Expo web: http://localhost:8081
- Admin Active Shifts (gated): http://localhost:3000/admin/shifts

`SUPABASE_SERVICE_ROLE_KEY` for Active Shifts must remain in **gitignored** `apps/web/.env.local` (server-only). Never put it in Expo/public env.

## Saved scope (this checkpoint)

- **Worker mobile:** Home/header/messages design, More-tab routing, billing standing banner (real RPC), messaging send/retry/visibility catch-up, credential upload client normalization, EN/EL strings, navigation contracts.
- **Platform admin:** silver-glass surfaces, Bossman desk motion, premium account chip, worker review/status polish, **Active Shifts monitor** UI + Excel/CSV export (service-role gated; RPC pending).
- **Organization:** reviewed rail/layout pieces present in this tree.
- **Website / shared:** marketing i18n/nav touch-ups, legal-content privacy helper touch-up, domain credential-requirements + Active Shifts helpers/tests.

## Explicitly pending / not production-ready

1. **Active Shifts RPC** — SQL lives only at `supabase/deferred_migrations/20261127120000_list_admin_shifts.sql` (see `docs/admin-active-shifts-deferred.md`). **Not** in `supabase/migrations/`; do not `db push` it. Runtime still uses server-only service role after super-admin auth until code is switched to RPC.
2. **Credential uploads** — client validation/normalization saved; hosted bucket/native device matrix and remaining writable lifecycle tests still open.
3. **Native push / wallets / payment settlement** — separate phase; do not invent completion.
4. **ITMS-90725** (App Store Connect, v0.1.0 / build 10) — delivery succeeded; future iOS 27 / Xcode 27 SDK requirement. Verify official requirements and compatible EAS images **before the next authorized build**. Do not upgrade the toolchain in this save.
5. **Existing TestFlight/Android binaries do not include these source changes** until a later authorized build.

## Known browser QA (do not re-run production writes)

- Real billing standing matched the overdue obligation (RPC path).
- Approved Messenger retest appeared in an open Expo web thread without Back/reopen.

## Migration reminder (do not replay)

- Source: `20261118180000_worker_invoice_due_soon_reminder.sql`
- Production recorded: `20261119100131`
- Checksum: `3da76ece8e2d5026e1001b2eef68ba5bffc704bdb7e60065c56b7253d1ed902d`

## Next phase

Payment integration only. No EAS/TestFlight/OTA/main merge/production SQL/live Stripe activation unless the owner explicitly authorizes that step after payments work is ready.
