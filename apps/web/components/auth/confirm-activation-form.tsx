'use client';

import { useActionState, useEffect, useRef } from 'react';

import {
  confirmActivationAction,
  type ConfirmActivationState,
} from '@/app/auth/confirm/actions';
import { Button } from '@/components/ui/button';

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
      className="space-y-3"
    >
      <input type="hidden" name="token_hash" value={tokenHash} />
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="next" value={next} />
      <Button
        type="submit"
        className="w-full min-h-11"
        size="lg"
        disabled={pending}
        aria-busy={pending}
      >
        {pending ? 'Continuing…' : submitLabel}
      </Button>
      {state.error ? (
        <p className="text-sm text-bh-danger" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
