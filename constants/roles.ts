import type {
  AccountType,
  AppRole,
  OrganizationMemberRole,
  ProfessionalAccountStatus,
  VerificationStatus,
} from '@/types';

/** Bootstrap Super Admin emails — never grant via public signup UI. */
export const SUPER_ADMIN_EMAILS = ['petridesalexeu@gmail.com'] as const;

export const ORGANIZATION_MEMBER_ROLES: OrganizationMemberRole[] = [
  'ORGANIZATION_OWNER',
  'ORGANIZATION_ADMIN',
  'HR_MANAGER',
  'SCHEDULER',
  'DEPARTMENT_MANAGER',
  'FINANCE',
  'VIEWER',
];

export const CYPRUS_CITIES = ['Limassol', 'Nicosia', 'Larnaca', 'Paphos', 'Famagusta'] as const;

export function isSuperAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return SUPER_ADMIN_EMAILS.some((e) => e === normalized);
}

export function resolveAccountType(params: {
  accountType?: string | null;
  appRole?: string | null;
  email?: string | null;
}): AccountType {
  if (params.accountType === 'PROFESSIONAL' || params.accountType === 'ORGANIZATION_USER' || params.accountType === 'SUPER_ADMIN') {
    return params.accountType;
  }
  if (params.appRole === 'SUPER_ADMIN' || isSuperAdminEmail(params.email)) {
    return 'SUPER_ADMIN';
  }
  if (params.appRole === 'ORG_ADMIN') {
    return 'ORGANIZATION_USER';
  }
  return 'PROFESSIONAL';
}

/** Map account type back to legacy AppRole used by existing Super Admin UI. */
export function accountTypeToAppRole(accountType: AccountType): AppRole {
  if (accountType === 'SUPER_ADMIN') return 'SUPER_ADMIN';
  if (accountType === 'ORGANIZATION_USER') return 'ORG_ADMIN';
  return 'MEMBER';
}

export function resolveAppRole(params: {
  appRole?: string | null;
  accountType?: string | null;
  email?: string | null;
}): AppRole {
  return accountTypeToAppRole(resolveAccountType(params));
}

export function professionalStatusToVerification(
  status: ProfessionalAccountStatus,
): VerificationStatus {
  switch (status) {
    case 'VERIFIED':
      return 'VERIFIED';
    case 'REJECTED':
      return 'REJECTED';
    case 'PENDING_VERIFICATION':
      return 'PENDING';
    case 'SUSPENDED':
    case 'INACTIVE':
    case 'DRAFT':
    default:
      return 'UNVERIFIED';
  }
}

export function homeRouteForAccount(params: {
  accountType: AccountType;
  professionalStatus?: ProfessionalAccountStatus | null;
  organizationVerified?: boolean;
}): string {
  // Super Admin uses the professional app as home; /admin is optional via Profile.
  if (params.accountType === 'SUPER_ADMIN') return '/(tabs)';
  if (params.accountType === 'ORGANIZATION_USER') {
    return params.organizationVerified ? '/(org)' : '/auth/organization/pending';
  }
  if (params.professionalStatus === 'VERIFIED') return '/(tabs)';
  return '/auth/professional/pending';
}
