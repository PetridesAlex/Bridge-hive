# How to run Bridge Hive SQL tests

These are pgTAP tests for local Supabase. They use the real `auth.users` table (never create `auth` schema/objects).

## Prerequisites

1. Local Supabase running (`npx supabase start`)
2. Migrations applied (`npx supabase db reset`)

## Run

```bash
npx supabase test db
```

## Files

| File | Purpose |
| --- | --- |
| `rls_coverage.test.sql` | RLS enabled; anon grants; assignment insert lock |
| `tenant_isolation.test.sql` | Cross-org reads denied |
| `claim_shift.test.sql` | Claim eligibility, deadline, fill, conflict |
| `review_timesheet.test.sql` | Approval snapshot + report ≠ reconciled |
| `financial_workflow.test.sql` | Payout account submit/verify |
| `check_in_out.test.sql` | Assignment check-in / check-out RPCs |
| `timezone_conversion.test.sql` | Timezone storage helpers |
| `worker_shift_details_rpc.test.sql` | Worker shift detail RPC |
| `admin_oversight.test.sql` | Platform admin roles, verification, suspension |
| `credential_requirements.test.sql` | Role credential checklists and payout gating |
| `verification_applications.test.sql` | Worker-centric application queue and package approve |

Shared helper reference (not executed by pg_prove): [`../test_support/helpers.sql`](../test_support/helpers.sql)

## Auth fixture pattern

1. Insert into existing `auth.users` as the privileged test role
2. Ensure `public.profiles` (trigger and/or upsert)
3. Seed tenant data
4. Then `SET LOCAL ROLE authenticated` + JWT claim `sub`
5. Assert with pgTAP; `ROLLBACK` at end
