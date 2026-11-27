# Active Shifts monitor — deferred RPC

**Status:** deferred / not applied  
**Project:** Bridge-Hive `hfnymqjrbppculcofaag`  
**File:** `supabase/deferred_migrations/20261127120000_list_admin_shifts.sql`

This SQL is **not** under `supabase/migrations/` and must **not** be applied by `db push` or a bulk migration workflow until explicit hosted approval.

## Current runtime path (until RPC is approved + wired)

`apps/web` loads the monitor via:

1. `requirePlatformAdmin('platform_super_admin')` / `canManageOrganizations`
2. Then `createServiceRoleClient()` (`SUPABASE_SERVICE_ROLE_KEY` server-only)

Page, Excel/CSV export, org selector, aggregates, and assignment details all use that privileged server client today. Applying the deferred RPC **alone** does not remove the key requirement until TypeScript callers are switched to `supabase.rpc('list_admin_shifts')` under the admin JWT.

## Deferred RPC summary (review only)

| Item | Value |
| --- | --- |
| Function | `public.list_admin_shifts(...)` |
| Auth | `is_platform_admin('platform_super_admin')` or `FORBIDDEN` |
| Grant | `EXECUTE` to `authenticated`; revoked from `public` |
| Capacity | `shift_active_assignment_count` / `shift_open_positions` |
| Views | `active` (default), `upcoming`, `in_progress`, `ended`, `cancelled`, `draft`, `all` |
| Pagination | `p_limit` (1–5000), `p_offset`; `total_count` window |
| Sort | `starts_asc` (default), `starts_desc`, `updated_desc` |

Do not invent history rows or repair unrelated migration-history mismatches as part of this feature.

## Checksum

SHA-256 of deferred SQL file: `d0ad73f26dad8366d9c020aa37a53186a3b8f9163731a971bd2cab41d52c212b`
