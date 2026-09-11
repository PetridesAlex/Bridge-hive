import type { PlatformAdminRole } from '@bridge-hive/domain';

export type PlatformCapabilities = {
  role: PlatformAdminRole;
  canViewWorkers: boolean;
  canViewCredentialMetadata: boolean;
  canViewCredentialDocuments: boolean;
  canReviewCredentials: boolean;
  canVerifyWorkers: boolean;
  canApprovePayoutAccounts: boolean;
  canViewPayoutProof: boolean;
  canSuspendAccounts: boolean;
  canViewAudit: boolean;
  canViewFinancePlaceholder: boolean;
};

/**
 * Dual-role rule:
 * A user may hold both a platform_admin_roles row and a worker_profiles row.
 * When acting in /admin, authorization comes only from platform_admin_roles.
 * Server RPCs additionally block self-verification of own worker credentials.
 * Org dashboard and admin dashboard remain separate navigation contexts.
 */
export function capabilitiesForPlatformRole(
  role: PlatformAdminRole,
): PlatformCapabilities {
  const isSupport = role === 'platform_support';
  const isVerifier = role === 'platform_verifier';
  const isFinance = role === 'platform_finance';
  const isSuper = role === 'platform_super_admin';

  return {
    role,
    canViewWorkers: isSupport || isVerifier || isSuper,
    canViewCredentialMetadata: isSupport || isVerifier || isSuper,
    canViewCredentialDocuments: isVerifier || isSuper,
    canReviewCredentials: isVerifier || isSuper,
    canVerifyWorkers: isVerifier || isSuper,
    canApprovePayoutAccounts: isSuper,
    canViewPayoutProof: isSuper,
    canSuspendAccounts: isSuper,
    canViewAudit: isSupport || isVerifier || isFinance || isSuper,
    canViewFinancePlaceholder: isFinance || isSuper,
  };
}

export function rpcErrorMessage(error: { message?: string } | null): string {
  const raw = error?.message ?? 'Request failed';
  const code = raw.split(':')[0]?.trim() ?? raw;
  const labels: Record<string, string> = {
    NOT_AUTHENTICATED: 'You must be signed in.',
    NOT_AUTHORIZED: 'You do not have permission for this action.',
    REASON_REQUIRED: 'A reason is required.',
    CREDENTIAL_FILE_REQUIRED: 'Upload a document before submitting for review.',
    CREDENTIAL_FILE_LOCKED: 'Submitted documents cannot be replaced. Resubmit after rejection.',
    PAYOUT_ACCOUNT_REQUIRED:
      'A payout account must be approved for platform use before final verification.',
    PAYOUT_ACCOUNT_NOT_FOUND: 'Payout account not found.',
    PAYOUT_PROOF_REQUIRED: 'Upload proof of bank account before submitting.',
    PAYOUT_PROOF_NOT_FOUND: 'Payout proof document not found.',
    PAYOUT_PROOF_INVALID_TYPE: 'Proof must be PDF, JPEG, or PNG.',
    PAYOUT_PROOF_PATH_INVALID: 'Proof upload path is invalid.',
    PAYOUT_PROOF_LOCKED: 'Submitted payout proof cannot be replaced.',
    INVALID_IBAN: 'That IBAN is not valid.',
    ACCOUNT_HOLDER_NAME_REQUIRED: 'Account holder name is required.',
    PAYOUT_ACCOUNT_LOCKED: 'This payout account cannot be changed right now.',
    PAYOUT_STATUS_LOCKED: 'Payout status cannot be changed directly.',
    REASON_TOO_LONG: 'Reason must be 2,000 characters or fewer.',
    REJECTION_REASON_REQUIRED: 'A rejection reason is required.',
    ALREADY_SUSPENDED: 'This account is already suspended.',
    ALREADY_ACTIVE: 'This account is already active.',
    ACCOUNT_DELETED: 'This account has been deleted and cannot be changed.',
    ACCOUNT_NOT_ACTIVE: 'The worker account is not active.',
    CANNOT_SELF_VERIFY: 'You cannot verify your own profile or credentials.',
    CANNOT_SUSPEND_SELF: 'You cannot suspend your own account.',
    CANNOT_REACTIVATE_SELF: 'You cannot reactivate your own account.',
    CREDENTIAL_NOT_FOUND: 'Credential not found.',
    PROFILE_NOT_FOUND: 'Profile not found.',
    WORKER_NOT_FOUND: 'Worker profile not found.',
    INVALID_TRANSITION: 'That status change is not allowed.',
    INVALID_DECISION: 'Invalid review decision.',
    WORKER_ROLE_REQUIRED: 'Worker role must be set before verification.',
    MISSING_REQUIRED_CREDENTIAL: 'Required credentials are missing or not verified.',
    APPLICATION_CHANGED:
      'This application changed while you were reviewing it. Refresh and try again.',
    CONFIRMATION_REQUIRED:
      'Confirm that you reviewed the selected documents before approving.',
    NO_CREDENTIALS_SELECTED: 'Select at least one document to approve.',
    CREDENTIAL_WORKER_MISMATCH:
      'One or more selected documents do not belong to this worker.',
    INELIGIBLE_CREDENTIAL: 'One or more selected documents are not eligible for approval.',
    FILE_REQUIRED: 'Every selected document must include an uploaded file.',
    CREDENTIAL_EXPIRED: 'One or more selected documents are expired.',
    WORKER_REQUIRED: 'Worker application is required.',
    INVALID_SORT: 'Invalid sort option.',
  };

  if (raw.startsWith('MISSING_REQUIRED_CREDENTIAL:')) {
    const type = raw.split(':')[1] ?? 'credential';
    return `Missing required verified credential: ${type.replaceAll('_', ' ')}.`;
  }

  if (raw.startsWith('INELIGIBLE_CREDENTIAL:')) {
    return 'One or more selected documents are not eligible for approval.';
  }
  if (raw.startsWith('FILE_REQUIRED:')) {
    return 'Every selected document must include an uploaded file.';
  }
  if (raw.startsWith('CREDENTIAL_EXPIRED:')) {
    return 'One or more selected documents are expired.';
  }
  if (raw.startsWith('CREDENTIAL_NOT_FOUND:')) {
    return 'Credential not found.';
  }

  return labels[code] ?? raw;
}
