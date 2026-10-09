# Physiotherapist production release notes

**Project:** `hfnymqjrbppculcofaag`  
**PR:** https://github.com/PetridesAlex/Bridge-hive/pull/25 (**unmerged**)  
**Commit:** `a209e82`  
**Status:** B/C payload finalized for approval. **No history write, migrate, merge, or deploy until you reply `Approve B and C`.**  
**028:** database-untested — **not a PASS.**

Seven physiotherapist documents (product checklist, not a statutory claim):

1. identity_document_front  
2. identity_document_back  
3. physiotherapy_degree  
4. physiotherapist_registration_certificate  
5. physiotherapy_practising_licence (requires known future `expires_at`)  
6. tax_identification_proof  
7. social_insurance_proof  

Migrations: **025 → 026 → 027 → 028** (TEST-validated original 027 preserved).

---

## Pre-migration snapshot coverage (verified)

Private archive (gitignored): `reconcile-artifacts/private/pre-026-028-object-snapshot-2026-10-09.csv`

| Check | Result |
| --- | --- |
| History | 001–023 only |
| Enum `worker_role` | `registered_nurse`, `ward_assistant` only — **no `physiotherapist`** |
| Existing 026 replace targets | Present (anon EXECUTE true) except new objects below |
| 027 invitation/admin targets | All seven present (anon EXECUTE true) |
| 028 targets present | `create_shifts_batch`, `ensure_my_worker_profile`, `submit_worker_verification_package` |

### Does not exist yet (026 will create; expected)

- `credential_expiry_is_valid` (028 will revoke anon after create)
- `correct_credential_expires_at`
- `worker_profiles_guard_role`

---

## Correction: Dashboard paste ≠ bookkeeping

Running migration SQL in the Dashboard applies DDL only. It does **not** register rows in `supabase_migrations.schema_migrations`. Partial Dashboard applies + guessed history inserts are forbidden.

---

## ONE supported apply method (C)

**Supabase CLI `db push --db-url <percent-encoded Session pooler URI>`** from the feature worktree.

- **`--db-url` only** — do not combine with `--password` (CLI 2.120.0 mutual exclusion).
- Host: `aws-1-eu-west-1.pooler.supabase.com`; user: `postgres.hfnymqjrbppculcofaag`; `sslmode=require`.
- CLI applies each pending file in order and **records each version** on success.
- Separate files ⇒ **025 commits before 026** starts (enum usable).

On mid-push failure: stop; inspect history + objects; targeted fix or restore-from-private-snapshot; resume CLI for **remaining** pending versions only — never invent history rows.

---

## 024 history reconciliation (B — separate; evidence complete)

PK `version`; columns `version`, `name`, `statements` (nullable). Live RPC bodies already 024-equivalent. **Do not re-apply 024 DDL.**

```sql
begin;

insert into supabase_migrations.schema_migrations (version, name)
values (
  '024',
  'worker_package_submit_and_profile_bootstrap'
);

select version, name
from supabase_migrations.schema_migrations
where version = '024';

commit;
```

---

## Final B/C payload

### Order

1. **B** — 024 history-only insert (above).  
2. **C** — `supabase db push --db-url '…'` applying **025 → 026 → 027 → 028**.  
3. Verify (below).  
4. **Not included:** merge PR #25, Vercel prod, mobile publish.

### C command shape (password never logged)

```bash
cd /Users/petridesaalex/Desktop/Bridge-Hive-physiotherapist
# Build URI with percent-encoded password; do not echo.
npx supabase db push --db-url "$PROD_DB_URL"
```

Expect CLI to apply only 025, 026, 027, 028. **028 is first production execution (untested).**

### Verification after C

```sql
select version, name from supabase_migrations.schema_migrations
where version >= '024' order by version;
-- expect 024,025,026,027,028

select e.enumlabel from pg_type t
join pg_enum e on e.enumtypid = t.oid
join pg_namespace n on n.oid = t.typnamespace
where n.nspname='public' and t.typname='worker_role'
order by e.enumsortorder;
-- includes physiotherapist

select p.proname,
  has_function_privilege('anon', p.oid, 'EXECUTE') as anon_x,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as auth_x
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname='public' and p.proname in (
  'create_shifts_batch','ensure_my_worker_profile',
  'submit_worker_verification_package','credential_expiry_is_valid',
  'mark_organization_invitation_delivery','get_admin_organization_detail'
);
-- anon_x false; auth_x true; credential_expiry_is_valid exists
```

Smoke (authenticated): RN/Ward; physio selectable. No fixtures; no auto-approve applicants.

### Recovery

1. Targeted forward fix / privilege repair.  
2. Restore individual defs from private snapshot.  
3. Last resort: scheduled backup `2026-10-09 00:55:01 UTC` (never automatic; storage excluded).

---

## Approval

Reply **`Approve B and C`** to authorize production history insert + `db push`.  
Until then: no production writes.
