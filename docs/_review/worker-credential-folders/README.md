# Worker credential folders — draft SQL

**Status:** DRAFT ONLY — do not apply to hosted Supabase without separate approval.

## Why this migration exists

Live production still uses `credential_has_uploaded_file` inside:

- `list_verification_applications` (awaiting / submitted counts + `submitted_at`)
- `mark_credentials_under_review`

Tax identification and social insurance are text credentials. Folder list counts under-report those rows, and “Mark under review” can raise `FILE_REQUIRED` for text-only payloads.

`approve_reviewed_worker_credentials` already uses `credential_requirement_satisfied` (file **or** text for text types).

## File

- `20261110180000_worker_folder_list_text_counts.sql`

## Affected

- Functions: `list_verification_applications`, `mark_credentials_under_review`
- No table DDL, no row rewrites, no storage moves
- Grants unchanged: `authenticated` execute; auth still requires platform_support | platform_verifier | platform_super_admin (via `is_platform_admin`)

## Security

- SECURITY DEFINER retained with `search_path = public`
- List RPC still returns metadata/counts only — **never** `text_value`
- No RLS policy changes

## Rollback

Forward-only replace of function bodies. Rollback = redeploy prior function definitions from migration `016` / `026` (or current production dump).

## Apply plan (when approved)

1. Dry-run / peer review SQL
2. Apply via approved migration path
3. Re-run `supabase/tests/verification_applications.test.sql` (+ text credential cases)
4. Smoke admin folder list counts for a worker with tax/social text only
