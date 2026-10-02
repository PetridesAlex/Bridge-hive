'use client';

import { useActionState } from 'react';

import { signInAction, type ActionResult } from '@/app/actions/auth';
import { AuthPasswordField } from '@/components/auth/AuthPasswordField';

const initialState: ActionResult = {};

export function SignInForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(signInAction, initialState);

  return (
    <form action={formAction} className="flex w-full flex-col gap-4">
      <input type="hidden" name="next" value={next} />

      <div className="auth-field">
        <label htmlFor="org-sign-in-email">Email</label>
        <input
          id="org-sign-in-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder=" "
        />
      </div>

      <AuthPasswordField id="org-sign-in-password" />

      {state.error ? (
        <p className="auth-error" role="alert">
          {state.error}
        </p>
      ) : null}

      <button type="submit" disabled={pending} className="auth-submit">
        {pending ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
