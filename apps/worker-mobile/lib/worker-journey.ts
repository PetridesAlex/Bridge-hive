import {
  accountSetupNextStep,
  canSubmitWorkerVerificationPackage,
  documentsSummaryLabel,
  finalApprovalSummaryLabel,
  payoutAccountActionLabel,
  WORKER_ACCOUNT_SETUP_PAYOUT_ROUTE,
  type CredentialSummary,
  type DocumentsSummaryLabel,
  type FinalApprovalSummaryLabel,
  type PayoutAccountStatusInput,
  type WorkerRole,
} from '@bridge-hive/domain';

/**
 * Account-level journey status — distinct from per-document checklist status.
 * Marketplace access is only available when status === 'fully_activated'
 * (workerProfile.verification_status === 'verified').
 */
export type WorkerJourneyAccountStatus =
  | 'setup_in_progress'
  | 'ready_to_submit'
  | 'submitted'
  | 'under_review'
  | 'action_required'
  | 'fully_activated'
  | 'restricted';

export type WorkerJourneySnapshot = {
  accountStatus: WorkerJourneyAccountStatus;
  accountLabel: string;
  accountSummary: string;
  documentsLabel: DocumentsSummaryLabel;
  finalLabel: FinalApprovalSummaryLabel;
  nextStep: string;
  canSubmitPackage: boolean;
  marketplaceUnlocked: boolean;
  primaryAction: {
    label: string;
    href: '/documents' | '/payout-setup' | '/auth/worker/pending' | '/(tabs)/shifts' | '/support';
  } | null;
};

const ACCOUNT_LABELS: Record<WorkerJourneyAccountStatus, string> = {
  setup_in_progress: 'Account setup in progress',
  ready_to_submit: 'Ready to submit for review',
  submitted: 'Submitted to BridgeHive',
  under_review: 'Under review',
  action_required: 'Action required',
  fully_activated: 'Fully activated',
  restricted: 'Restricted',
};

const ACCOUNT_SUMMARIES: Record<WorkerJourneyAccountStatus, string> = {
  setup_in_progress:
    'Finish required documents and payout details. Individual document “Accepted” status does not unlock shifts yet.',
  ready_to_submit:
    'Your required documents are uploaded. Submit the full package from Account Setup so BridgeHive can review your application.',
  submitted:
    'Your application was submitted. You can sign out and return later — we will notify you when review progresses.',
  under_review:
    'BridgeHive is reviewing your application. Marketplace shifts stay locked until an administrator activates your account.',
  action_required:
    'Something needs correction before review can continue. Fix the flagged item, then return to Account Setup.',
  fully_activated:
    'Your account is activated. You can browse and claim open shifts that match your role.',
  restricted:
    'Marketplace access is restricted. Contact support if you need help restoring your account.',
};

export function resolveWorkerJourneyAccountStatus(params: {
  verificationStatus: string;
  documentsLabel: DocumentsSummaryLabel;
  payoutStatus: PayoutAccountStatusInput;
  canSubmitPackage: boolean;
}): WorkerJourneyAccountStatus {
  const { verificationStatus, documentsLabel, payoutStatus, canSubmitPackage } = params;

  if (verificationStatus === 'verified') return 'fully_activated';
  if (
    verificationStatus === 'suspended' ||
    verificationStatus === 'rejected' ||
    verificationStatus === 'expired'
  ) {
    return 'restricted';
  }
  if (verificationStatus === 'under_review') return 'under_review';
  if (verificationStatus === 'submitted') return 'submitted';

  if (
    documentsLabel === 'Rejected' ||
    payoutStatus === 'rejected' ||
    payoutStatus === 'failed'
  ) {
    return 'action_required';
  }

  if (canSubmitPackage) return 'ready_to_submit';

  return 'setup_in_progress';
}

export function buildWorkerJourneySnapshot(params: {
  role: WorkerRole | null | undefined;
  verificationStatus: string;
  credentials: CredentialSummary[];
  payoutStatus: PayoutAccountStatusInput;
}): WorkerJourneySnapshot {
  const documentsLabel = documentsSummaryLabel({
    role: params.role,
    credentials: params.credentials,
  });
  const canSubmitPackage = canSubmitWorkerVerificationPackage({
    role: params.role,
    credentials: params.credentials,
    verificationStatus: params.verificationStatus,
  });
  const finalLabel = finalApprovalSummaryLabel({
    verificationStatus: params.verificationStatus,
    documentsLabel,
    payoutStatus: params.payoutStatus,
  });
  const accountStatus = resolveWorkerJourneyAccountStatus({
    verificationStatus: params.verificationStatus,
    documentsLabel,
    payoutStatus: params.payoutStatus,
    canSubmitPackage,
  });
  const marketplaceUnlocked = accountStatus === 'fully_activated';
  const nextStep = accountSetupNextStep({
    documentsLabel,
    payoutStatus: params.payoutStatus,
    finalLabel,
    canSubmitPackage,
    verificationStatus: params.verificationStatus,
  });

  let primaryAction: WorkerJourneySnapshot['primaryAction'] = null;
  if (marketplaceUnlocked) {
    primaryAction = { label: 'Browse open shifts', href: '/(tabs)/shifts' };
  } else if (accountStatus === 'restricted') {
    primaryAction = { label: 'Contact support', href: '/support' };
  } else if (accountStatus === 'action_required') {
    if (params.payoutStatus === 'rejected' || params.payoutStatus === 'failed') {
      primaryAction = {
        label: payoutAccountActionLabel(params.payoutStatus),
        href: WORKER_ACCOUNT_SETUP_PAYOUT_ROUTE as '/payout-setup',
      };
    } else {
      primaryAction = { label: 'Fix credentials', href: '/documents' };
    }
  } else if (accountStatus === 'ready_to_submit') {
    primaryAction = {
      label: 'Continue Account Setup',
      href: '/auth/worker/pending',
    };
  } else if (
    documentsLabel === 'Missing' ||
    documentsLabel === 'Partially uploaded'
  ) {
    primaryAction = { label: 'Upload documents', href: '/documents' };
  } else if (
    documentsLabel === 'Complete' &&
    (params.payoutStatus == null ||
      params.payoutStatus === 'rejected' ||
      params.payoutStatus === 'failed')
  ) {
    primaryAction = {
      label: payoutAccountActionLabel(params.payoutStatus),
      href: WORKER_ACCOUNT_SETUP_PAYOUT_ROUTE as '/payout-setup',
    };
  } else if (
    accountStatus === 'submitted' ||
    accountStatus === 'under_review'
  ) {
    primaryAction = {
      label: 'View Account Setup',
      href: '/auth/worker/pending',
    };
  } else {
    primaryAction = {
      label: 'Continue Account Setup',
      href: '/auth/worker/pending',
    };
  }

  return {
    accountStatus,
    accountLabel: ACCOUNT_LABELS[accountStatus],
    accountSummary: ACCOUNT_SUMMARIES[accountStatus],
    documentsLabel,
    finalLabel,
    nextStep,
    canSubmitPackage,
    marketplaceUnlocked,
    primaryAction,
  };
}
