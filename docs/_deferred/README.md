# Deferred release packages (not active)

These artifacts are **source-preserved** but **not approved for hosted apply/deploy**.

| Package | Candidate location | Status |
| --- | --- | --- |
| Worker self-service account deletion SQL | `docs/_deferred/migrations/20261113170000_worker_self_service_account_deletion.sql` | UNAPPLIED — do not move into `supabase/migrations/` without approval |
| `delete-worker-account` Edge Function | `supabase/functions/delete-worker-account/` (source in tree for client/tests) | NOT DEPLOYED — deploy needs separate approval |
| Maps coordinates SQL | remains on dirty primary as untracked `042_location_coordinates.sql` | Deferred — not copied into active migrations |

Do not apply SQL or deploy functions without an explicit approval scoped to that package.
