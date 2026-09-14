'use client';

import { useActionState, useEffect, useState } from 'react';

import { createOrganizationInvitationAction } from '@/app/actions/admin-organizations';
import { Button } from '@/components/ui/button';

export function OrganizationInvitationForm({
  organizationId,
}: {
  organizationId: string;
}) {
  const [showForm, setShowForm] = useState(false);
  const [state, formAction, isPending] = useActionState(
    createOrganizationInvitationAction,
    {},
  );
  const [invitationToken, setInvitationToken] = useState<string | null>(null);

  useEffect(() => {
    if (state.success && state.data) {
      const data = state.data as { raw_token: string };
      setInvitationToken(data.raw_token);
    }
  }, [state]);

  if (invitationToken) {
    const invitationUrl = `${window.location.origin}/organization-invitations/accept?token=${invitationToken}`;
    return (
      <div className="space-y-3 rounded-lg border border-green-200 bg-green-50 p-4">
        <p className="font-medium text-green-900">Invitation created!</p>
        <div>
          <label className="mb-1 block text-sm font-medium text-green-900">
            Local development link (shown once)
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={invitationUrl}
              readOnly
              className="flex-1 rounded-md border border-green-300 bg-white px-2 py-1 text-sm font-mono"
            />
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => {
                navigator.clipboard.writeText(invitationUrl);
              }}
            >
              Copy
            </Button>
          </div>
        </div>
        <Button size="sm" onClick={() => setInvitationToken(null)}>
          Close
        </Button>
      </div>
    );
  }

  if (!showForm) {
    return (
      <Button variant="outline" size="sm" onClick={() => setShowForm(true)}>
        Send invitation
      </Button>
    );
  }

  return (
    <form action={formAction} className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
      <input type="hidden" name="organizationId" value={organizationId} />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-700">
            Email <span className="text-red-500">*</span>
          </span>
          <input
            type="email"
            name="email"
            required
            className="w-full rounded-md border border-slate-300 px-3 py-2"
            placeholder="user@example.com"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-700">
            Role <span className="text-red-500">*</span>
          </span>
          <select
            name="role"
            required
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          >
            <option value="">Select role</option>
            <option value="org_admin">Admin</option>
            <option value="org_scheduler">Scheduler</option>
            <option value="org_billing">Billing</option>
          </select>
        </label>
      </div>
      {state.error ? (
        <p className="text-sm text-red-600">{state.error}</p>
      ) : null}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? 'Sending...' : 'Send invitation'}
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
    </form>
  );
}
