import type { OrgStatus, OrganizationType } from './types';

export const ORG_STATUS_LABELS: Record<OrgStatus, string> = {
  pending: 'Pending',
  under_review: 'Under review',
  active: 'Active',
  rejected: 'Rejected',
  suspended: 'Suspended',
  closed: 'Closed',
};

export const ORGANIZATION_TYPE_LABELS: Record<OrganizationType, string> = {
  hospital: 'Hospital',
  clinic: 'Clinic',
  nursing_home: 'Nursing home',
  other: 'Other',
};

/** Fields required by submit_organization_for_review (DB authoritative). */
export const ORG_PROFILE_REQUIRED_FIELDS = [
  {
    key: 'legalName',
    column: 'legal_name',
    formName: 'legalName',
    label: 'Legal name',
  },
  {
    key: 'displayName',
    column: 'display_name',
    formName: 'displayName',
    label: 'Display name',
  },
  {
    key: 'primaryContactName',
    column: 'primary_contact_name',
    formName: 'primaryContactName',
    label: 'Contact name',
  },
  {
    key: 'primaryContactEmail',
    column: 'primary_contact_email',
    formName: 'primaryContactEmail',
    label: 'Contact email',
  },
] as const;

export type OrgProfileRequiredFieldKey =
  (typeof ORG_PROFILE_REQUIRED_FIELDS)[number]['key'];

export type OrgProfileRequiredValues = {
  legalName?: string | null;
  displayName?: string | null;
  primaryContactName?: string | null;
  primaryContactEmail?: string | null;
};

function isBlank(value: string | null | undefined): boolean {
  return value == null || value.trim() === '';
}

export function missingOrgProfileRequiredLabels(
  values: OrgProfileRequiredValues,
): string[] {
  return ORG_PROFILE_REQUIRED_FIELDS.filter((field) =>
    isBlank(values[field.key]),
  ).map((field) => field.label);
}

export function formatOrgProfileIncompleteMessage(
  missingLabels?: string[],
): string {
  const labels =
    missingLabels && missingLabels.length > 0
      ? missingLabels
      : ORG_PROFILE_REQUIRED_FIELDS.map((field) => field.label);
  return `Complete the following required fields before submitting for review: ${labels.join(', ')}.`;
}

const COLUMN_TO_LABEL: Record<string, string> = Object.fromEntries(
  ORG_PROFILE_REQUIRED_FIELDS.map((field) => [field.column, field.label]),
);

/** Parse ORG_PROFILE_INCOMPLETE or ORG_PROFILE_INCOMPLETE:col1,col2 into a safe message. */
export function translateOrgProfileIncompleteError(raw: string): string {
  const prefix = 'ORG_PROFILE_INCOMPLETE';
  if (!raw.startsWith(prefix)) {
    return formatOrgProfileIncompleteMessage();
  }
  const suffix = raw.slice(prefix.length).replace(/^:/, '').trim();
  if (!suffix) {
    return formatOrgProfileIncompleteMessage();
  }
  const labels = suffix
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((column) => COLUMN_TO_LABEL[column] ?? column.replaceAll('_', ' '));
  return formatOrgProfileIncompleteMessage(labels);
}

export function isOrgOperational(status: OrgStatus): boolean {
  return status === 'active';
}

export function canEditOrgProfile(status: OrgStatus): boolean {
  return status === 'pending' || status === 'rejected';
}

export function canSubmitOrgForReview(status: OrgStatus): boolean {
  return status === 'pending' || status === 'rejected';
}

export function orgOperationalBlockedMessage(status: OrgStatus): string | null {
  switch (status) {
    case 'pending':
      return 'Your organization profile is pending. Complete setup and submit for review.';
    case 'under_review':
      return "Your organization is under review. You'll be notified when approved.";
    case 'rejected':
      return 'Your organization application was rejected. Update your profile and resubmit.';
    case 'suspended':
      return 'Your organization has been suspended. Contact support for details.';
    case 'closed':
      return 'This organization has been closed.';
    case 'active':
      return null;
    default:
      return 'Organization is not operational.';
  }
}

/**
 * Completeness is not approval. When required fields are filled and status
 * still allows submit, surface an explicit next action.
 */
export function orgPendingSubmitMessage(params: {
  status: OrgStatus;
  profileComplete: boolean;
}): string | null {
  if (!canSubmitOrgForReview(params.status)) return null;
  if (!params.profileComplete) {
    return orgOperationalBlockedMessage(params.status);
  }
  if (params.status === 'rejected') {
    return 'Required profile details are complete. Resubmit for Bridge Hive review — completeness is not approval.';
  }
  return 'Required profile details are complete. Submit for Bridge Hive review — a complete profile is not approval.';
}

export function orgSubmitCtaLabel(params: {
  status: OrgStatus;
  profileComplete: boolean;
}): string {
  if (canSubmitOrgForReview(params.status) && params.profileComplete) {
    return params.status === 'rejected' ? 'Resubmit for review' : 'Submit for review';
  }
  return 'Complete setup';
}
