# Test execution status (Phase 1 remediation)

## A. Verified and passing (static / package)

- Domain package installs with Zod
- Migrations `001`–`012` present on disk
- Product decisions locked for commission payer + masked IBAN storage

## B. Written but not executed

All SQL tests under `supabase/tests/` — **Docker was unavailable** in the remediation environment, so migrations were **not** applied and tests were **not** run.

```bash
npx supabase start
npx supabase db reset
# then run commands in README.md
npm run db:types
```

## C. Failing

- None observed (tests not executed)

## D. Missing after remediation (should be empty for critical path)

- Live generated `database.generated.ts` (requires local Supabase)
- Concurrent claim stress test under load (optional Phase 8)

## E. Product / legal (locked defaults)

See [docs/product-decisions.md](../docs/product-decisions.md)
