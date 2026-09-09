import type { Session, User } from '@supabase/supabase-js';
import type { Tables } from '@bridge-hive/supabase-types';
import type { WorkerRole } from '@bridge-hive/domain';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { WORKER_ROLE_LABELS } from '@/constants/config';
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
  signUpWorker: (
    input: WorkerSignUpInput,
  ) => Promise<{ error?: string; needsEmailConfirm?: boolean }>;
  resetPassword: (email: string) => Promise<{ error?: string }>;
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
  if (!params.workerProfile) return '/auth/worker/pending';
  if (params.workerProfile.verification_status === 'verified') return '/(tabs)';
  return '/auth/worker/pending';
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

  const { data: workerProfile } = await supabase
    .from('worker_profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (workerProfile) {
    return { profile, workerProfile, accountRejectionReason: null };
  }

  // Reject organization accounts from the worker-only app.
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

  return { profile, workerProfile: null, accountRejectionReason: null };
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

  const signUpWorker = useCallback(async (input: WorkerSignUpInput) => {
    const fullName = input.fullName.trim();
    const { data, error } = await supabase.auth.signUp({
      email: input.email.trim().toLowerCase(),
      password: input.password,
      options: {
        data: {
          full_name: fullName,
          phone: input.phone.trim(),
          worker_role: input.workerRole,
        },
      },
    });

    if (error) return { error: error.message };

    const userId = data.session?.user?.id ?? data.user?.id;
    if (userId && data.session) {
      await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          phone: input.phone.trim(),
        })
        .eq('id', userId);

      const { error: workerError } = await supabase.from('worker_profiles').insert({
        user_id: userId,
        worker_role: input.workerRole,
        bio: input.bio?.trim() || null,
        onboarding_status: 'in_progress',
        // verification_status defaults to 'draft' — workers cannot self-verify
      });

      if (workerError) return { error: workerError.message };
    }

    return { needsEmailConfirm: Boolean(data.user) && !data.session };
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase());
    if (error) return { error: error.message };
    return {};
  }, []);

  const submitForReview = useCallback(async () => {
    if (!session?.user) return { error: 'Not signed in' };
    // Workers cannot change verification_status (platform RPC only).
    // Mark onboarding complete so the pending screen can show "awaiting review".
    const { error } = await supabase
      .from('worker_profiles')
      .update({
        onboarding_status: 'completed',
      })
      .eq('user_id', session.user.id);

    if (error) return { error: error.message };
    await hydrate(session);
    return {};
  }, [session, hydrate]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
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
      signUpWorker,
      resetPassword,
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
      signUpWorker,
      resetPassword,
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
