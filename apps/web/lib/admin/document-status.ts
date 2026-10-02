import {
  credentialRequirementsForRole,
  mapCredentialStatusToChecklistStatus,
  workerDocumentPackageLabel,
  type CredentialSummary,
  type DocumentChecklistItemStatus,
  type WorkerDocumentPackageLabel,
} from '@bridge-hive/domain';
import type { WorkerRole } from '@bridge-hive/domain';

export type AdminCredentialRow = {
  credential_type: string;
  status: string;
  storage_path?: string | null;
  storage_paths?: unknown;
  rejection_reason?: string | null;
  expires_at?: string | null;
  id?: string;
};

function hasFile(row: AdminCredentialRow): boolean {
  if (row.storage_path) return true;
  return Array.isArray(row.storage_paths) && row.storage_paths.length > 0;
}

export function toCredentialSummaries(
  credentials: AdminCredentialRow[],
): CredentialSummary[] {
  return credentials.map((c) => ({
    credentialType: c.credential_type,
    status: c.status as CredentialSummary['status'],
    hasFile: hasFile(c),
  }));
}

export function getWorkerPackageLabel(params: {
  verificationStatus: string;
  accountStatus?: string | null;
  role: WorkerRole | null | undefined;
  credentials: AdminCredentialRow[];
  payoutSatisfied?: boolean;
  payoutStatus?: string | null;
}): WorkerDocumentPackageLabel {
  return workerDocumentPackageLabel({
    verificationStatus: params.verificationStatus,
    accountStatus: params.accountStatus,
    role: params.role,
    credentials: toCredentialSummaries(params.credentials),
    payoutSatisfied: params.payoutSatisfied,
    payoutStatus: params.payoutStatus as
      | 'pending'
      | 'verified'
      | 'rejected'
      | 'failed'
      | 'suspended'
      | 'expired'
      | null
      | undefined,
  });
}

export type AdminChecklistItem = {
  credentialType: string;
  isRequired: boolean;
  status: DocumentChecklistItemStatus;
  credentialId: string | null;
  rejectionReason: string | null;
  expiresAt: string | null;
};

export function buildAdminWorkerChecklist(params: {
  role: WorkerRole | null | undefined;
  credentials: AdminCredentialRow[];
}): AdminChecklistItem[] {
  const byType = new Map<string, AdminCredentialRow>();
  for (const row of params.credentials) {
    const existing = byType.get(row.credential_type);
    if (!existing) {
      byType.set(row.credential_type, row);
      continue;
    }
    // Prefer non-rejected active statuses.
    const prefer =
      row.status === 'verified' ||
      row.status === 'under_review' ||
      (row.status === 'pending' && existing.status === 'rejected');
    if (prefer) byType.set(row.credential_type, row);
  }

  return credentialRequirementsForRole(params.role).map((req) => {
    const row = byType.get(req.credentialType) ?? null;
    return {
      credentialType: req.credentialType,
      isRequired: req.isRequired,
      status: mapCredentialStatusToChecklistStatus(
        row?.status as AdminCredentialRow['status'] as never,
        row ? hasFile(row) : false,
      ),
      credentialId: row?.id ?? null,
      rejectionReason: row?.rejection_reason ?? null,
      expiresAt: row?.expires_at ?? null,
    };
  });
}

export function isAwaitingDocuments(params: {
  onboardingStatus: string;
  verificationStatus: string;
  credentials: AdminCredentialRow[];
}): boolean {
  if (params.verificationStatus === 'verified') return false;
  if (params.onboardingStatus !== 'completed') return false;
  return params.credentials.length === 0;
}

export function isReadyForFinalVerification(params: {
  role: WorkerRole | null | undefined;
  verificationStatus: string;
  credentials: AdminCredentialRow[];
  payoutSatisfied: boolean;
}): boolean {
  if (params.verificationStatus === 'verified') return false;
  return (
    getWorkerPackageLabel({
      verificationStatus: params.verificationStatus,
      role: params.role,
      credentials: params.credentials,
      payoutSatisfied: params.payoutSatisfied,
    }) === 'Ready for final approval'
  );
}

export function payoutAccountStatusLabel(
  status: string | null | undefined,
): string {
  switch (status) {
    case 'pending':
      return 'Pending administrative approval';
    case 'verified':
      return 'Approved for platform use';
    case 'rejected':
      return 'Rejected';
    case 'suspended':
      return 'Suspended';
    case 'failed':
      return 'Failed';
    case 'expired':
      return 'Expired';
    default:
      return 'Not submitted';
  }
}
