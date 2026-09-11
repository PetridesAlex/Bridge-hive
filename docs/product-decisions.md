# Product decisions for Bridge Hive

Capture launch-critical choices before production finance go-live.

## Status

**Locked for pilot (Phase 1 remediation).** Update only with product + legal + finance sign-off.

## Operating jurisdiction

- **Primary market:** Cyprus (EU)
- **Default timezone:** `Europe/Nicosia`
- **Default currency:** `EUR` (integer minor units / cents)
- **Notes:** Confirm nursing licence recognition, right-to-work, GDPR controller/processor roles, and payroll/tax treatment with local counsel before go-live.

## Workforce model

- **Chosen model for MVP:** Staffing marketplace
- **Worker relationship:** Independent service providers subject to local classification rules (must be validated legally)
- **Finance:** Organization-initiated bank transfer (not Stripe Connect pooled funds) for the pilot

## Credential rules (MVP)

| Worker role | Required documents | Optional | Separate workflow |
| --- | --- | --- | --- |
| `registered_nurse` | National identity card front + back; nursing licence; nursing degree/diploma (πτυχίο); tax identification proof; social insurance proof | CV | Payout account / masked IBAN |
| `ward_assistant` | National identity card front + back; employment certificate (Βεβαίωση από εργασία – τίτλος θέσης); tax identification proof; social insurance proof | — | Payout account / masked IBAN |

- Terminology: use “National identity card” / “Δελτίο ταυτότητας” (never “Police ID”)
- Tax and social-insurance requirements are **proof documents** in this phase; raw identifier collection/encryption is deferred
- Workers cannot self-mark `verification_status = verified`
- Credential files: private Storage `credentials/{user_id}/{credential_type}/...`
- Platform verifiers use `verify_credential` / `set_worker_verification` RPCs
- Final verification also requires `worker_has_satisfied_payout_account` (**verified** payout account only — pending is not enough)
- Marketplace eligibility (`check_worker_eligibility` / `claim_shift`) also requires verified payout + valid role-required credentials
- Platform super admins suspend/reactivate via `suspend_worker_account` / `reactivate_worker_account`
- Suspended accounts (`profiles.account_status`) cannot claim shifts

## Acceptance policy

- **MVP:** First eligible verified worker who successfully calls `claim_shift` wins
- Concurrent claims: exactly one assignment; others get `SHIFT_NOT_AVAILABLE` / `SHIFT_ALREADY_FILLED`

## Pricing and commission (LOCKED)

- Shift stores immutable `rate_minor` + `currency` at publish time
- **Default commission rate:** `1600` basis points (**16%**), configurable via `platform_settings.default_commission_rate_bps` (allowed band 15–17% / 1500–1700 for commercial policy)
- Snapshot fields stored on every payout:
  - `gross_amount_minor`
  - `commission_rate_bps`
  - `commission_amount_minor`
  - `worker_transfer_amount_minor`
  - `organization_total_due_minor`
- **LOCKED settlement model:** Organization pays worker **gross**; organization pays platform commission via separate `commission_obligations` (`payer_type = organization`)
- Worker-funded commission is **not** used for the pilot
- Changing later rates must not rewrite historical snapshots (DB triggers enforce immutability)

## Attendance proof

- **MVP:** Manual check-in / check-out + timesheet submission
- Organization reviews via `review_timesheet` (approve/reject with reason)
- Approval creates immutable financial snapshot via `create_financial_snapshot`

## Payout account storage (LOCKED)

- **Pilot storage:** Masked IBAN only (`masked_iban`, e.g. `CY••••6789`) after server-side IBAN checksum validation
- **Do not** store raw full IBAN in application tables for MVP (no vault / encryption claimed)
- **Masked-only storage cannot support production bank transfers** — Phase 5 vault/tokenization is required before org payment instructions or IBAN reveal
- Private **payout-proof** document (`payout-proofs` bucket) supports local administrative review only
- Account holder name may be stored for admin matching against proof; never placed in audit/notification metadata
- Provider field defaults to `manual_bank`
- Account statuses: `pending` → `verified` / `rejected` / `failed` / `suspended` / `expired`
- Phase 4: only `platform_super_admin` may view proof / approve/reject via `verify_payout_account` (internal approval for platform use — not bank ownership proof)
- Worker discovers payout setup from **Account Setup** (`/auth/worker/pending`) or verified **Profile → Payout account** only — never by typing a URL
- Org Phase 4: Financial snapshot shows amounts + payout-approved Yes/No where applicable; **no full IBAN, masked IBAN, proof, or credentials** to organizations; bank transfer / IBAN reveal unavailable until secure payment setup
- Provider-backed bank ownership verification / full IBAN vault remain deferred (Phase 5)
- **Production bank transfers remain blocked** until secure IBAN vault/tokenization and access controls exist
- Audit and notification metadata must not include IBAN, masked IBAN, account holder name, proof paths, or signed URLs

## Payout timing / pilot payment model (LOCKED)

- **Pilot:** Organization-initiated bank transfer
- Lifecycle (enforced in `payouts.status`):
  1. `approved` — snapshot created after timesheet approval
  2. `payment_instruction_ready` — verified payout account attached / instructions generated
  3. `reported_paid` — transitional org signal (DB moves to `reconciliation_pending`)
  4. `reconciliation_pending` — awaiting platform finance review
  5. `reconciled` — only after `reconcile_direct_transfer` by platform finance
  6. `overdue` / `disputed` / `failed` / `cancelled` — exception paths
- **Rule:** Platform must **never** show worker “paid” solely because an organization reported a transfer

## Platform admin bootstrap

- Table: `platform_admin_roles`
- Roles: `platform_support`, `platform_verifier`, `platform_finance`, `platform_super_admin`
- **First admin grant:** service-role / SQL insert by DevOps (no client self-grant)

```sql
insert into public.platform_admin_roles (user_id, role)
values ('<auth-user-uuid>', 'platform_super_admin');
```

## Explicitly deferred

Multi-slot shifts, shift swapping, ratings, in-app chat, route tracking, advanced rostering, referrals, subscriptions, automated dispute resolution, automatic payouts / Stripe Connect.

## Decision owners

| Decision | Owner | Status |
| --- | --- | --- |
| Jurisdiction / compliance | Product + legal | Draft (Cyprus) |
| Workforce classification | Product + legal | Draft (marketplace) |
| Commission payer | Product + finance | **LOCKED: organization** |
| Commission rate bps | Product + finance | **LOCKED default 1600 (16%)** |
| Payout account storage | Product + legal | **LOCKED: masked IBAN only** |
| Credential checklist | Ops / clinical lead | Draft |
| Payout SLA (due days) | Finance / ops | Default 7 via `platform_settings` |
