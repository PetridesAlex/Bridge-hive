# Bridge Hive Phase 1 schema map

## Tables

| Table | Migration | Notes |
| --- | --- | --- |
| `profiles` | 001 | 1:1 with `auth.users` |
| `organizations` | 002 | Tenant |
| `organization_members` | 002 | Org roles |
| `locations` / `wards` | 002 | Sites |
| `worker_profiles` / `credentials` | 003 | Worker eligibility |
| `shifts` / `shift_requirements` | 004 | Marketplace offer |
| `shift_assignments` / `timesheets` | 005 | Claim + hours |
| `device_tokens` / `notifications` / `audit_events` | 006 | Infra |
| `platform_admin_roles` | 010 | Server-side platform admins |
| `platform_settings` | 011 | Commission bps, due days |
| `payout_accounts` / `payout_account_events` | 011 | Masked IBAN destination |
| `pay_runs` | 011 | Optional payment batches |
| `payouts` | 011 | Immutable snapshot + transfer lifecycle |
| `commission_obligations` | 011 | Org-funded platform fee |
| `organization_payment_reports` | 011 | Org bank transfer evidence |
| `payment_adjustments` | 011 | Audited adjustments only |

## Privileged RPCs

| RPC | Migration |
| --- | --- |
| `claim_shift` / `publish_shift` | 007 |
| `review_timesheet` | 009 / 012 |
| `verify_credential` / `set_worker_verification` / `is_platform_admin` | 010 |
| `create_financial_snapshot` | 012 |
| `submit_payout_account` / `verify_payout_account` | 012 |
| `generate_payment_instructions` | 012 |
| `report_organization_payment` | 012 |
| `reconcile_direct_transfer` / `mark_payout_overdue` | 012 |

## Storage buckets (003)

- `credentials` (private, `{user_id}/...`; platform verifier read)
- `profile-avatars` (public read, own-folder write)

## Audit events

Written by RPCs: `claim_shift`, `publish_shift`, `review_timesheet`, `verify_credential`, `set_worker_verification`, `create_financial_snapshot`, payout account submit/verify, `report_organization_payment`, `reconcile_direct_transfer`, `mark_payout_overdue`.

## RLS recursion fix (013)

`shifts` ↔ `shift_assignments` SELECT policies used SECURITY DEFINER helpers to avoid infinite recursion.
