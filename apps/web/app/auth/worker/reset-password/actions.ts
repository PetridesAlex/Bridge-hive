'use server';

import {
  WORKER_RECOVERY_SESSION_COOKIE,
  friendlyWorkerPasswordUpdateError,
  validateWorkerRecoveryPassword,
} from '@bridge-hive/domain';
import { cookies } from 'next/headers';

import { createClient } from '@/lib/supabase/server';

export type UpdateWorkerRecoveryPasswordState = {
  error?: string;
  done?: boolean;
};

/**
 * Explicit POST-only password update after /auth/confirm recovery.
 * Requires a non-secret recovery marker cookie plus an authenticated session.
 * Never logs passwords or session tokens.
 */
export async function updateWorkerRecoveryPasswordAction(
  _prev: UpdateWorkerRecoveryPasswordState,
  formData: FormData,
): Promise<UpdateWorkerRecoveryPasswordState> {
  const password = String(formData.get('password') ?? '');
  const confirm = String(formData.get('confirm') ?? '');

  const policy = validateWorkerRecoveryPassword({ password, confirm });
  if (!policy.ok) {
    return { error: policy.error };
  }

  const store = await cookies();
  const recoveryMarker = store.get(WORKER_RECOVERY_SESSION_COOKIE)?.value;
  if (recoveryMarker !== '1') {
    return {
      error: 'This reset link is no longer valid. Request a new password reset email.',
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      error: 'This reset link is no longer valid. Request a new password reset email.',
    };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { error: friendlyWorkerPasswordUpdateError(error.message) };
  }

  store.set(WORKER_RECOVERY_SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/auth/worker/reset-password',
    maxAge: 0,
  });

  await supabase.auth.signOut();

  return { done: true };
}
