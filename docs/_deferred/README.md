# Deferred release packages (not active)

These artifacts are **source-preserved** in the release candidate but are **not** part of the active migration set or deployed Edge Functions.

| Package | Path | Status |
| --- | --- | --- |
| Worker self-service account deletion SQL | `migrations/20261113170000_worker_self_service_account_deletion.sql` | UNAPPLIED — needs separate approval |
| `delete-worker-account` Edge Function | `functions/delete-worker-account/` | NOT DEPLOYED — needs separate approval |
| Maps coordinates SQL | (not copied; remains on dirty primary as `042_location_coordinates.sql`) | Deferred |

Do not move these into `supabase/migrations/` or deploy without an explicit approval scoped to that package.
