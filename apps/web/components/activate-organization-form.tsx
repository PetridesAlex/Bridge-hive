'use client';

import {
  activateOrganizationAccountAction,
  type ActivateActionResult,
} from '@/app/actions/organization-activation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { useActionState, useEffect, useState } from 'react';

const initial: ActivateActionResult = {};

export function ActivateOrganizationForm() {
  const [state, formAction, pending] = useActionState(
    activateOrganizationAccountAction,
    initial,
  );
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (state.success && state.slug) {
      setDone(true);
    }
  }, [state]);

  if (done && state.slug) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-bh-success/30 bg-bh-success-soft/40 p-4">
          <p className="font-semibold text-bh-text">Your account is ready</p>
          <p className="mt-1 text-sm text-bh-text-secondary">
            Continue to organization setup for{' '}
            {state.displayName ?? 'your organization'}.
          </p>
        </div>
        <Button asChild variant="honey" className="w-full">
          <Link href={`/org/${state.slug}/settings`}>
            Continue to organization setup
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      {state.error ? (
        <p className="rounded-xl border border-bh-danger/30 bg-bh-danger-soft/40 px-3 py-2 text-sm text-bh-text" role="alert">
          {state.error}
        </p>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="password">New password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm password</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
        />
      </div>
      <ul className="list-disc space-y-1 pl-5 text-xs text-bh-text-muted">
        <li>At least 8 characters</li>
        <li>Use a unique password you do not share with anyone</li>
        <li>Bridge Hive staff will never ask for this password</li>
      </ul>
      <Button type="submit" variant="honey" className="w-full" disabled={pending}>
        {pending ? 'Activating…' : 'Activate account'}
      </Button>
    </form>
  );
}
