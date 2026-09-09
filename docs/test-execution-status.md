# Phase 2 worker mobile — acceptance checklist

Verified in this migration:

- [x] Expo app scaffolds and starts from `apps/worker-mobile`
- [x] Typecheck passes (root packages + worker-mobile)
- [x] Lint passes (expo lint, 0 errors)
- [x] Web export bundles all worker routes (20 static routes)
- [x] Auth screens: welcome, login, register, pending, rejected
- [x] Worker-only tabs: home, shifts, payments, profile
- [x] Shift browse + detail + claim_shift wiring
- [x] Check-in / check-out + timesheet submit wiring
- [x] Credentials list/register (pending status only)
- [x] Payout list with Processing/Paid/Issue mapping (never treats reported_paid as Paid)
- [x] Masked IBAN submit via submit_payout_account
- [x] Org/admin accounts rejected from worker routes
- [x] Migration 014 get_worker_shift_details added
- [x] Org/admin UI archived to `_healthbridge-reference/`
- [x] Root Expo application removed after verification

Manual device checks (run locally with Supabase up):

- [ ] Sign up creates profiles + worker_profiles
- [ ] Session persists across app reload (AsyncStorage)
- [ ] Signed-out redirect to /welcome
- [ ] Unverified worker stays on pending
- [ ] Verified worker reaches tabs
- [ ] claim_shift success / already-filled / not-eligible / conflict
- [ ] Android smoke test
- [ ] iOS smoke test
