import {
  credentialTypeLabel as domainCredentialTypeLabel,
  verificationApplicationStatusLabel,
} from '@bridge-hive/domain';

const PLATFORM_ROLE_LABELS: Record<string, string> = {
  platform_support: 'Support',
  platform_verifier: 'Verifier',
  platform_finance: 'Finance',
  platform_super_admin: 'Super admin',
};

const ACCOUNT_STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  suspended: 'Suspended',
  deleted: 'Deleted',
};

const VERIFICATION_STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  under_review: 'Under review',
  verified: 'Verified',
  rejected: 'Rejected',
  suspended: 'Suspended',
  expired: 'Expired',
};

const ONBOARDING_STATUS_LABELS: Record<string, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  completed: 'Completed',
};

const CREDENTIAL_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  under_review: 'Under review',
  verified: 'Verified',
  rejected: 'Rejected',
  expired: 'Expired',
  suspended: 'Suspended',
};

const AUDIT_ACTION_LABELS: Record<string, string> = {
  submit_credential: 'Submitted credential',
  verify_credential_approve: 'Approved credential',
  verify_credential_reject: 'Rejected credential',
  verify_payout_account_approve: 'Approved payout account',
  verify_payout_account_reject: 'Rejected payout account',
  set_worker_verification: 'Updated worker verification',
  submit_payout_account: 'Submitted payout account',
  suspend_account: 'Suspended account',
  reactivate_account: 'Reactivated account',
  view_credential_document: 'Viewed credential document',
  claim_shift: 'Claimed shift',
  publish_shift: 'Published shift',
  review_timesheet: 'Reviewed timesheet',
  submit_credential_for_review: 'Marked credential under review',
};

export function platformRoleLabel(role: string): string {
  return PLATFORM_ROLE_LABELS[role] ?? role;
}

export function accountStatusLabel(status: string): string {
  return ACCOUNT_STATUS_LABELS[status] ?? status;
}

export function verificationStatusLabel(status: string): string {
  return VERIFICATION_STATUS_LABELS[status] ?? status;
}

export function onboardingStatusLabel(status: string): string {
  return ONBOARDING_STATUS_LABELS[status] ?? status;
}

export function credentialStatusLabel(status: string): string {
  return CREDENTIAL_STATUS_LABELS[status] ?? status;
}

export function applicationStatusLabel(status: string): string {
  return verificationApplicationStatusLabel(status);
}

export function auditActionLabel(action: string): string {
  return AUDIT_ACTION_LABELS[action] ?? action.replaceAll('_', ' ');
}

export function credentialTypeLabel(type: string): string {
  return domainCredentialTypeLabel(type, 'en');
}

export function safeAuditMetadata(
  value: unknown,
): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  const blocked = new Set([
    'storage_path',
    'storage_paths',
    'signed_url',
    'token',
    'access_token',
    'refresh_token',
    'iban',
    'masked_iban',
    'account_holder_name',
    'password',
    'secret',
    'tax_id',
    'social_insurance_number',
    'filename',
    'proof_storage_path',
  ]);
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(input)) {
    if (blocked.has(key.toLowerCase())) continue;
    if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
      out[key] = val;
    } else if (val === null) {
      out[key] = null;
    }
  }
  return Object.keys(out).length > 0 ? out : null;
}

/** Queue card serializer — never include bank or storage fields. */
export function serializeApplicationQueueCard(row: {
  worker_id: string;
  application_ref: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  worker_role: string | null;
  application_status: string;
  required_total: number;
  awaiting_review_count: number;
  approved_count: number;
  rejected_count: number;
  submitted_file_count: number;
  payout_status: string | null;
  submitted_at: string | null;
  last_activity_at: string | null;
}) {
  return {
    workerId: row.worker_id,
    applicationRef: row.application_ref,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    workerRole: row.worker_role,
    applicationStatus: row.application_status,
    applicationStatusLabel: applicationStatusLabel(row.application_status),
    requiredTotal: row.required_total,
    awaitingReviewCount: row.awaiting_review_count,
    approvedCount: row.approved_count,
    rejectedCount: row.rejected_count,
    submittedFileCount: row.submitted_file_count,
    payoutStatus: row.payout_status,
    submittedAt: row.submitted_at,
    lastActivityAt: row.last_activity_at,
  };
}
