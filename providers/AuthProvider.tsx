import type { Session, User } from '@supabase/supabase-js';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { homeRouteForAccount } from '@/constants/roles';
import { CURRENT_MEMBER } from '@/data/mock';
import {
  mapOrganizationMembership,
  mapProfessionalProfile,
  memberFromAuthMetadata,
  profileToMember,
  type OrganizationMemberRow,
  type ProfessionalProfileRow,
  type ProfileRow,
} from '@/lib/profile';
import { supabase } from '@/lib/supabase';
import { useShiftStore } from '@/store/shiftStore';
import type {
  AccountType,
  Member,
  OrganizationMembership,
  OrganizationType,
  ProfessionalProfile,
  ProfessionalRoleCode,
} from '@/types';

export type ProfessionalSignUpInput = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  roleCode: ProfessionalRoleCode;
  city: string;
  countryCode?: string;
  registrationNumber?: string;
  yearsExperience?: number;
  speciality?: string;
  availableForShifts?: boolean;
  preferredLocations?: string[];
  preferredDepartments?: string[];
  preferredShiftTypes?: ('day' | 'night')[];
};

export type OrganizationSignUpInput = {
  // Primary contact (auth user)
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  jobTitle?: string;
  // Organization
  organizationName: string;
  organizationType: OrganizationType;
  countryCode?: string;
  city: string;
  address: string;
  website?: string;
  mainPhone: string;
  mainEmail: string;
  registrationNumber?: string;
};

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  member: Member;
  professionalProfile: ProfessionalProfile | null;
  organizationMembership: OrganizationMembership | null;
  loading: boolean;
  accountType: AccountType;
  isSuperAdmin: boolean;
  isVerifiedProfessional: boolean;
  isOrganizationVerified: boolean;
  homeRoute: string;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUpProfessional: (
    input: ProfessionalSignUpInput,
  ) => Promise<{ error?: string; needsEmailConfirm?: boolean }>;
  signUpOrganization: (
    input: OrganizationSignUpInput,
  ) => Promise<{ error?: string; needsEmailConfirm?: boolean }>;
  /** @deprecated use signUpProfessional */
  signUp: (input: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone: string;
    roleCode: ProfessionalRoleCode;
  }) => Promise<{ error?: string; needsEmailConfirm?: boolean }>;
  resetPassword: (email: string) => Promise<{ error?: string }>;
  submitProfessionalForVerification: () => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function loadAuthBundle(user: User): Promise<{
  member: Member;
  professionalProfile: ProfessionalProfile | null;
  organizationMembership: OrganizationMembership | null;
}> {
  const { data: profileData } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  let professional: ProfessionalProfile | null = null;
  let membership: OrganizationMembership | null = null;

  if (profileData) {
    const profileRow = profileData as ProfileRow;
    const accountTypeHint = profileRow.account_type;

    if (accountTypeHint !== 'ORGANIZATION_USER' && accountTypeHint !== 'SUPER_ADMIN') {
      const { data: profData } = await supabase
        .from('professional_profiles')
        .select('*')
        .eq('profile_id', user.id)
        .maybeSingle();
      if (profData) {
        professional = mapProfessionalProfile(profData as ProfessionalProfileRow);
      }
    }

    if (accountTypeHint === 'ORGANIZATION_USER' || !accountTypeHint) {
      const { data: memberData } = await supabase
        .from('organization_members')
        .select('*, organizations(*)')
        .eq('profile_id', user.id)
        .eq('status', 'ACTIVE')
        .maybeSingle();
      if (memberData) {
        membership = mapOrganizationMembership(memberData as OrganizationMemberRow);
      }
    }

    return {
      member: profileToMember(profileRow, professional),
      professionalProfile: professional,
      organizationMembership: membership,
    };
  }

  const meta = user.user_metadata ?? {};
  return {
    member: memberFromAuthMetadata({
      id: user.id,
      email: user.email ?? '',
      firstName: typeof meta.first_name === 'string' ? meta.first_name : undefined,
      lastName: typeof meta.last_name === 'string' ? meta.last_name : undefined,
      phone: typeof meta.phone === 'string' ? meta.phone : undefined,
      roleCode:
        typeof meta.professional_role_code === 'string' ? meta.professional_role_code : undefined,
      roleName:
        typeof meta.professional_role_name === 'string' ? meta.professional_role_name : undefined,
      accountType: typeof meta.account_type === 'string' ? meta.account_type : undefined,
      appRole: typeof meta.app_role === 'string' ? meta.app_role : undefined,
    }),
    professionalProfile: null,
    organizationMembership: null,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [member, setMember] = useState<Member>(CURRENT_MEMBER);
  const [professionalProfile, setProfessionalProfile] = useState<ProfessionalProfile | null>(null);
  const [organizationMembership, setOrganizationMembership] =
    useState<OrganizationMembership | null>(null);
  const [loading, setLoading] = useState(true);
  const setActiveMemberId = useShiftStore((s) => s.setActiveMemberId);

  const hydrate = useCallback(
    async (next: Session | null) => {
      setSession(next);
      if (!next?.user) {
        setMember(CURRENT_MEMBER);
        setProfessionalProfile(null);
        setOrganizationMembership(null);
        setActiveMemberId(CURRENT_MEMBER.id);
        return;
      }
      const bundle = await loadAuthBundle(next.user);
      setMember(bundle.member);
      setProfessionalProfile(bundle.professionalProfile);
      setOrganizationMembership(bundle.organizationMembership);
      setActiveMemberId(bundle.member.id);
    },
    [setActiveMemberId],
  );

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      await hydrate(data.session);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void hydrate(nextSession).finally(() => {
        if (mounted) setLoading(false);
      });
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [hydrate]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) return { error: error.message };
    return {};
  }, []);

  const signUpProfessional = useCallback(async (input: ProfessionalSignUpInput) => {
    const roleName =
      input.roleCode === 'WARD_ASSISTANT' ? 'Ward Assistant' : 'Registered Nurse';

    const { data, error } = await supabase.auth.signUp({
      email: input.email.trim().toLowerCase(),
      password: input.password,
      options: {
        data: {
          account_type: 'PROFESSIONAL',
          first_name: input.firstName.trim(),
          last_name: input.lastName.trim(),
          phone: input.phone.trim(),
          professional_role_code: input.roleCode,
          professional_role_name: roleName,
          city: input.city,
          country_code: input.countryCode ?? 'CY',
          registration_number: input.registrationNumber ?? '',
          years_experience: String(input.yearsExperience ?? 0),
          speciality: input.speciality ?? '',
          available_for_shifts: String(input.availableForShifts ?? true),
          preferred_locations: input.preferredLocations ?? [],
          preferred_departments: input.preferredDepartments ?? [],
          preferred_shift_types: input.preferredShiftTypes ?? [],
        },
      },
    });

    if (error) return { error: error.message };

    if (data.session?.user) {
      await supabase
        .from('professional_profiles')
        .update({
          verification_status: 'PENDING_VERIFICATION',
          registration_number: input.registrationNumber || null,
          years_experience: input.yearsExperience ?? 0,
          speciality: input.speciality || null,
          available_for_shifts: input.availableForShifts ?? true,
          preferred_locations: input.preferredLocations ?? [],
          preferred_departments: input.preferredDepartments ?? [],
          preferred_shift_types: input.preferredShiftTypes ?? [],
          professional_role_code: input.roleCode,
          professional_role_name: roleName,
          professional_role_id: input.roleCode === 'WARD_ASSISTANT' ? 'role_wa' : 'role_rn',
          updated_at: new Date().toISOString(),
        })
        .eq('profile_id', data.session.user.id);

      await supabase
        .from('profiles')
        .update({
          city: input.city,
          location: `${input.city}, Cyprus`,
          phone: input.phone.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', data.session.user.id);
    }

    return { needsEmailConfirm: Boolean(data.user) && !data.session };
  }, []);

  const signUpOrganization = useCallback(async (input: OrganizationSignUpInput) => {
    const { data, error } = await supabase.auth.signUp({
      email: input.email.trim().toLowerCase(),
      password: input.password,
      options: {
        data: {
          account_type: 'ORGANIZATION_USER',
          first_name: input.firstName.trim(),
          last_name: input.lastName.trim(),
          phone: input.phone.trim(),
          job_title: input.jobTitle ?? 'HR Manager',
          city: input.city,
        },
      },
    });

    if (error) return { error: error.message };

    const userId = data.user?.id ?? data.session?.user?.id;
    if (userId && data.session) {
      // account_type is set by signup trigger from metadata — do not update from client.
      await supabase
        .from('profiles')
        .update({
          city: input.city,
          location: `${input.city}, Cyprus`,
          phone: input.phone.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert({
          market_id: 'cy',
          name: input.organizationName.trim(),
          organization_type: input.organizationType,
          verification_status: 'PENDING_VERIFICATION',
          registration_number: input.registrationNumber || null,
          email: input.mainEmail.trim().toLowerCase(),
          phone: input.mainPhone.trim(),
          website: input.website || null,
          address: input.address.trim(),
          city: input.city,
          country_code: input.countryCode ?? 'CY',
          location: `${input.city}, Cyprus`,
        })
        .select('*')
        .single();

      if (orgError) return { error: orgError.message };

      const { error: memberError } = await supabase.from('organization_members').insert({
        organization_id: org.id,
        profile_id: userId,
        role: 'ORGANIZATION_OWNER',
        status: 'ACTIVE',
      });

      if (memberError) return { error: memberError.message };
    }

    return { needsEmailConfirm: Boolean(data.user) && !data.session };
  }, []);

  const signUp = useCallback(
    async (input: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      phone: string;
      roleCode: ProfessionalRoleCode;
    }) =>
      signUpProfessional({
        ...input,
        city: 'Limassol',
      }),
    [signUpProfessional],
  );

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase());
    if (error) return { error: error.message };
    return {};
  }, []);

  const submitProfessionalForVerification = useCallback(async () => {
    if (!session?.user) return { error: 'Not signed in' };
    const { error } = await supabase
      .from('professional_profiles')
      .update({
        verification_status: 'PENDING_VERIFICATION',
        updated_at: new Date().toISOString(),
      })
      .eq('profile_id', session.user.id);
    if (error) return { error: error.message };
    await hydrate(session);
    return {};
  }, [session, hydrate]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setMember(CURRENT_MEMBER);
    setProfessionalProfile(null);
    setOrganizationMembership(null);
    setActiveMemberId(CURRENT_MEMBER.id);
  }, [setActiveMemberId]);

  const refreshProfile = useCallback(async () => {
    if (!session?.user) return;
    await hydrate(session);
  }, [session, hydrate]);

  const accountType = member.accountType;
  const isVerifiedProfessional =
    accountType === 'PROFESSIONAL' && member.professionalStatus === 'VERIFIED';
  const isOrganizationVerified = Boolean(organizationMembership?.organization?.verified);
  const homeRoute = homeRouteForAccount({
    accountType,
    professionalStatus: member.professionalStatus,
    organizationVerified: isOrganizationVerified,
  });

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      member,
      professionalProfile,
      organizationMembership,
      loading,
      accountType,
      isSuperAdmin: accountType === 'SUPER_ADMIN',
      isVerifiedProfessional,
      isOrganizationVerified,
      homeRoute,
      signIn,
      signUpProfessional,
      signUpOrganization,
      signUp,
      resetPassword,
      submitProfessionalForVerification,
      signOut,
      refreshProfile,
    }),
    [
      session,
      member,
      professionalProfile,
      organizationMembership,
      loading,
      accountType,
      isVerifiedProfessional,
      isOrganizationVerified,
      homeRoute,
      signIn,
      signUpProfessional,
      signUpOrganization,
      signUp,
      resetPassword,
      submitProfessionalForVerification,
      signOut,
      refreshProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
