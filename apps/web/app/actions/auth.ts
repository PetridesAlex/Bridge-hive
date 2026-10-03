'use server';

import { redirect } from 'next/navigation';

import { safeOrgNext } from '@/lib/auth-redirect';
import { createClient } from '@/lib/supabase/server';

export type ActionResult = {
  error?: string;
};

export async function signInAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const email = String(formData.get('email') ?? '')
    .trim()
    .toLowerCase();
  const password = String(formData.get('password') ?? '');
  const next = safeOrgNext(String(formData.get('next') ?? '/dashboard'));

  if (!email || !password) {
    return { error: 'Email and password are required.' };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      return { error: error.message };
    }
  } catch {
    return { error: 'Could not sign in. Please try again.' };
  }

  redirect(next);
}

export async function signUpAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const email = String(formData.get('email') ?? '')
    .trim()
    .toLowerCase();
  const password = String(formData.get('password') ?? '');
  const next = safeOrgNext(String(formData.get('next') ?? '/dashboard'));

  const hasInvitationContext =
    next.includes('/organization-invitations/accept') ||
    next.includes('/activate-organization-account');

  if (!hasInvitationContext) {
    return {
      error:
        'Organization invitation required. Hospital accounts are created by Bridge Hive.',
    };
  }

  if (!email || !password) {
    return { error: 'Email and password are required.' };
  }

  if (password.length < 8) {
    return { error: 'Password must be at least 8 characters.' };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signUp({ email, password });

    if (error) {
      return { error: error.message };
    }
  } catch {
    return { error: 'Could not create the account. Please try again.' };
  }

  redirect(next);
}

export async function signOutAction(): Promise<void> {
  try {
    const supabase = await createClient();
    // Clear the browser session cookies; always leave the app afterward.
    await supabase.auth.signOut({ scope: 'global' });
  } catch {
    // Cookie/session teardown can fail if the session is already gone.
    // Still send the user to sign-in so the UI recovers cleanly.
  }
  redirect('/sign-in');
}
