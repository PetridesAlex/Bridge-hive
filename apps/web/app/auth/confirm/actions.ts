'use server';

import {
  DEFAULT_ACTIVATION_NEXT,
  ORG_INVITATION_COOKIE,
  allowlistedActivationNext,
  isAuthConfirmEmailOtpType,
  isWorkerSignupConfirmNext,
  readInvitationIdFromAuthMeta,
} from '@bridge-hive/domain';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';

export type ConfirmActivationState = {
  error?: string;
};

function errorRedirect(code: string): never {
  redirect(`/auth/error?error_code=${encodeURIComponent(code)}`);
}

/**
 * Explicit user POST only — never call from GET.
 * Verifies token_hash exactly once via Supabase Auth OTP verification.
 * Accepts invite/recovery for org activation, and signup only when next is a
 * worker confirm path (never org activation).
 */
export async function confirmActivationAction(
  _prev: ConfirmActivationState,
  formData: FormData,
): Promise<ConfirmActivationState> {
  const tokenHash = String(formData.get('token_hash') ?? '').trim();
  const typeRaw = String(formData.get('type') ?? '').trim();
  const next = allowlistedActivationNext(String(formData.get('next') ?? ''));

  if (!tokenHash) {
    errorRedirect('otp_expired');
  }

  if (!isAuthConfirmEmailOtpType(typeRaw, next)) {
    errorRedirect('access_denied');
  }

  // Signup OTP must never land on organization activation.
  if (typeRaw === 'signup' && !isWorkerSignupConfirmNext(next)) {
    errorRedirect('access_denied');
  }

  const store = await cookies();
  const existingInvitation = store.get(ORG_INVITATION_COOKIE)?.value;
  const supabase = await createClient();
  const {
    data: { user: existingUser },
  } = await supabase.auth.getUser();

  // Idempotent: already verified in this browser with continuation cookie.
  if (
    existingUser &&
    existingInvitation &&
    next === DEFAULT_ACTIVATION_NEXT
  ) {
    redirect(next);
  }

  const { data, error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: typeRaw as 'invite' | 'recovery' | 'signup',
  });

  if (error || !data.user) {
    const msg = (error?.message ?? '').toLowerCase();
    if (msg.includes('expired') || msg.includes('invalid') || msg.includes('otp')) {
      errorRedirect('otp_expired');
    }
    errorRedirect('access_denied');
  }

  const invitationId = readInvitationIdFromAuthMeta(data.user);
  if (invitationId) {
    store.set(ORG_INVITATION_COOKIE, invitationId, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 30,
    });
  }

  redirect(next);
}
