import type { CredentialStatus, WorkerRole } from './types';

/** Authoritative credential types for Bridge Hive role checklists. */
export const CREDENTIAL_TYPES = [
  'identity_document_front',
  'identity_document_back',
  'nursing_licence',
  'nursing_degree',
  'employment_certificate',
  'tax_identification_proof',
  'social_insurance_proof',
  'cv',
] as const;

export type CredentialType = (typeof CREDENTIAL_TYPES)[number];

export type CredentialRequirement = {
  credentialType: CredentialType;
  isRequired: boolean;
  sortOrder: number;
};

export type LocaleCode = 'en' | 'el';

const CREDENTIAL_TYPE_LABELS: Record<
  CredentialType,
  { en: string; el: string }
> = {
  identity_document_front: {
    en: 'National identity card — front',
    el: 'Δελτίο ταυτότητας — εμπρός',
  },
  identity_document_back: {
    en: 'National identity card — back',
    el: 'Δελτίο ταυτότητας — πίσω',
  },
  nursing_licence: {
    en: 'Nursing licence',
    el: 'Άδεια νοσηλευτή',
  },
  nursing_degree: {
    en: 'Nursing degree or diploma',
    el: 'Πτυχίο νοσηλευτικής',
  },
  employment_certificate: {
    en: 'Employment certificate showing job title',
    el: 'Βεβαίωση από εργασία – τίτλος θέσης',
  },
  tax_identification_proof: {
    en: 'Tax identification proof',
    el: 'Απόδειξη φορολογικού αριθμού',
  },
  social_insurance_proof: {
    en: 'Social insurance proof',
    el: 'Απόδειξη κοινωνικής ασφάλισης',
  },
  cv: {
    en: 'CV',
    el: 'Βιογραφικό',
  },
};

const RN_REQUIREMENTS: CredentialRequirement[] = [
  { credentialType: 'identity_document_front', isRequired: true, sortOrder: 1 },
  { credentialType: 'identity_document_back', isRequired: true, sortOrder: 2 },
  { credentialType: 'nursing_licence', isRequired: true, sortOrder: 3 },
  { credentialType: 'nursing_degree', isRequired: true, sortOrder: 4 },
  { credentialType: 'tax_identification_proof', isRequired: true, sortOrder: 5 },
  { credentialType: 'social_insurance_proof', isRequired: true, sortOrder: 6 },
  { credentialType: 'cv', isRequired: false, sortOrder: 7 },
];

const WARD_REQUIREMENTS: CredentialRequirement[] = [
  { credentialType: 'identity_document_front', isRequired: true, sortOrder: 1 },
  { credentialType: 'identity_document_back', isRequired: true, sortOrder: 2 },
  { credentialType: 'employment_certificate', isRequired: true, sortOrder: 3 },
  { credentialType: 'tax_identification_proof', isRequired: true, sortOrder: 4 },
  { credentialType: 'social_insurance_proof', isRequired: true, sortOrder: 5 },
];

export const MAX_CREDENTIAL_FILE_BYTES = 10 * 1024 * 1024;

export const ALLOWED_CREDENTIAL_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
] as const;

export type AllowedCredentialMimeType =
  (typeof ALLOWED_CREDENTIAL_MIME_TYPES)[number];

/** Backend-derived role checklist. Clients must not invent required types. */
export function credentialRequirementsForRole(
  role: WorkerRole | null | undefined,
): CredentialRequirement[] {
  if (role === 'registered_nurse') return RN_REQUIREMENTS;
  if (role === 'ward_assistant') return WARD_REQUIREMENTS;
  return [];
}

export function requiredCredentialTypesForRole(
  role: WorkerRole | null | undefined,
): CredentialType[] {
  return credentialRequirementsForRole(role)
    .filter((r) => r.isRequired)
    .map((r) => r.credentialType);
}

export function credentialTypeLabel(
  type: string,
  locale: LocaleCode = 'en',
): string {
  const known = CREDENTIAL_TYPE_LABELS[type as CredentialType];
  if (known) return known[locale];
  return type.replaceAll('_', ' ');
}

export function validateCredentialUpload(params: {
  mimeType?: string | null;
  sizeBytes?: number | null;
}): { ok: true } | { ok: false; error: string } {
  const mime = params.mimeType?.toLowerCase() ?? '';
  if (
    !ALLOWED_CREDENTIAL_MIME_TYPES.includes(
      mime as AllowedCredentialMimeType,
    )
  ) {
    return {
      ok: false,
      error: 'Unsupported file type. Use PDF, JPEG, or PNG.',
    };
  }
  if (
    params.sizeBytes == null ||
    params.sizeBytes <= 0 ||
    params.sizeBytes > MAX_CREDENTIAL_FILE_BYTES
  ) {
    return {
      ok: false,
      error: 'File must be between 1 byte and 10 MB.',
    };
  }
  return { ok: true };
}

export type DocumentChecklistItemStatus =
  | 'not_uploaded'
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'verified'
  | 'rejected'
  | 'expired'
  | 'suspended';

export function mapCredentialStatusToChecklistStatus(
  status: CredentialStatus | null | undefined,
  hasFile: boolean,
): DocumentChecklistItemStatus {
  if (!status) return 'not_uploaded';
  if (status === 'pending') return hasFile ? 'draft' : 'not_uploaded';
  if (status === 'under_review') return 'under_review';
  if (status === 'verified') return 'verified';
  if (status === 'rejected') return 'rejected';
  if (status === 'expired') return 'expired';
  if (status === 'suspended') return 'suspended';
  return 'not_uploaded';
}

export type WorkerDocumentPackageLabel =
  | 'Documents not submitted'
  | 'Partially uploaded'
  | 'Ready to submit'
  | 'Pending credential review'
  | 'Under review'
  | 'Documents rejected'
  | 'Missing required documents'
  | 'Documents complete — payout account submission required'
  | 'Documents complete — payout account approval pending'
  | 'Payout account rejected — worker action required'
  | 'Ready for final approval'
  | 'Approved for marketplace access'
  | 'Suspended';

/** Server-authoritative verification application status codes (admin queue). */
export const VERIFICATION_APPLICATION_STATUS_CODES = [
  'account_created',
  'awaiting_documents',
  'partially_uploaded',
  'ready_to_submit',
  'submitted',
  'ready_for_review',
  'under_review',
  'corrections_required',
  'documents_approved_payout_required',
  'payout_approval_pending',
  'ready_for_final_approval',
  'approved_marketplace',
  'suspended',
] as const;

export type VerificationApplicationStatusCode =
  (typeof VERIFICATION_APPLICATION_STATUS_CODES)[number];

export const VERIFICATION_APPLICATION_STATUS_LABELS: Record<
  VerificationApplicationStatusCode,
  string
> = {
  account_created: 'Account created',
  awaiting_documents: 'Awaiting documents',
  partially_uploaded: 'Partially uploaded',
  ready_to_submit: 'Ready to submit',
  submitted: 'Submitted',
  ready_for_review: 'Ready for review',
  under_review: 'Under review',
  corrections_required: 'Corrections required',
  documents_approved_payout_required: 'Documents approved — payout required',
  payout_approval_pending: 'Payout approval pending',
  ready_for_final_approval: 'Ready for final approval',
  approved_marketplace: 'Approved for marketplace access',
  suspended: 'Suspended',
};

export function verificationApplicationStatusLabel(
  code: string | null | undefined,
): string {
  if (
    code &&
    (VERIFICATION_APPLICATION_STATUS_CODES as readonly string[]).includes(code)
  ) {
    return VERIFICATION_APPLICATION_STATUS_LABELS[
      code as VerificationApplicationStatusCode
    ];
  }
  return 'Unknown';
}

/**
 * Client-side mirror of SQL worker_verification_application_status for tests.
 * Admin UI must display the server-derived code; do not invent statuses in the browser.
 */
export function workerVerificationApplicationStatus(params: {
  verificationStatus: string;
  accountStatus?: string | null;
  onboardingStatus?: string | null;
  role: WorkerRole | null | undefined;
  credentials: CredentialSummary[];
  payoutStatus?: PayoutAccountStatusInput;
}): VerificationApplicationStatusCode {
  if (
    params.accountStatus === 'suspended' ||
    params.verificationStatus === 'suspended'
  ) {
    return 'suspended';
  }
  if (params.verificationStatus === 'verified') {
    return 'approved_marketplace';
  }
  if (!params.role) {
    if (
      params.onboardingStatus === 'not_started' ||
      params.onboardingStatus == null
    ) {
      return 'account_created';
    }
    return 'awaiting_documents';
  }

  const required = requiredCredentialTypesForRole(params.role);
  if (required.length === 0) return 'awaiting_documents';

  const byType = new Map<string, CredentialSummary>();
  for (const cred of params.credentials) {
    const existing = byType.get(cred.credentialType);
    if (!existing || statusRank(cred.status) >= statusRank(existing.status)) {
      byType.set(cred.credentialType, cred);
    }
  }

  const rows = required.map((type) => byType.get(type));
  const anyFile = rows.some((r) => r != null && r.hasFile);
  const allFiles = rows.every((r) => r != null && r.hasFile);
  const anyRejected = rows.some((r) => r?.status === 'rejected');
  const anyUnderReview = rows.some((r) => r?.status === 'under_review');
  const anyPending = rows.some((r) => r?.status === 'pending' && r.hasFile);
  const allVerified = rows.every(
    (r) => r != null && r.hasFile && r.status === 'verified',
  );

  if (anyRejected) return 'corrections_required';
  if (!anyFile) {
    if (
      params.onboardingStatus === 'not_started' ||
      params.onboardingStatus === 'in_progress'
    ) {
      return 'account_created';
    }
    return 'awaiting_documents';
  }
  if (!allFiles) return 'partially_uploaded';

  if (allVerified) {
    if (params.payoutStatus === 'verified') return 'ready_for_final_approval';
    if (params.payoutStatus === 'pending') return 'payout_approval_pending';
    if (params.payoutStatus === 'rejected' || params.payoutStatus === 'failed') {
      return 'corrections_required';
    }
    return 'documents_approved_payout_required';
  }

  if (anyUnderReview) return 'under_review';
  if (anyPending) {
    if (params.verificationStatus === 'under_review') return 'under_review';
    if (params.verificationStatus === 'submitted') return 'ready_for_review';
    if (params.onboardingStatus === 'completed') return 'submitted';
    return 'ready_to_submit';
  }
  return 'partially_uploaded';
}

/** Credentials eligible for package approve (pending/under_review + file). */
export function eligiblePackageApproveCredentialIds(
  credentials: Array<{ id: string; status: string; hasFile: boolean }>,
): string[] {
  return credentials
    .filter(
      (c) =>
        c.hasFile &&
        (c.status === 'pending' || c.status === 'under_review'),
    )
    .map((c) => c.id);
}

export type CredentialSummary = {
  credentialType: string;
  status: CredentialStatus;
  hasFile: boolean;
};

export type PayoutAccountStatusInput =
  | 'pending'
  | 'verified'
  | 'rejected'
  | 'failed'
  | 'suspended'
  | 'expired'
  | null
  | undefined;

export type DocumentsSummaryLabel =
  | 'Missing'
  | 'Partially uploaded'
  | 'Submitted'
  | 'Under review'
  | 'Rejected'
  | 'Complete';

export type PayoutSummaryLabel =
  | 'Not submitted'
  | 'Pending administrative approval'
  | 'Approved for platform use'
  | 'Rejected — correction required'
  | 'Suspended';

export type FinalApprovalSummaryLabel =
  | 'Not ready'
  | 'Waiting for document review'
  | 'Waiting for payout approval'
  | 'Ready for final administrative approval'
  | 'Approved for marketplace access'
  | 'Suspended';

export type DocumentProgressCounts = {
  requiredTotal: number;
  missing: number;
  submitted: number;
  underReview: number;
  rejected: number;
  approved: number;
};

/**
 * Derive admin/worker package label from role requirements + credential rows.
 * `payoutStatus` is the payout_accounts.status (verified-only satisfies readiness).
 * `payoutSatisfied` remains as a convenience alias for status === 'verified'.
 */
export function workerDocumentPackageLabel(params: {
  verificationStatus: string;
  accountStatus?: string | null;
  role: WorkerRole | null | undefined;
  credentials: CredentialSummary[];
  payoutSatisfied?: boolean;
  payoutStatus?: PayoutAccountStatusInput;
}): WorkerDocumentPackageLabel {
  if (params.accountStatus === 'suspended' || params.verificationStatus === 'suspended') {
    return 'Suspended';
  }
  if (params.verificationStatus === 'verified') {
    return 'Approved for marketplace access';
  }
  if (params.verificationStatus === 'rejected') {
    return 'Documents rejected';
  }

  const required = requiredCredentialTypesForRole(params.role);
  const byType = new Map<string, CredentialSummary>();
  for (const cred of params.credentials) {
    const existing = byType.get(cred.credentialType);
    if (!existing || statusRank(cred.status) >= statusRank(existing.status)) {
      byType.set(cred.credentialType, cred);
    }
  }

  if (required.length === 0) {
    return 'Documents not submitted';
  }

  const rows = required.map((type) => byType.get(type));
  const anyUploaded = rows.some((r) => r != null);
  if (!anyUploaded) return 'Documents not submitted';

  const rejected = rows.some((r) => r?.status === 'rejected');
  const missing = rows.some((r) => r == null || !r.hasFile);
  if (rejected) return 'Documents rejected';
  if (missing) {
    const someFiles = rows.some((r) => r?.hasFile);
    return someFiles ? 'Partially uploaded' : 'Missing required documents';
  }

  const allVerified = rows.every((r) => r?.status === 'verified');
  if (allVerified) {
    const payoutStatus =
      params.payoutStatus ??
      (params.payoutSatisfied ? 'verified' : null);
    if (payoutStatus === 'verified' || params.payoutSatisfied === true) {
      return 'Ready for final approval';
    }
    if (payoutStatus === 'pending') {
      return 'Documents complete — payout account approval pending';
    }
    if (payoutStatus === 'rejected') {
      return 'Payout account rejected — worker action required';
    }
    return 'Documents complete — payout account submission required';
  }

  const anyUnderReview = rows.some((r) => r?.status === 'under_review');
  if (anyUnderReview) return 'Under review';

  const allPendingWithFiles = rows.every(
    (r) => r?.status === 'pending' && r.hasFile,
  );
  if (allPendingWithFiles) return 'Ready to submit';

  const anyPending = rows.some((r) => r?.status === 'pending');
  if (anyPending) return 'Pending credential review';

  return 'Partially uploaded';
}

/** Documents-only summary for the worker pending screen. */
export function documentsSummaryLabel(params: {
  role: WorkerRole | null | undefined;
  credentials: CredentialSummary[];
}): DocumentsSummaryLabel {
  const required = requiredCredentialTypesForRole(params.role);
  if (required.length === 0) return 'Missing';
  const byType = new Map<string, CredentialSummary>();
  for (const cred of params.credentials) {
    const existing = byType.get(cred.credentialType);
    if (!existing || statusRank(cred.status) >= statusRank(existing.status)) {
      byType.set(cred.credentialType, cred);
    }
  }
  const rows = required.map((type) => byType.get(type));
  if (rows.every((r) => r == null || !r.hasFile)) return 'Missing';
  if (rows.some((r) => r?.status === 'rejected')) return 'Rejected';
  if (rows.every((r) => r?.status === 'verified')) return 'Complete';
  if (rows.some((r) => r?.status === 'under_review')) return 'Under review';
  if (rows.every((r) => r != null && r.hasFile)) return 'Submitted';
  return 'Partially uploaded';
}

export function payoutSummaryLabel(
  status: PayoutAccountStatusInput,
): PayoutSummaryLabel {
  switch (status) {
    case 'pending':
      return 'Pending administrative approval';
    case 'verified':
      return 'Approved for platform use';
    case 'rejected':
    case 'failed':
      return 'Rejected — correction required';
    case 'suspended':
      return 'Suspended';
    default:
      return 'Not submitted';
  }
}

export function documentProgressCounts(params: {
  role: WorkerRole | null | undefined;
  credentials: CredentialSummary[];
}): DocumentProgressCounts {
  const required = requiredCredentialTypesForRole(params.role);
  const byType = new Map<string, CredentialSummary>();
  for (const cred of params.credentials) {
    const existing = byType.get(cred.credentialType);
    if (!existing || statusRank(cred.status) >= statusRank(existing.status)) {
      byType.set(cred.credentialType, cred);
    }
  }
  const rows = required.map((type) => byType.get(type));
  let missing = 0;
  let submitted = 0;
  let underReview = 0;
  let rejected = 0;
  let approved = 0;
  for (const row of rows) {
    if (row == null || !row.hasFile) {
      missing += 1;
      continue;
    }
    if (row.status === 'verified') approved += 1;
    else if (row.status === 'under_review') underReview += 1;
    else if (row.status === 'rejected') rejected += 1;
    else submitted += 1;
  }
  return {
    requiredTotal: required.length,
    missing,
    submitted,
    underReview,
    rejected,
    approved,
  };
}

export function finalApprovalSummaryLabel(params: {
  verificationStatus: string;
  accountStatus?: string | null;
  documentsLabel: DocumentsSummaryLabel;
  payoutStatus: PayoutAccountStatusInput;
}): FinalApprovalSummaryLabel {
  if (
    params.accountStatus === 'suspended' ||
    params.verificationStatus === 'suspended'
  ) {
    return 'Suspended';
  }
  if (params.verificationStatus === 'verified') {
    return 'Approved for marketplace access';
  }
  const docsComplete = params.documentsLabel === 'Complete';
  const payoutVerified = params.payoutStatus === 'verified';
  if (docsComplete && payoutVerified) {
    return 'Ready for final administrative approval';
  }
  if (!docsComplete) {
    return 'Waiting for document review';
  }
  if (params.payoutStatus == null || params.payoutStatus === 'rejected' || params.payoutStatus === 'failed') {
    return 'Waiting for payout approval';
  }
  if (params.payoutStatus === 'pending') {
    return 'Waiting for payout approval';
  }
  return 'Not ready';
}

/** Plain-language next action for the Account Setup dashboard. */
export function accountSetupNextStep(params: {
  documentsLabel: DocumentsSummaryLabel;
  payoutStatus: PayoutAccountStatusInput;
  finalLabel: FinalApprovalSummaryLabel;
}): string {
  if (params.finalLabel === 'Approved for marketplace access') {
    return 'You are approved for marketplace access.';
  }
  if (params.finalLabel === 'Suspended') {
    return 'Your account is suspended. Contact support.';
  }
  if (params.documentsLabel === 'Rejected' || params.payoutStatus === 'rejected' || params.payoutStatus === 'failed') {
    return 'Correct and resubmit the rejected item.';
  }
  if (params.documentsLabel === 'Missing' || params.documentsLabel === 'Partially uploaded') {
    return 'Upload your required documents.';
  }
  if (
    (params.documentsLabel === 'Under review' || params.documentsLabel === 'Submitted') &&
    (params.payoutStatus == null)
  ) {
    return 'Set up your payout account while your documents are being reviewed.';
  }
  if (params.finalLabel === 'Ready for final administrative approval') {
    return 'Waiting for final administrator approval.';
  }
  if (
    params.documentsLabel === 'Under review' ||
    params.documentsLabel === 'Submitted' ||
    params.payoutStatus === 'pending'
  ) {
    return 'No action required. Bridge Hive is reviewing your submissions.';
  }
  if (params.documentsLabel === 'Complete' && params.payoutStatus == null) {
    return 'Set up your payout account.';
  }
  return 'Complete the remaining Account Setup steps.';
}

export function payoutAccountActionLabel(
  status: PayoutAccountStatusInput,
): string {
  switch (status) {
    case 'pending':
      return 'View payout status';
    case 'verified':
      return 'View payout status';
    case 'rejected':
    case 'failed':
      return 'Correct payout details';
    case 'suspended':
      return 'View payout status';
    default:
      return 'Set up payout account';
  }
}

function statusRank(status: CredentialStatus): number {
  switch (status) {
    case 'verified':
      return 5;
    case 'under_review':
      return 4;
    case 'pending':
      return 3;
    case 'rejected':
      return 2;
    case 'expired':
    case 'suspended':
      return 1;
    default:
      return 0;
  }
}

export function canWorkerEditCredentialFile(
  status: CredentialStatus | null | undefined,
): boolean {
  return status == null || status === 'pending' || status === 'rejected';
}

export const PAYOUT_PROOF_MAX_BYTES = 10 * 1024 * 1024;

export const ALLOWED_PAYOUT_PROOF_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
] as const;

export type AllowedPayoutProofMimeType =
  (typeof ALLOWED_PAYOUT_PROOF_MIME_TYPES)[number];

export function validatePayoutProofUpload(params: {
  mimeType?: string | null;
  sizeBytes?: number | null;
}): { ok: true } | { ok: false; error: string } {
  const mime = params.mimeType?.toLowerCase() ?? '';
  if (
    !ALLOWED_PAYOUT_PROOF_MIME_TYPES.includes(
      mime as AllowedPayoutProofMimeType,
    )
  ) {
    return {
      ok: false,
      error: 'Unsupported file type. Use PDF, JPEG, or PNG.',
    };
  }
  if (
    params.sizeBytes == null ||
    params.sizeBytes <= 0 ||
    params.sizeBytes > PAYOUT_PROOF_MAX_BYTES
  ) {
    return {
      ok: false,
      error: 'File must be between 1 byte and 10 MB.',
    };
  }
  return { ok: true };
}

/** Client-side IBAN format check; server still validates checksum. */
export function normalizeIbanInput(iban: string): string {
  return iban.replace(/\s+/g, '').toUpperCase();
}

export function isLikelyValidIbanFormat(iban: string): boolean {
  const normalized = normalizeIbanInput(iban);
  return /^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$/.test(normalized);
}
