/**
 * Bridge Hive Recruitment — domain helpers (pure).
 * Separate from marketplace worker verification.
 */

import {
  CREDENTIAL_TYPES_REQUIRING_EXPIRY,
  credentialRequirementsForRole,
  credentialTypeLabel,
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
export const RECRUITMENT_ALLOWED_MIME = [
  'application/pdf',
  'image/jpeg',
  'image/png',
] as const;

export function isRecruitmentWorkerRole(value: unknown): value is WorkerRole {
  return (
    typeof value === 'string' &&
    (WORKER_ROLES as readonly string[]).includes(value)
  );
}

export function recruitmentRoleLabel(role: WorkerRole): string {
  return WORKER_ROLE_LABELS[role];
}

export function recruitmentDocumentRequirementsForRole(role: WorkerRole): Array<{
  credentialType: CredentialType;
  isRequired: boolean;
  label: string;
  requiresExpiry: boolean;
}> {
  return credentialRequirementsForRole(role).map((req) => ({
    credentialType: req.credentialType,
    isRequired: req.isRequired,
    label: credentialTypeLabel(req.credentialType, 'en'),
    requiresExpiry: (
      CREDENTIAL_TYPES_REQUIRING_EXPIRY as readonly string[]
    ).includes(req.credentialType),
  }));
}

export function validateRecruitmentUpload(file: {
  type: string;
  size: number;
}): { ok: true } | { ok: false; error: string } {
  if (
    !(RECRUITMENT_ALLOWED_MIME as readonly string[]).includes(file.type)
  ) {
    return { ok: false, error: 'Upload a PDF, JPEG, or PNG file.' };
  }
  if (file.size <= 0 || file.size > RECRUITMENT_MAX_UPLOAD_BYTES) {
    return { ok: false, error: 'Each file must be under 10 MB.' };
  }
  return { ok: true };
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
    employmentType: '',
    preferredEnvironments: '',
    areasOfInterest: '',
    availability: '',
    consentAccepted: false,
  };
}

export type RecruitmentStepId =
  | 'personal'
  | 'professional'
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
    id: 'professional',
    title: 'Professional profile',
    description: 'Your role and experience.',
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
  if (!draft.employmentType) return 'Select an employment type.';
  if (!draft.availability.trim()) return 'Describe your availability.';
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
