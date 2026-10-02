'use server';

import {
  ORG_INVITATION_COOKIE,
  friendlyInvitationError,
  safeAppPath,
} from '@bridge-hive/domain';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';

export type ActivateActionResult = {
  error?: string;
  success?: boolean;
  slug?: string;
  displayName?: string;
};

function cookieInvitationId(store: Awaited<ReturnType<typeof cookies>>): string | null {
  const value = store.get(ORG_INVITATION_COOKIE)?.value;
  if (!value) return null;
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  ) {
    return null;
  }
  return value;
}

export async function clearOrganizationInvitationCookie(): Promise<void> {
  const store = await cookies();
  store.set(ORG_INVITATION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
}

export async function activateOrganizationAccountAction(
  _prev: ActivateActionResult,
  formData: FormData,
): Promise<ActivateActionResult> {
  const password = String(formData.get('password') ?? '');
  const confirm = String(formData.get('confirmPassword') ?? '');

  if (password.length < 8) {
    return { error: 'Password must be at least 8 characters.' };
  }
  if (password !== confirm) {
    return { error: 'Passwords do not match.' };
  }

  const store = await cookies();
  const invitationId = cookieInvitationId(store);
  if (!invitationId) {
    return {
      error:
        'Your activation session expired. Open the link from your email again.',
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Please sign in with the invited email to continue.' };
  }

  const { error: passwordError } = await supabase.auth.updateUser({ password });
  if (passwordError) {
    return {
      error:
        passwordError.message.includes('same')
          ? 'Choose a new password that you have not used before.'
          : 'Unable to set your password. Please try again.',
    };
  }

  const { data, error } = await supabase.rpc('accept_organization_invitation_by_id', {
    p_invitation_id: invitationId,
  });

  if (error) {
    return { error: friendlyInvitationError(error.message) };
  }

  const payload = data as {
    slug?: string;
    display_name?: string;
  } | null;

  await clearOrganizationInvitationCookie();

  return {
    success: true,
    slug: payload?.slug,
    displayName: payload?.display_name,
  };
}

export async function signOutForActivationMismatchAction(): Promise<void> {
  const supabase = await createClient();
  try {
    await supabase.auth.signOut({ scope: 'global' });
  } catch {
    // always continue
  }
  await clearOrganizationInvitationCookie();
  redirect('/sign-in?next=/activate-organization-account');
}

export async function completeActivationRedirectAction(
  slug: string,
): Promise<void> {
  const path = safeAppPath(`/org/${slug}/settings`, '/dashboard');
  redirect(path);
}
