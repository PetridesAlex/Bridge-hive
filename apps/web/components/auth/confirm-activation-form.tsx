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
      className="mt-8"
    >
      <input type="hidden" name="token_hash" value={tokenHash} />
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="next" value={next} />
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? 'Continuing…' : submitLabel}
      </Button>
      {state.error ? (
        <p className="mt-3 text-sm text-red-700">{state.error}</p>
      ) : null}
    </form>
  );
}
