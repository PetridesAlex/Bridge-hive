import type { Session, User } from '@supabase/supabase-js';
import type { Tables } from '@bridge-hive/supabase-types';
import {
  classifyWorkerSignUpResponse,
  DEFAULT_WORKER_RECOVERY_NEXT,
  DEFAULT_WORKER_SIGNUP_CONFIRM_NEXT,
  buildAuthConfirmRedirectTo,
  workerExistingAccountMessage,
  type WorkerRole,
} from '@bridge-hive/domain';
import * as Linking from 'expo-linking';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Platform } from 'react-native';

import { WORKER_ROLE_LABELS } from '@/constants/config';
import { clearAvatarUrlCache } from '@/lib/avatar';
import { createSessionFromUrl, signInWithGoogleOAuth } from '@/lib/oauth';
import { supabase } from '@/lib/supabase';

export type Profile = Tables<'profiles'>;
export type WorkerProfile = Tables<'worker_profiles'>;

export type WorkerSignUpInput = {
  email: string;
  password: string;
  fullName: string;
  phone: string;
  workerRole: WorkerRole;
  bio?: string;
};

export type WorkerSignUpResult = {
  error?: string;
  needsEmailConfirm?: boolean;
  existingAccount?: boolean;
};

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  workerProfile: WorkerProfile | null;
  loading: boolean;
  isVerified: boolean;
  isWorker: boolean;
  accountRejectionReason: string | null;
  homeRoute: string;
  firstName: string;
  roleLabel: string;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signInWithGoogle: () => Promise<{ error?: string; cancelled?: boolean }>;
  signUpWorker: (input: WorkerSignUpInput) => Promise<WorkerSignUpResult>;
  resendSignupConfirmation: (email: string) => Promise<{ error?: string }>;
  resetPassword: (email: string) => Promise<{ error?: string }>;
  updatePassword: (password: string) => Promise<{ error?: string }>;
  completeWorkerRoleSetup: (input: {
    workerRole: WorkerRole;
    fullName: string;
    phone: string;
  }) => Promise<{ error?: string }>;
  submitForReview: () => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function firstNameFromFullName(fullName: string | null | undefined): string {
  if (!fullName?.trim()) return 'there';
  return fullName.trim().split(/\s+/)[0] ?? 'there';
}

function homeRouteForWorker(params: {
  hasSession: boolean;
  workerProfile: WorkerProfile | null;
  accountRejectionReason: string | null;
}): string {
  if (!params.hasSession) return '/welcome';
  if (params.accountRejectionReason) return '/auth/worker/rejected';
  if (!params.workerProfile) return '/auth/worker/choose-role';
  if (params.workerProfile.verification_status === 'verified') return '/(tabs)';
  return '/auth/worker/pending';
}

function workerRoleFromUser(user: User): WorkerRole | null {
  const raw = user.user_metadata?.worker_role;
  if (raw === 'registered_nurse' || raw === 'ward_assistant') return raw;
  return null;
}

function friendlyAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('already registered') || lower.includes('already been registered')) {
    return 'An account with this email already exists. Sign in or reset your password.';
  }
  if (lower.includes('user already')) {
    return 'An account with this email already exists. Sign in or reset your password.';
  }
  if (lower.includes('rate') || lower.includes('too many') || lower.includes('security purposes')) {
    return 'Please wait a moment before requesting another email.';
  }
  return message;
}

function friendlyRpcError(message: string): string {
  const upper = message.toUpperCase();
  if (upper.includes('MISSING_REQUIRED_CREDENTIAL')) {
    return 'Upload every required document before submitting for review.';
  }
  if (upper.includes('CREDENTIAL_NOT_READY')) {
    return 'Correct rejected documents before submitting for review.';
  }
  if (upper.includes('PACKAGE_NOT_SUBMITTABLE')) {
    return 'This package cannot be submitted in its current status.';
  }
  if (upper.includes('WORKER_ROLE_REQUIRED') || upper.includes('WORKER_PROFILE_REQUIRED')) {
    return 'Finish Account Setup (choose your role) before submitting.';
  }
  if (upper.includes('ACCOUNT_NOT_ACTIVE')) {
    return 'Your account is not active. Contact support.';
  }
  if (upper.includes('COULD NOT FIND THE FUNCTION') || upper.includes('PGRST202')) {
    return 'Package submit is not available on this environment yet. Ask support to apply migration 024.';
  }
  return message;
}

function workerAppRedirectTo(path: string): string {
  const relative = path.replace(/^\//, '');
  try {
    return Linking.createURL(relative);
  } catch {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      return `${window.location.origin}/${relative}`;
    }
    return `bridgehive://${relative}`;
  }
}

/** Web origin used in Auth emails (`/auth/confirm?next=…`). Required when Reset Password template uses RedirectTo. */
function workerWebAppOrigin(): string | null {
  const raw = process.env.EXPO_PUBLIC_WEB_APP_URL?.trim();
  if (!raw) return null;
  try {
    return new URL(raw).origin;
  } catch {
    return null;
  }
}

function workerSignupConfirmRedirectTo(): string {
  const webOrigin = workerWebAppOrigin();
  if (webOrigin) {
    return buildAuthConfirmRedirectTo(webOrigin, DEFAULT_WORKER_SIGNUP_CONFIRM_NEXT);
  }
  return workerAppRedirectTo(DEFAULT_WORKER_SIGNUP_CONFIRM_NEXT);
}

function workerRecoveryRedirectTo(): string {
  const webOrigin = workerWebAppOrigin();
  if (webOrigin) {
    return buildAuthConfirmRedirectTo(webOrigin, DEFAULT_WORKER_RECOVERY_NEXT);
  }
  return workerAppRedirectTo(DEFAULT_WORKER_RECOVERY_NEXT);
}

async function bootstrapWorkerProfile(user: User): Promise<WorkerProfile | null> {
  const role = workerRoleFromUser(user);
  const bio =
    typeof user.user_metadata?.bio === 'string' ? user.user_metadata.bio : null;

  const { data: rpcData, error: rpcError } = await supabase.rpc(
    'ensure_my_worker_profile',
    {
      p_worker_role: role,
      p_bio: bio,
    },
  );

  if (!rpcError && rpcData) {
    return rpcData as WorkerProfile;
  }

  if (!role) return null;

  const { data: inserted, error: insertError } = await supabase
    .from('worker_profiles')
    .insert({
      user_id: user.id,
      worker_role: role,
      bio: bio?.trim() || null,
      onboarding_status: 'in_progress',
    })
    .select('*')
    .maybeSingle();

  if (!insertError && inserted) return inserted;

  const { data: existing } = await supabase
    .from('worker_profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  return existing ?? null;
}

async function loadAuthBundle(user: User): Promise<{
  profile: Profile | null;
  workerProfile: WorkerProfile | null;
  accountRejectionReason: string | null;
}> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  let { data: workerProfile } = await supabase
    .from('worker_profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (workerProfile) {
    return { profile, workerProfile, accountRejectionReason: null };
  }

  const { data: orgMembership } = await supabase
    .from('organization_members')
    .select('id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle();

  if (orgMembership) {
    return {
      profile,
      workerProfile: null,
      accountRejectionReason:
        'This account is registered as an organization. Please use the Bridge Hive web portal.',
    };
  }

  const { data: platformAdmin } = await supabase
    .from('platform_admin_roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();

  if (platformAdmin) {
    return {
      profile,
      workerProfile: null,
      accountRejectionReason:
        'Platform admin accounts cannot use the worker app. Please use the web portal.',
    };
  }

  workerProfile = await bootstrapWorkerProfile(user);
  return { profile, workerProfile, accountRejectionReason: null };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [workerProfile, setWorkerProfile] = useState<WorkerProfile | null>(null);
  const [accountRejectionReason, setAccountRejectionReason] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const hydrate = useCallback(async (next: Session | null) => {
    setSession(next);
    if (!next?.user) {
      setProfile(null);
      setWorkerProfile(null);
      setAccountRejectionReason(null);
      return;
    }
    const bundle = await loadAuthBundle(next.user);
    setProfile(bundle.profile);
    setWorkerProfile(bundle.workerProfile);
    setAccountRejectionReason(bundle.accountRejectionReason);
  }, []);

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

    // Cold/warm OAuth deep links on native only. Expo web uses /auth/callback +
    // openAuthSessionAsync return URL — Linking here would double-spend the PKCE code.
    let linkSub: { remove: () => void } | undefined;
    if (Platform.OS !== 'web') {
      const handleUrl = (url: string | null) => {
        if (!url || !url.includes('auth/callback')) return;
        void createSessionFromUrl(url);
      };
      void Linking.getInitialURL().then(handleUrl);
      linkSub = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    }

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
      linkSub?.remove();
    };
  }, [hydrate]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) return { error: friendlyAuthError(error.message) };
    return {};
  }, []);

  const signInWithGoogle = useCallback(async () => {
    return signInWithGoogleOAuth();
  }, []);

  const signUpWorker = useCallback(async (input: WorkerSignUpInput) => {
    const fullName = input.fullName.trim();
    const phone = input.phone.trim();
    const emailRedirectTo = workerSignupConfirmRedirectTo();
    const { data, error } = await supabase.auth.signUp({
      email: input.email.trim().toLowerCase(),
      password: input.password,
      options: {
        emailRedirectTo,
        data: {
          full_name: fullName,
          phone,
          worker_role: input.workerRole,
          bio: input.bio?.trim() || null,
        },
      },
    });

    const outcome = classifyWorkerSignUpResponse({
      errorMessage: error ? friendlyAuthError(error.message) : null,
      hasUser: Boolean(data.user),
      hasSession: Boolean(data.session),
      identitiesCount: data.user?.identities?.length ?? null,
    });

    if (outcome.kind === 'error') {
      return { error: outcome.message };
    }
    if (outcome.kind === 'existing_account') {
      return { existingAccount: true, error: workerExistingAccountMessage() };
    }

    const userId = data.session?.user?.id ?? data.user?.id;
    if (userId && data.session) {
      await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          phone,
        })
        .eq('id', userId);

      const { error: workerError } = await supabase.from('worker_profiles').insert({
        user_id: userId,
        worker_role: input.workerRole,
        bio: input.bio?.trim() || null,
        onboarding_status: 'in_progress',
      });

      if (workerError) {
        const lower = workerError.message.toLowerCase();
        if (!lower.includes('duplicate') && !lower.includes('unique')) {
          return { error: workerError.message };
        }
      }
    }

    if (outcome.kind === 'needs_email_confirm') {
      return { needsEmailConfirm: true };
    }
    return {};
  }, []);

  const resendSignupConfirmation = useCallback(async (email: string) => {
    const normalized = email.trim().toLowerCase();
    if (!normalized || !normalized.includes('@')) {
      return { error: 'Enter a valid email address to resend confirmation.' };
    }
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: normalized,
      options: {
        emailRedirectTo: workerSignupConfirmRedirectTo(),
      },
    });
    if (error) return { error: friendlyAuthError(error.message) };
    return {};
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: workerRecoveryRedirectTo(),
    });
    if (error) return { error: friendlyAuthError(error.message) };
    return {};
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    if (password.length < 6) {
      return { error: 'Password must be at least 6 characters.' };
    }
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return { error: friendlyAuthError(error.message) };
    return {};
  }, []);

  const completeWorkerRoleSetup = useCallback(
    async (input: { workerRole: WorkerRole; fullName: string; phone: string }) => {
      if (!session?.user) return { error: 'Not signed in' };
      const fullName = input.fullName.trim();
      const phone = input.phone.trim();
      if (!fullName) return { error: 'Enter your full name.' };
      if (phone.replace(/\D/g, '').length < 8) {
        return { error: 'Enter a valid phone number including country code.' };
      }

      await supabase
        .from('profiles')
        .update({ full_name: fullName, phone })
        .eq('id', session.user.id);

      await supabase.auth.updateUser({
        data: {
          full_name: fullName,
          phone,
          worker_role: input.workerRole,
        },
      });

      const { data, error } = await supabase.rpc('ensure_my_worker_profile', {
        p_worker_role: input.workerRole,
        p_bio: null,
      });

      if (error) {
        // Fallback when 024 is not on hosted yet.
        const { error: insertError } = await supabase.from('worker_profiles').insert({
          user_id: session.user.id,
          worker_role: input.workerRole,
          onboarding_status: 'in_progress',
        });
        if (insertError) {
          const lower = insertError.message.toLowerCase();
          if (!lower.includes('duplicate') && !lower.includes('unique')) {
            return { error: insertError.message };
          }
        }
      } else if (data) {
        setWorkerProfile(data as WorkerProfile);
      }

      await hydrate(session);
      return {};
    },
    [session, hydrate],
  );

  const submitForReview = useCallback(async () => {
    if (!session?.user) return { error: 'Not signed in' };

    const { data, error } = await supabase.rpc('submit_worker_verification_package');
    if (error) {
      return { error: friendlyRpcError(error.message) };
    }

    if (data) {
      setWorkerProfile(data as WorkerProfile);
    } else {
      await hydrate(session);
    }
    return {};
  }, [session, hydrate]);

  const signOut = useCallback(async () => {
    clearAvatarUrlCache();
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    setWorkerProfile(null);
    setAccountRejectionReason(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!session?.user) return;
    await hydrate(session);
  }, [session, hydrate]);

  const isVerified = workerProfile?.verification_status === 'verified';
  const isWorker = Boolean(workerProfile);
  const homeRoute = homeRouteForWorker({
    hasSession: Boolean(session),
    workerProfile,
    accountRejectionReason,
  });
  const firstName = firstNameFromFullName(profile?.full_name);
  const roleLabel = workerProfile?.worker_role
    ? WORKER_ROLE_LABELS[workerProfile.worker_role]
    : 'Worker';

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      workerProfile,
      loading,
      isVerified,
      isWorker,
      accountRejectionReason,
      homeRoute,
      firstName,
      roleLabel,
      signIn,
      signInWithGoogle,
      signUpWorker,
      resendSignupConfirmation,
      resetPassword,
      updatePassword,
      completeWorkerRoleSetup,
      submitForReview,
      signOut,
      refreshProfile,
    }),
    [
      session,
      profile,
      workerProfile,
      loading,
      isVerified,
      isWorker,
      accountRejectionReason,
      homeRoute,
      firstName,
      roleLabel,
      signIn,
      signInWithGoogle,
      signUpWorker,
      resendSignupConfirmation,
      resetPassword,
      updatePassword,
      completeWorkerRoleSetup,
      submitForReview,
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
