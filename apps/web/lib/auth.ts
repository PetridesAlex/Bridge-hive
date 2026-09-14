import type { OrgRole, OrgStatus } from '@bridge-hive/domain';
import {
  canEditOrgProfile,
  canSubmitOrgForReview,
  isOrgOperational,
} from '@bridge-hive/domain';
import type { Tables } from '@bridge-hive/supabase-types';
import type { User } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';

export type Profile = Tables<'profiles'>;
export type Organization = Tables<'organizations'>;
export type OrganizationMember = Tables<'organization_members'>;

export type MembershipWithOrg = OrganizationMember & {
  organization: Organization;
};

export type AuthBundle = {
  user: User;
  profile: Profile | null;
  memberships: MembershipWithOrg[];
};

export type OrgCapabilities = {
  role: OrgRole;
  canOperate: boolean;
  canEditProfile: boolean;
  canSubmitForReview: boolean;
  canManageLocations: boolean;
  canManageWards: boolean;
  canManageShifts: boolean;
  canPublishShifts: boolean;
  canReviewTimesheets: boolean;
  canAccessBilling: boolean;
  canEditOrgSettings: boolean;
};

export type OrgContext = {
  org: Organization;
  membership: OrganizationMember;
  capabilities: OrgCapabilities;
  user: User;
  profile: Profile | null;
};

function capabilitiesForRole(
  role: OrgRole,
  orgStatus: OrgStatus,
): OrgCapabilities {
  const isAdmin = role === 'org_admin';
  const isScheduler = role === 'org_scheduler';
  const isBilling = role === 'org_billing';
  const operational = isOrgOperational(orgStatus);

  return {
    role,
    canOperate: operational,
    canEditProfile: isAdmin && canEditOrgProfile(orgStatus),
    canSubmitForReview: isAdmin && canSubmitOrgForReview(orgStatus),
    canManageLocations: operational && (isAdmin || isScheduler),
    canManageWards: operational && (isAdmin || isScheduler),
    canManageShifts: operational && (isAdmin || isScheduler),
    canPublishShifts: operational && (isAdmin || isScheduler),
    canReviewTimesheets: operational && (isAdmin || isScheduler),
    canAccessBilling: operational && (isAdmin || isBilling),
    canEditOrgSettings: isAdmin,
  };
}

export async function getAuthBundle(): Promise<AuthBundle | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  const { data: membershipRows } = await supabase
    .from('organization_members')
    .select('*, organization:organizations(*)')
    .eq('user_id', user.id)
    .eq('status', 'active');

  const memberships: MembershipWithOrg[] = (membershipRows ?? [])
    .flatMap((row) => {
      const organization = row.organization as Organization | null;
      if (!organization) return [];
      const membership: OrganizationMember = {
        id: row.id,
        organization_id: row.organization_id,
        user_id: row.user_id,
        role: row.role,
        status: row.status,
        invited_at: row.invited_at,
        accepted_at: row.accepted_at,
        invited_by: row.invited_by,
        created_at: row.created_at,
        updated_at: row.updated_at,
      };
      return [{ ...membership, organization }];
    });

  return { user, profile, memberships };
}

export async function requireAuthBundle(): Promise<AuthBundle> {
  const bundle = await getAuthBundle();
  if (!bundle) {
    redirect('/sign-in');
  }
  return bundle;
}

export async function requireOrgMembership(slug: string): Promise<OrgContext> {
  const bundle = await requireAuthBundle();
  const match = bundle.memberships.find((m) => m.organization.slug === slug);

  if (!match) {
    redirect('/dashboard');
  }

  return {
    org: match.organization,
    membership: match,
    capabilities: capabilitiesForRole(
      match.role as OrgRole,
      match.organization.status as OrgStatus,
    ),
    user: bundle.user,
    profile: bundle.profile,
  };
}
