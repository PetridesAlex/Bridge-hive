/** Shared domain enums and entity shapes for Bridge Hive (Phase 1). */

export const ACCOUNT_STATUSES = [
  'active',
  'suspended',
  'deleted',
] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

export const WORKER_ROLES = [
  'registered_nurse',
  'ward_assistant',
] as const;
export type WorkerRole = (typeof WORKER_ROLES)[number];

export const VERIFICATION_STATUSES = [
  'draft',
  'submitted',
  'under_review',
  'verified',
  'rejected',
  'suspended',
  'expired',
] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export const ONBOARDING_STATUSES = [
  'not_started',
  'in_progress',
  'completed',
] as const;
export type OnboardingStatus = (typeof ONBOARDING_STATUSES)[number];

export const ORG_STATUSES = [
  'pending',
  'active',
  'suspended',
  'closed',
] as const;
export type OrgStatus = (typeof ORG_STATUSES)[number];

export const ORG_ROLES = [
  'org_admin',
  'org_scheduler',
  'org_billing',
] as const;
export type OrgRole = (typeof ORG_ROLES)[number];

export const SHIFT_STATUSES = [
  'draft',
  'published',
  'filled',
  'in_progress',
  'awaiting_approval',
  'completed',
  'cancelled',
  'disputed',
] as const;
export type ShiftStatus = (typeof SHIFT_STATUSES)[number];

export const ASSIGNMENT_STATUSES = [
  'accepted',
  'withdrawn',
  'cancelled',
  'checked_in',
  'checked_out',
  'submitted',
  'approved',
  'rejected',
  'no_show',
] as const;
export type AssignmentStatus = (typeof ASSIGNMENT_STATUSES)[number];

export const TIMESHEET_STATUSES = [
  'draft',
  'submitted',
  'approved',
  'rejected',
  'corrected',
] as const;
export type TimesheetStatus = (typeof TIMESHEET_STATUSES)[number];

export const CREDENTIAL_STATUSES = [
  'pending',
  'under_review',
  'verified',
  'rejected',
  'expired',
  'suspended',
] as const;
export type CredentialStatus = (typeof CREDENTIAL_STATUSES)[number];

export const MEMBERSHIP_STATUSES = [
  'invited',
  'active',
  'revoked',
] as const;
export type MembershipStatus = (typeof MEMBERSHIP_STATUSES)[number];

export const PLATFORM_ADMIN_ROLES = [
  'platform_support',
  'platform_verifier',
  'platform_finance',
  'platform_super_admin',
] as const;
export type PlatformAdminRole = (typeof PLATFORM_ADMIN_ROLES)[number];

export const PAYOUT_ACCOUNT_STATUSES = [
  'pending',
  'verified',
  'failed',
  'rejected',
  'expired',
  'suspended',
] as const;
export type PayoutAccountStatus = (typeof PAYOUT_ACCOUNT_STATUSES)[number];

export const PAYOUT_STATUSES = [
  'approved',
  'payment_instruction_ready',
  'reported_paid',
  'reconciliation_pending',
  'reconciled',
  'overdue',
  'disputed',
  'failed',
  'cancelled',
] as const;
export type PayoutStatus = (typeof PAYOUT_STATUSES)[number];

export const COMMISSION_PAYER_TYPES = ['organization', 'worker'] as const;
export type CommissionPayerType = (typeof COMMISSION_PAYER_TYPES)[number];

export const COMMISSION_STATUSES = [
  'pending',
  'invoiced',
  'paid',
  'overdue',
  'disputed',
  'waived',
] as const;
export type CommissionStatus = (typeof COMMISSION_STATUSES)[number];

/** Default pilot commission: 16% (band 15–17%). */
export const DEFAULT_COMMISSION_RATE_BPS = 1600;

export type MoneyMinor = {
  amountMinor: number;
  currency: string;
};

export type FinancialSnapshot = {
  grossAmountMinor: number;
  commissionRateBps: number;
  commissionAmountMinor: number;
  workerTransferAmountMinor: number;
  organizationTotalDueMinor: number;
  currency: string;
};

export type Profile = {
  id: string;
  fullName: string | null;
  phone: string | null;
  accountStatus: AccountStatus;
  createdAt: string;
  updatedAt: string;
};

export type Organization = {
  id: string;
  legalName: string;
  displayName: string;
  slug: string;
  billingEmail: string | null;
  status: OrgStatus;
  timezone: string;
  createdAt: string;
  updatedAt: string;
};

export type Shift = {
  id: string;
  organizationId: string;
  locationId: string;
  wardId: string | null;
  requiredRole: WorkerRole;
  startsAt: string;
  endsAt: string;
  breakMinutes: number;
  rateMinor: number;
  currency: string;
  status: ShiftStatus;
  acceptanceDeadline: string | null;
  title: string | null;
  notes: string | null;
};

export type ShiftAssignment = {
  id: string;
  shiftId: string;
  workerId: string;
  status: AssignmentStatus;
  acceptedAt: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  cancellationReason: string | null;
};

export type Payout = {
  id: string;
  workerId: string;
  assignmentId: string;
  organizationId: string;
  status: PayoutStatus;
  grossAmountMinor: number;
  commissionRateBps: number;
  commissionAmountMinor: number;
  workerTransferAmountMinor: number;
  organizationTotalDueMinor: number;
  currency: string;
  dueAt: string;
  bankReference: string | null;
  reconciledAt: string | null;
};
