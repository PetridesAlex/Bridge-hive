# Physiotherapist production release notes

**Project:** `hfnymqjrbppculcofaag`  
**Branch:** `feat/physiotherapist-role`  
**Status:** Unmerged PR only until schema approvals (B/C). **028 is database-untested — not a PASS.**

Seven physiotherapist documents (product checklist, not a statutory claim):

1. identity_document_front  
2. identity_document_back  
3. physiotherapy_degree  
4. physiotherapist_registration_certificate  
5. physiotherapy_practising_licence (requires known future `expires_at`)  
6. tax_identification_proof  
7. social_insurance_proof  

Migrations in this PR: **025 → 026 → 027 → 028**.  
`027_revoke_activation_rpc_anon.sql` is the TEST-validated original (org invitation/admin anon revokes).  
Do **not** re-apply `024` DDL (live RPCs already 024-equivalent; history row still pending evidence).

---

## Sequence (authorized so far: P1 only)

1. **P1 (this PR):** commit + push + open **unmerged** PR.  
2. **B (not authorized):** 024 history-only insert after documented evidence.  
3. **C (not authorized):** apply 025→028 on production.  
4. **D (not authorized):** merge this PR.  
5. **E/F (not authorized):** Vercel production + mobile publish.

Schema must land (**C**) before merge/deploy (**D/E**). Code is versioned here first.

---

## Pre-migration read-only capture (before C)

Private local snapshots (never commit). Run on production read-only; save under a gitignored path.

Two-function CSV already captured covers **only**:

- `ensure_my_worker_profile`  
- `submit_worker_verification_package`  

**Not** covered by that CSV — export before 026–028:

```sql
-- Privileges for objects 026–028 will replace or revoke
select
  n.nspname as schema,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as args,
  has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'create_shifts_batch',
    'ensure_my_worker_profile',
    'submit_worker_verification_package',
    'credential_expiry_is_valid',
    'worker_credential_requirements',
    'worker_required_credential_types',
    'mark_organization_invitation_delivery',
    'assert_invitation_resend_allowed',
    'accept_organization_invitation_by_id',
    'get_organization_invitation_preview_by_id',
    'revoke_organization_invitation',
    'accept_organization_invitation',
    'get_admin_organization_detail'
  )
order by p.proname;

-- Optional definitions (large): save privately, do not paste into chat
-- select pg_get_functiondef(p.oid) ...
```

Also re-run migration history evidence (E1–E3) from the release package before any 024 history insert.

---

## 025 before 026 (enum transaction rule)

PostgreSQL cannot use a newly added enum value in the **same** transaction that adds it.

- **025** only: `alter type public.worker_role add value if not exists 'physiotherapist';` — must **commit**.  
- **026** then references `'physiotherapist'` in functions/checklists.  

Apply as separate migrations in order; never squash 025+026 into one transaction for production.

---

## 024 history reconciliation (pending evidence)

Accepted: history ends at **023**; two worker RPCs are body-equivalent to 024.  
**Pending:** full `schema_migrations` list + table shape (E1–E3).  
**Then (approval B only):** history-only insert for version `024` / name `worker_package_submit_and_profile_bootstrap`.  
**Never** re-run `024_*.sql` DDL.

---

## Recovery (no automatic full-database restore)

| Approach | Use when |
| --- | --- |
| **Targeted forward fix** | Prefer: corrective migration or privilege `GRANT`/`REVOKE` for a specific RPC |
| **Targeted rollback of a function** | Restore definition from private pre-migrate export for that object only |
| **Scheduled backup restore** | Last resort: Dashboard backup `2026-10-09 00:55:01 UTC` — loses post-backup DB rows; **storage not included**; **never auto-restore** |
| **PITR** | Only if later verified — restore to T0 before Phase 2 |

Agent/CI must **never** trigger a whole-database restore automatically.

---

## Mobile build / update route

| Item | Actual route |
| --- | --- |
| App | `apps/worker-mobile` (Expo SDK **54**, Expo Router) |
| Config | `app.json` only — **no `eas.json`**, **no `expo-updates`** |
| Dev / QA | `npm start -w @bridge-hive/worker-mobile` → Expo Go / simulators |
| Web bundle check | `npx expo export --platform web` (from worker-mobile) |
| Store / OTA | **Not configured in-repo.** Production publish (approval F) requires the team’s existing manual/EAS path outside this tree |
| Compatibility before C | Preview/web can load; physiotherapist RPC/enum paths **fail or mis-label** until 025–028 are on the DB the app points at |

---

## Vercel Preview (may run on this push)

| Check | Expectation before C |
| --- | --- |
| Preview DB | **Same production Supabase project** if Preview env uses prod URL/keys (typical). Preview does **not** create an isolated migrated DB. |
| UI with physio copy/forms | May render |
| Creating/claiming physio shifts, enum casts, new RPCs | **Cannot fully pass** until production (or a dedicated DB) has 025–028 |
| 028 anon-EXECUTE / pgTAP | **Not run in Preview** — database-untested |
| Fixtures | Must **not** run against production |

Do not change production configuration for Preview.

---

## Migration test status

| Migration | Status |
| --- | --- |
| 025 | Untested on production this cycle |
| 026 | Untested on production this cycle |
| 027 | TEST-validated file preserved; untested on production this cycle |
| 028 | **Database-untested. Not a PASS.** |

Local suite `physiotherapist_role.test.sql` (`plan(48)`) prepared; not executed this cycle.
