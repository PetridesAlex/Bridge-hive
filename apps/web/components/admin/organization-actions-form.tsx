'use client';

import { useActionState, useState } from 'react';

import {
  approveOrganizationAction,
  reactivateOrganizationAction,
  rejectOrganizationAction,
  revokeOrganizationInvitationAction,
  suspendOrganizationAction,
} from '@/app/actions/admin-organizations';
import { Button } from '@/components/ui/button';

type ActionType = 'approve' | 'reject' | 'suspend' | 'reactivate' | 'revoke_invitation';

function getAction(actionType: ActionType) {
  switch (actionType) {
    case 'approve':
      return approveOrganizationAction;
    case 'reject':
      return rejectOrganizationAction;
    case 'suspend':
      return suspendOrganizationAction;
    case 'reactivate':
      return reactivateOrganizationAction;
    case 'revoke_invitation':
      return revokeOrganizationInvitationAction;
  }
}

export function OrganizationActionsForm({
  action,
  organizationId,
  invitationId,
  buttonText,
  requiresReason,
}: {
  action: ActionType;
  organizationId?: string;
  invitationId?: string;
  buttonText: string;
  requiresReason?: boolean;
}) {
  const [showForm, setShowForm] = useState(false);
  const [state, formAction, isPending] = useActionState(getAction(action), {});

  if (requiresReason && !showForm) {
    return (
      <Button variant="outline" size="sm" onClick={() => setShowForm(true)}>
        {buttonText}
      </Button>
    );
  }

  return (
    <form action={formAction} className="inline-flex flex-col gap-2">
      {organizationId ? (
        <input type="hidden" name="organizationId" value={organizationId} />
      ) : null}
      {invitationId ? (
        <input type="hidden" name="invitationId" value={invitationId} />
      ) : null}
      {requiresReason && showForm ? (
        <div className="flex flex-col gap-2">
          <textarea
            name="reason"
            required
            maxLength={2000}
            rows={3}
            placeholder="Enter reason..."
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending ? 'Processing...' : 'Confirm'}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button type="submit" variant="outline" size="sm" disabled={isPending}>
          {isPending ? 'Processing...' : buttonText}
        </Button>
      )}
      {state.error ? (
        <p className="text-sm text-red-600">{state.error}</p>
      ) : null}
    </form>
  );
}
