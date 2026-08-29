import {
  accountTypeToAppRole,
  professionalStatusToVerification,
  resolveAccountType,
} from '@/constants/roles';
import type {
  AccountType,
  Member,
  Organization,
  OrganizationAccountStatus,
  OrganizationMembership,
  OrganizationMemberRole,
  OrganizationMemberStatus,
  OrganizationType,
  ProfessionalAccountStatus,
  ProfessionalProfile,
  ProfessionalRoleCode,
} from '@/types';

export type ProfileRow = {
  id: string;
  market_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  account_type?: string | null;
  professional_role_id?: string | null;
  professional_role_code?: string | null;
  professional_role_name?: string | null;
  location?: string | null;
  city?: string | null;
  country_code?: string | null;
  verification_status?: string | null;
  app_role?: string | null;
  reliability_percent?: number | null;
  completed_shifts?: number | null;
  hours_worked?: number | null;
  organizations_worked_with?: number | null;
  available_earnings?: number | null;
  pending_earnings?: number | null;
  paid_this_month?: number | null;
  avatar_initials?: string | null;
  years_experience?: number | null;
};

export type ProfessionalProfileRow = {
  id: string;
  profile_id: string;
  market_id: string;
  professional_role_id: string;
  professional_role_code: string;
  professional_role_name: string;
  verification_status: string;
  registration_number?: string | null;
  years_experience?: number | null;
  speciality?: string | null;
  available_for_shifts?: boolean | null;
  preferred_locations?: string[] | null;
  preferred_departments?: string[] | null;
  preferred_shift_types?: string[] | null;
};

export type OrganizationRow = {
  id: string;
  market_id: string;
  name: string;
  organization_type: string;
  verification_status: string;
  registration_number?: string | null;
  email: string;
  phone: string;
  website?: string | null;
  address?: string | null;
  city?: string | null;
  country_code?: string | null;
  location?: string | null;
};

export type OrganizationMemberRow = {
  id: string;
  organization_id: string;
  profile_id: string;
  role: string;
  department_id?: string | null;
  status: string;
  organizations?: OrganizationRow | OrganizationRow[] | null;
};

export function mapProfessionalProfile(row: ProfessionalProfileRow): ProfessionalProfile {
  return {
    id: row.id,
    profileId: row.profile_id,
    marketId: row.market_id,
    professionalRoleId: row.professional_role_id,
    professionalRoleCode: row.professional_role_code as ProfessionalRoleCode,
    professionalRoleName: row.professional_role_name,
    verificationStatus: row.verification_status as ProfessionalAccountStatus,
    registrationNumber: row.registration_number ?? undefined,
    yearsExperience: Number(row.years_experience) || 0,
    speciality: row.speciality ?? undefined,
    availableForShifts: Boolean(row.available_for_shifts ?? true),
    preferredLocations: row.preferred_locations ?? [],
    preferredDepartments: row.preferred_departments ?? [],
    preferredShiftTypes: (row.preferred_shift_types ?? []).filter(
      (t): t is 'day' | 'night' => t === 'day' || t === 'night',
    ),
  };
}

export function mapOrganization(row: OrganizationRow): Organization {
  const status = row.verification_status as OrganizationAccountStatus;
  return {
    id: row.id,
    marketId: row.market_id,
    name: row.name,
    organizationType: row.organization_type as OrganizationType,
    verified: status === 'VERIFIED',
    verificationStatus: status,
    phone: row.phone,
    email: row.email,
    website: row.website ?? undefined,
    location: row.location || row.city || '',
    address: row.address || '',
    city: row.city || '',
    countryCode: row.country_code ?? 'CY',
    registrationNumber: row.registration_number ?? undefined,
  };
}

export function mapOrganizationMembership(row: OrganizationMemberRow): OrganizationMembership {
  const orgRaw = Array.isArray(row.organizations) ? row.organizations[0] : row.organizations;
  return {
    id: row.id,
    organizationId: row.organization_id,
    profileId: row.profile_id,
    role: row.role as OrganizationMemberRole,
    departmentId: row.department_id ?? undefined,
    status: row.status as OrganizationMemberStatus,
    organization: orgRaw ? mapOrganization(orgRaw) : undefined,
  };
}

export function profileToMember(
  row: ProfileRow,
  professional?: ProfessionalProfile | null,
): Member {
  const accountType = resolveAccountType({
    accountType: row.account_type,
    appRole: row.app_role,
    email: row.email,
  });
  const appRole = accountTypeToAppRole(accountType);

  const professionalStatus: ProfessionalAccountStatus =
    professional?.verificationStatus ??
    (row.verification_status === 'VERIFIED'
      ? 'VERIFIED'
      : row.verification_status === 'REJECTED'
        ? 'REJECTED'
        : 'PENDING_VERIFICATION');

  const roleCode = (professional?.professionalRoleCode ||
    row.professional_role_code ||
    (accountType === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'REGISTERED_NURSE')) as ProfessionalRoleCode;

  const roleName =
    accountType === 'SUPER_ADMIN'
      ? 'Super Admin'
      : professional?.professionalRoleName ||
        row.professional_role_name ||
        (roleCode === 'WARD_ASSISTANT' ? 'Ward Assistant' : 'Registered Nurse');

  return {
    id: row.id,
    marketId: row.market_id || 'cy',
    firstName: row.first_name,
    lastName: row.last_name,
    fullName: `${row.first_name} ${row.last_name}`.trim() || row.email,
    email: row.email,
    phone: row.phone || '',
    accountType,
    professionalRoleId:
      professional?.professionalRoleId ||
      row.professional_role_id ||
      (roleCode === 'WARD_ASSISTANT' ? 'role_wa' : 'role_rn'),
    professionalRoleCode: roleCode,
    professionalRoleName: roleName,
    location: row.location || `${row.city || 'Limassol'}, Cyprus`,
    city: row.city || 'Limassol',
    countryCode: row.country_code || 'CY',
    verificationStatus: professionalStatusToVerification(professionalStatus),
    professionalStatus,
    appRole,
    reliabilityPercent: Number(row.reliability_percent) || 100,
    completedShifts: Number(row.completed_shifts) || 0,
    hoursWorked: Number(row.hours_worked) || 0,
    organizationsWorkedWith: Number(row.organizations_worked_with) || 0,
    availableEarnings: Number(row.available_earnings) || 0,
    pendingEarnings: Number(row.pending_earnings) || 0,
    paidThisMonth: Number(row.paid_this_month) || 0,
    avatarInitials: row.avatar_initials || 'HB',
    yearsExperience: professional?.yearsExperience ?? (Number(row.years_experience) || 0),
    registrationNumber: professional?.registrationNumber,
    speciality: professional?.speciality,
  };
}

export function memberFromAuthMetadata(params: {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  roleCode?: string;
  roleName?: string;
  accountType?: string;
  appRole?: string;
}): Member {
  const firstName = params.firstName?.trim() || 'HealthBridge';
  const lastName = params.lastName?.trim() || 'Member';
  const accountType: AccountType = resolveAccountType({
    accountType: params.accountType,
    appRole: params.appRole,
    email: params.email,
  });
  const appRole = accountTypeToAppRole(accountType);
  const roleCode = (
    accountType === 'SUPER_ADMIN'
      ? 'SUPER_ADMIN'
      : params.roleCode || 'REGISTERED_NURSE'
  ) as ProfessionalRoleCode;
  const roleName =
    accountType === 'SUPER_ADMIN'
      ? 'Super Admin'
      : params.roleName ||
        (roleCode === 'WARD_ASSISTANT' ? 'Ward Assistant' : 'Registered Nurse');
  const professionalStatus: ProfessionalAccountStatus =
    accountType === 'SUPER_ADMIN' ? 'VERIFIED' : 'PENDING_VERIFICATION';

  return {
    id: params.id,
    marketId: 'cy',
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`.trim(),
    email: params.email,
    phone: params.phone || '',
    accountType,
    professionalRoleId:
      roleCode === 'WARD_ASSISTANT'
        ? 'role_wa'
        : roleCode === 'SUPER_ADMIN'
          ? 'role_super_admin'
          : 'role_rn',
    professionalRoleCode: roleCode,
    professionalRoleName: roleName,
    location: 'Limassol, Cyprus',
    city: 'Limassol',
    countryCode: 'CY',
    verificationStatus: professionalStatusToVerification(professionalStatus),
    professionalStatus,
    appRole,
    reliabilityPercent: 100,
    completedShifts: 0,
    hoursWorked: 0,
    organizationsWorkedWith: 0,
    availableEarnings: 0,
    pendingEarnings: 0,
    paidThisMonth: 0,
    avatarInitials: `${firstName[0] ?? 'H'}${lastName[0] ?? 'B'}`.toUpperCase(),
    yearsExperience: 0,
  };
}
