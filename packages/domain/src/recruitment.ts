/**
 * Bridge Hive Recruitment — domain helpers (pure).
 * Separate from marketplace worker verification.
 */

import {
  CREDENTIAL_TYPES,
  CREDENTIAL_TYPES_REQUIRING_EXPIRY,
  credentialExpiryIsValid,
  credentialRequirementsForRole,
  credentialRequiresKnownExpiry,
  credentialTypeLabel,
  endOfCyprusBusinessDayIso,
  isValidCivilDateYmd,
  type CredentialType,
} from './credential-requirements';
import { WORKER_ROLE_LABELS, WORKER_ROLES, type WorkerRole } from './types';

/** Extensible path; Phase 1 only uses professional. */
export const RECRUITMENT_CANDIDATE_PATHS = ['professional'] as const;
export type RecruitmentCandidatePath =
  (typeof RECRUITMENT_CANDIDATE_PATHS)[number];

export const RECRUITMENT_PLATFORM_STATUSES = [
  'received',
  'under_review',
  'available',
  'archived',
  'withdrawn',
] as const;
export type RecruitmentPlatformStatus =
  (typeof RECRUITMENT_PLATFORM_STATUSES)[number];

export const RECRUITMENT_ORG_PIPELINE_STATUSES = [
  'viewed',
  'shortlisted',
  'contacted',
  'interviewing',
  'offered',
  'hired',
  'not_suitable',
  'archived',
] as const;
export type RecruitmentOrgPipelineStatus =
  (typeof RECRUITMENT_ORG_PIPELINE_STATUSES)[number];

export const RECRUITMENT_EMPLOYMENT_TYPES = [
  'full_time',
  'part_time',
  'locum',
  'flexible',
] as const;
export type RecruitmentEmploymentType =
  (typeof RECRUITMENT_EMPLOYMENT_TYPES)[number];

export const RECRUITMENT_EMPLOYMENT_TYPE_LABELS: Record<
  RecruitmentEmploymentType,
  string
> = {
  full_time: 'Full-time',
  part_time: 'Part-time',
  locum: 'Locum / shift-based',
  flexible: 'Flexible',
};

export const RECRUITMENT_PRIVACY_NOTICE_VERSION = 'recruitment-privacy-v0-draft';

/** Placeholder consent copy — replace after legal review. Not a compliance claim. */
export const RECRUITMENT_CONSENT_PLACEHOLDER =
  'I confirm that the information I have provided is accurate, and I agree that Bridge Hive may store and process this application for recruitment purposes as described in the privacy notice (draft). I understand this does not guarantee employment or contact.';

export const RECRUITMENT_SUCCESS_MESSAGE =
  'Your Bridge Hive talent profile has been received.';

export const RECRUITMENT_MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
/** Hard ceiling across all files in one submission (before body parse + storage). */
export const RECRUITMENT_MAX_TOTAL_UPLOAD_BYTES = 32 * 1024 * 1024;
/** Absolute max files per submission (public checklist is 9; a role checklist is smaller). */
export const RECRUITMENT_MAX_UPLOAD_FILES = 9;
export const RECRUITMENT_ALLOWED_MIME = [
  'application/pdf',
  'image/jpeg',
  'image/png',
] as const;
export const RECRUITMENT_DOCUMENT_TYPE_PATTERN = /^[a-z0-9_]+$/;

export function isRecruitmentWorkerRole(value: unknown): value is WorkerRole {
  return (
    typeof value === 'string' &&
    (WORKER_ROLES as readonly string[]).includes(value)
  );
}

export function recruitmentRoleLabel(role: WorkerRole): string {
  return WORKER_ROLE_LABELS[role];
}

const RECRUITMENT_OMITTED_DOCUMENT_TYPES = new Set<CredentialType>([
  'tax_identification_proof',
  'social_insurance_proof',
]);

function toRecruitmentDocumentRequirement(req: {
  credentialType: CredentialType;
  isRequired: boolean;
}): {
  credentialType: CredentialType;
  isRequired: boolean;
  label: string;
  requiresExpiry: boolean;
} {
  return {
    credentialType: req.credentialType,
    isRequired: req.isRequired,
    label: credentialTypeLabel(req.credentialType, 'en'),
    requiresExpiry: (
      CREDENTIAL_TYPES_REQUIRING_EXPIRY as readonly string[]
    ).includes(req.credentialType),
  };
}

export function recruitmentDocumentRequirementsForRole(role: WorkerRole): Array<{
  credentialType: CredentialType;
  isRequired: boolean;
  label: string;
  requiresExpiry: boolean;
}> {
  return credentialRequirementsForRole(role)
    .filter((req) => !RECRUITMENT_OMITTED_DOCUMENT_TYPES.has(req.credentialType))
    .map(toRecruitmentDocumentRequirement);
}

/**
 * Public application checklist. Role-specific papers stay available so an
 * applicant can attach the ones they have. Identity is required for every
 * applicant. Tax and social-insurance proofs stay off this form.
 */
const RECRUITMENT_APPLICATION_DOCUMENTS: Array<{
  credentialType: CredentialType;
  isRequired: boolean;
}> = [
  { credentialType: 'identity_document_front', isRequired: true },
  { credentialType: 'identity_document_back', isRequired: true },
  { credentialType: 'cv', isRequired: false },
  { credentialType: 'nursing_degree', isRequired: false },
  { credentialType: 'nursing_licence', isRequired: false },
  { credentialType: 'employment_certificate', isRequired: false },
  { credentialType: 'physiotherapy_degree', isRequired: false },
  {
    credentialType: 'physiotherapist_registration_certificate',
    isRequired: false,
  },
  { credentialType: 'physiotherapy_practising_licence', isRequired: false },
];

export function recruitmentApplicationDocumentRequirements(): Array<{
  credentialType: CredentialType;
  isRequired: boolean;
  label: string;
  requiresExpiry: boolean;
}> {
  return RECRUITMENT_APPLICATION_DOCUMENTS.map(toRecruitmentDocumentRequirement);
}

export function isSafeRecruitmentDocumentType(value: string): boolean {
  if (!value || !RECRUITMENT_DOCUMENT_TYPE_PATTERN.test(value)) return false;
  if (value.includes('..') || value.includes('/') || value.includes('\\')) {
    return false;
  }
  return (CREDENTIAL_TYPES as readonly string[]).includes(value);
}

export function recruitmentUploadExtensionForMime(
  mimeType: string,
): 'pdf' | 'png' | 'jpg' | null {
  const mime = mimeType.toLowerCase();
  if (mime === 'application/pdf') return 'pdf';
  if (mime === 'image/png') return 'png';
  if (mime === 'image/jpeg') return 'jpg';
  return null;
}

export function sanitizeRecruitmentOriginalFilename(name: string): string {
  const base = name.replace(/\\/g, '/').split('/').pop() ?? '';
  const cleaned = base
    .replace(/[^\w.\- ()[\]]+/g, '_')
    .replace(/^\.+/, '')
    .slice(0, 200);
  return cleaned || 'document';
}

export function buildRecruitmentStoragePath(params: {
  candidateId: string;
  documentType: string;
  extension: 'pdf' | 'png' | 'jpg';
  objectId?: string;
}): string | null {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      params.candidateId,
    )
  ) {
    return null;
  }
  if (!isSafeRecruitmentDocumentType(params.documentType)) return null;
  const objectId =
    params.objectId ??
    (typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}`);
  return `${params.candidateId}/${params.documentType}/${objectId}.${params.extension}`;
}

/**
 * Resolve a civil YYYY-MM-DD expiry for recruitment_documents.expires_at (date).
 * Uses Cyprus end-of-day validity rules; only types that require expiry store a date.
 */
export function resolveRecruitmentDocumentExpiresAt(params: {
  documentType: string;
  expiresAtYmd?: string | null;
  now?: Date;
}): { expiresAt: string | null } | { error: string } {
  const raw = params.expiresAtYmd?.trim() ?? '';
  const requiresExpiry = credentialRequiresKnownExpiry(params.documentType);

  if (!requiresExpiry) {
    if (!raw) return { expiresAt: null };
    // Ignore valid client-supplied expiry for types that do not require it.
    if (isValidCivilDateYmd(raw)) return { expiresAt: null };
    return { error: 'Invalid document expiry date.' };
  }

  if (!raw) {
    return { error: 'Enter an expiry date for this document.' };
  }
  if (!isValidCivilDateYmd(raw)) {
    return { error: 'Enter a valid expiry date (YYYY-MM-DD).' };
  }

  let endOfDayIso: string;
  try {
    endOfDayIso = endOfCyprusBusinessDayIso(raw);
  } catch {
    return { error: 'Enter a valid expiry date (YYYY-MM-DD).' };
  }

  if (
    !credentialExpiryIsValid({
      credentialType: params.documentType,
      expiresAt: endOfDayIso,
      now: params.now,
    })
  ) {
    return { error: 'Expiry date must be in the future.' };
  }

  return { expiresAt: raw };
}

export function validateRecruitmentUpload(file: {
  type: string;
  size: number;
}): { ok: true } | { ok: false; error: string } {
  const mime = file.type.toLowerCase();
  if (!(RECRUITMENT_ALLOWED_MIME as readonly string[]).includes(mime)) {
    return { ok: false, error: 'Upload a PDF, JPEG, or PNG file.' };
  }
  if (file.size <= 0 || file.size > RECRUITMENT_MAX_UPLOAD_BYTES) {
    return { ok: false, error: 'Each file must be under 10 MB.' };
  }
  return { ok: true };
}

export type RecruitmentDocumentUploadInput = {
  documentType: string;
  mimeType: string;
  sizeBytes: number;
  expiresAtYmd?: string | null;
};

/**
 * Validate document types, counts, sizes, and expiry against the server-side role checklist.
 * Call before any service-role RPC or storage write.
 */
export function validateRecruitmentDocumentBatch(params: {
  role: WorkerRole | null;
  documents: RecruitmentDocumentUploadInput[];
  now?: Date;
}):
  | {
      ok: true;
      documents: Array<{
        documentType: CredentialType;
        mimeType: string;
        sizeBytes: number;
        extension: 'pdf' | 'png' | 'jpg';
        expiresAt: string | null;
      }>;
    }
  | { ok: false; error: string } {
  const checklist = params.role
    ? recruitmentDocumentRequirementsForRole(params.role)
    : recruitmentApplicationDocumentRequirements();
  const allowed = new Set(checklist.map((d) => d.credentialType));
  const maxForRole = Math.min(checklist.length, RECRUITMENT_MAX_UPLOAD_FILES);

  if (params.documents.length === 0) {
    const missingWhenEmpty = checklist.find((req) => req.isRequired);
    if (missingWhenEmpty) {
      return {
        ok: false,
        error: `Add required document: ${missingWhenEmpty.label}.`,
      };
    }
    return { ok: false, error: 'Upload at least one supporting document.' };
  }
  if (params.documents.length > RECRUITMENT_MAX_UPLOAD_FILES) {
    return { ok: false, error: 'Too many documents uploaded.' };
  }
  if (params.documents.length > maxForRole) {
    return { ok: false, error: 'Too many documents uploaded.' };
  }

  let totalBytes = 0;
  const seen = new Set<string>();
  const normalized: Array<{
    documentType: CredentialType;
    mimeType: string;
    sizeBytes: number;
    extension: 'pdf' | 'png' | 'jpg';
    expiresAt: string | null;
  }> = [];

  for (const doc of params.documents) {
    if (!isSafeRecruitmentDocumentType(doc.documentType)) {
      return { ok: false, error: 'Invalid document type for the selected role.' };
    }
    if (!allowed.has(doc.documentType as CredentialType)) {
      return { ok: false, error: 'Invalid document type for the selected role.' };
    }
    if (seen.has(doc.documentType)) {
      return { ok: false, error: 'Each document type may be uploaded once.' };
    }
    seen.add(doc.documentType);

    const upload = validateRecruitmentUpload({
      type: doc.mimeType,
      size: doc.sizeBytes,
    });
    if (!upload.ok) return upload;

    const extension = recruitmentUploadExtensionForMime(doc.mimeType);
    if (!extension) {
      return { ok: false, error: 'Upload a PDF, JPEG, or PNG file.' };
    }

    totalBytes += doc.sizeBytes;
    if (totalBytes > RECRUITMENT_MAX_TOTAL_UPLOAD_BYTES) {
      return {
        ok: false,
        error: 'Total upload size must be 32 MB or less.',
      };
    }

    const expiry = resolveRecruitmentDocumentExpiresAt({
      documentType: doc.documentType,
      expiresAtYmd: doc.expiresAtYmd,
      now: params.now,
    });
    if ('error' in expiry) return { ok: false, error: expiry.error };

    normalized.push({
      documentType: doc.documentType as CredentialType,
      mimeType: doc.mimeType.toLowerCase(),
      sizeBytes: doc.sizeBytes,
      extension,
      expiresAt: expiry.expiresAt,
    });
  }

  const missing = checklist.find(
    (req) =>
      req.isRequired &&
      !normalized.some((doc) => doc.documentType === req.credentialType),
  );
  if (missing) {
    return { ok: false, error: `Add required document: ${missing.label}.` };
  }

  return { ok: true, documents: normalized };
}

export type RecruitmentApplicationDraft = {
  path: RecruitmentCandidatePath;
  fullName: string;
  email: string;
  phone: string;
  currentLocation: string;
  countryOfResidence: string;
  preferredCyprusLocation: string;
  role: WorkerRole | '';
  yearsExperience: string;
  registrationState: string;
  employmentType: RecruitmentEmploymentType | '';
  preferredEnvironments: string;
  areasOfInterest: string;
  availability: string;
  consentAccepted: boolean;
};

export function emptyRecruitmentApplicationDraft(): RecruitmentApplicationDraft {
  return {
    path: 'professional',
    fullName: '',
    email: '',
    phone: '',
    currentLocation: '',
    countryOfResidence: 'Cyprus',
    preferredCyprusLocation: '',
    role: '',
    yearsExperience: '',
    registrationState: '',
    employmentType: 'full_time',
    preferredEnvironments: '',
    areasOfInterest: '',
    availability: '',
    consentAccepted: false,
  };
}

export type RecruitmentStepId =
  | 'personal'
  | 'preferences'
  | 'documents'
  | 'consent';

export const RECRUITMENT_APPLY_STEPS: Array<{
  id: RecruitmentStepId;
  title: string;
  description: string;
}> = [
  {
    id: 'personal',
    title: 'Personal details',
    description: 'How we can reach you.',
  },
  {
    id: 'preferences',
    title: 'Employment preferences',
    description: 'Where and how you want to work.',
  },
  {
    id: 'documents',
    title: 'CV and documents',
    description: 'Upload supporting files privately.',
  },
  {
    id: 'consent',
    title: 'Consent and review',
    description: 'Confirm and submit your profile.',
  },
];

export function validateRecruitmentPersonalStep(
  draft: RecruitmentApplicationDraft,
): string | null {
  if (!draft.fullName.trim()) return 'Enter your full name.';
  if (!draft.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email)) {
    return 'Enter a valid email address.';
  }
  if (!draft.phone.trim()) return 'Enter a phone number.';
  if (!draft.currentLocation.trim()) return 'Enter your current location.';
  if (!draft.countryOfResidence.trim()) return 'Enter your country of residence.';
  return null;
}

export function validateRecruitmentProfessionalStep(
  draft: RecruitmentApplicationDraft,
): string | null {
  if (!isRecruitmentWorkerRole(draft.role)) {
    return 'Select a professional role.';
  }
  if (!draft.yearsExperience.trim()) {
    return 'Describe your relevant experience.';
  }
  if (!draft.registrationState.trim()) {
    return 'Describe your registration or qualification state.';
  }
  return null;
}

export function validateRecruitmentPreferencesStep(
  draft: RecruitmentApplicationDraft,
): string | null {
  if (!isRecruitmentWorkerRole(draft.role)) {
    return 'Select a professional role.';
  }
  if (!draft.employmentType) return 'Select an employment type.';
  return null;
}

export function validateRecruitmentConsentStep(
  draft: RecruitmentApplicationDraft,
): string | null {
  if (!draft.consentAccepted) {
    return 'You must accept the privacy notice to submit.';
  }
  return null;
}

export const RECRUITMENT_ORG_PIPELINE_LABELS: Record<
  RecruitmentOrgPipelineStatus,
  string
> = {
  viewed: 'Viewed',
  shortlisted: 'Shortlisted',
  contacted: 'Contacted',
  interviewing: 'Interviewing',
  offered: 'Offered',
  hired: 'Hired',
  not_suitable: 'Not suitable',
  archived: 'Archived',
};

export const RECRUITMENT_PLATFORM_STATUS_LABELS: Record<
  RecruitmentPlatformStatus,
  string
> = {
  received: 'Received',
  under_review: 'Under review',
  available: 'Available to organizations',
  archived: 'Archived',
  withdrawn: 'Withdrawn',
};
