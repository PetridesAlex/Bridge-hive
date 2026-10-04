'use client';

import { ArrowRight, Mail } from 'lucide-react';
import { useActionState } from 'react';

import { signInAction, type ActionResult } from '@/app/actions/auth';
import { AuthPasswordField } from '@/components/auth/AuthPasswordField';

const initialState: ActionResult = {};

export function SignInForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(signInAction, initialState);

  return (
    <form action={formAction} className="auth-form">
      <input type="hidden" name="next" value={next} />

      <div className="auth-field auth-field-delay-1">
        <label htmlFor="org-sign-in-email">Work email</label>
        <div className="auth-field-input">
          <Mail className="auth-field-icon" size={16} strokeWidth={1.75} aria-hidden="true" />
          <input
            id="org-sign-in-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="Enter your email address"
          />
        </div>
      </div>

      <div className="auth-field-delay-2">
        <AuthPasswordField id="org-sign-in-password" />
      </div>

      {state.error ? (
        <p className="auth-error" role="alert">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="auth-submit auth-field-delay-3"
      >
        {pending ? (
          <span className="auth-submit-pending">
            <span className="auth-submit-spinner" aria-hidden="true" />
            Signing in…
          </span>
        ) : (
          <>
            Continue to workspace
            <ArrowRight size={17} strokeWidth={2} aria-hidden="true" />
          </>
        )}
      </button>
    </form>
  );
}
