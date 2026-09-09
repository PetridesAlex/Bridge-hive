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

| Worker role | Minimum credentials (MVP) |
| --- | --- |
| `registered_nurse` | Active nursing licence / registration evidence; identity document |
| `ward_assistant` | Identity document; any site-required training certificates |

- Workers cannot self-mark `verification_status = verified`
- Credential files: private Storage `credentials/{user_id}/...`
- Platform verifiers use `verify_credential` / `set_worker_verification` RPCs

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

- **Pilot storage:** Masked IBAN only (`masked_iban`, e.g. `CY••••6789`)
- **Do not** store raw full IBAN in application tables for MVP
- Provider field defaults to `manual_bank`
- Account statuses: `pending` → `verified` / `rejected` / `failed` / `suspended` / `expired`
- Platform finance verifies via `verify_payout_account`
- Future option: provider-hosted tokenization (Stripe / bank partner) — deferred

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
