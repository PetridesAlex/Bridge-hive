'use client';

import { ArrowRight, Loader2 } from 'lucide-react';
import { useActionState, useEffect, useRef } from 'react';

import {
  confirmActivationAction,
  type ConfirmActivationState,
} from '@/app/(app)/auth/confirm/actions';
import { secureAuthPrimaryClass } from '@/components/auth/secure-auth-shell';

const initial: ConfirmActivationState = {};

export function ConfirmActivationForm({
  tokenHash,
  type,
  next,
  submitLabel = 'Continue activation',
}: {
  tokenHash: string;
  type: string;
  next: string;
  submitLabel?: string;
}) {
  const [state, formAction, pending] = useActionState(
    confirmActivationAction,
    initial,
  );
  const submitted = useRef(false);

  useEffect(() => {
    if (pending) submitted.current = true;
  }, [pending]);

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (pending || submitted.current) {
          e.preventDefault();
        }
      }}
      className="mt-8"
    >
      <input type="hidden" name="token_hash" value={tokenHash} />
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="next" value={next} />
      <button
        type="submit"
        disabled={pending}
        className={secureAuthPrimaryClass}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition duration-700 group-hover:translate-x-full"
        />
        {pending ? (
          <Loader2 className="relative h-4 w-4 animate-spin" aria-hidden />
        ) : null}
        <span className="relative">{pending ? 'Continuing…' : submitLabel}</span>
        {!pending ? (
          <span
            aria-hidden
            className="relative inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/15 transition duration-300 group-hover:translate-x-0.5 group-hover:bg-bh-honey group-hover:text-bh-sidebar"
          >
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
        ) : null}
      </button>
      {state.error ? (
        <p
          className="mt-3 rounded-xl border border-bh-danger/30 bg-bh-danger-soft px-3.5 py-2.5 text-sm font-medium text-bh-danger"
          role="alert"
        >
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
