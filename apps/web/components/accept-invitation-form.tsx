'use client';

import { useActionState } from 'react';

import { acceptOrganizationInvitationAction } from '@/app/actions/organization-onboarding';
import { Button } from '@/components/ui/button';

export function AcceptInvitationForm({ token }: { token: string }) {
  const [state, formAction, isPending] = useActionState(
    acceptOrganizationInvitationAction,
    {},
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="rawToken" value={token} />
      <p className="text-sm text-slate-600">
        Accept this invitation to join the organization and access the dashboard.
      </p>
      {state.error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900">
          {state.error}
        </div>
      ) : null}
      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? 'Accepting...' : 'Accept invitation'}
      </Button>
    </form>
  );
}
