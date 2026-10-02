'use client';

import { useActionState } from 'react';

import {
  signInPlatformAdminAction,
  type AdminActionResult,
} from '@/app/actions/admin';
import { AuthPasswordField } from '@/components/auth/AuthPasswordField';

const initialState: AdminActionResult = {};

export function AdminSignInForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(
    signInPlatformAdminAction,
    initialState,
  );

  return (
    <form action={formAction} className="flex w-full flex-col gap-4">
      <input type="hidden" name="next" value={next} />

      <div className="auth-field">
        <label htmlFor="admin-sign-in-email">Email</label>
        <input
          id="admin-sign-in-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder=" "
        />
      </div>

      <AuthPasswordField id="admin-sign-in-password" />

      {state.error ? (
        <p className="auth-error" role="alert">
          {state.error}
        </p>
      ) : null}

      <button type="submit" disabled={pending} className="auth-submit">
        {pending ? 'Signing in…' : 'Sign in to admin'}
      </button>
    </form>
  );
}
