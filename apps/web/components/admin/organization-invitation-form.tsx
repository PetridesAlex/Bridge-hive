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
  const [result, setResult] = useState<{
    raw_token?: string;
    delivery_status?: string;
    local_dev_link_only?: boolean;
  } | null>(null);

  useEffect(() => {
    if (state.success && state.data) {
      setResult(state.data as typeof result);
      setShowForm(false);
    }
  }, [state]);

  if (result) {
    const invitationUrl =
      result.local_dev_link_only && result.raw_token
        ? `${window.location.origin}/organization-invitations/accept?token=${result.raw_token}`
        : null;
    return (
      <div className="space-y-3 rounded-xl border border-bh-border bg-bh-subtle/60 p-4">
        <p className="text-sm font-semibold text-bh-text">
          {result.delivery_status === 'sent'
            ? 'Activation email sent'
            : 'Invitation created'}
        </p>
        {state.error ? (
          <p className="text-sm text-amber-800">{state.error}</p>
        ) : null}
        {invitationUrl ? (
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-bh-text-muted">
              Local development link (shown once)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={invitationUrl}
                readOnly
                className="h-10 flex-1 rounded-xl border border-bh-border bg-white px-3 font-mono text-xs"
              />
              <Button
                type="button"
                variant="secondary"
                className="h-10 rounded-full px-4"
                onClick={() => navigator.clipboard.writeText(invitationUrl)}
              >
                Copy
              </Button>
            </div>
          </div>
        ) : null}
        <Button className="h-10 rounded-full px-4" onClick={() => setResult(null)}>
          Close
        </Button>
      </div>
    );
  }

  if (!showForm) {
    return (
      <Button
        variant="outline"
        className="h-10 rounded-full px-4"
        onClick={() => setShowForm(true)}
      >
        Send invitation
      </Button>
    );
  }

  return (
    <form
      action={formAction}
      className="space-y-3 rounded-xl border border-bh-border bg-bh-subtle/50 p-4"
    >
      <input type="hidden" name="organizationId" value={organizationId} />
      <div className="grid gap-3">
        <label className="text-sm">
          <span className="mb-1.5 block text-sm font-medium text-bh-text">
            Email <span className="text-bh-danger">*</span>
          </span>
          <input
            type="email"
            name="email"
            required
            className="h-11 w-full rounded-xl border border-bh-border bg-white px-3 text-sm outline-none focus-visible:border-bh-sidebar focus-visible:ring-2 focus-visible:ring-bh-honey/40"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1.5 block text-sm font-medium text-bh-text">Role</span>
          <select
            name="role"
            defaultValue="org_admin"
            className="h-11 w-full rounded-xl border border-bh-border bg-white px-3 text-sm outline-none focus-visible:border-bh-sidebar focus-visible:ring-2 focus-visible:ring-bh-honey/40"
          >
            <option value="org_admin">Organization Admin</option>
            <option value="org_scheduler">Scheduler</option>
            <option value="org_billing">Billing</option>
          </select>
        </label>
      </div>
      {state.error ? (
        <p className="text-sm text-bh-danger">{state.error}</p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" className="h-10 rounded-full px-4" disabled={isPending}>
          {isPending ? 'Sending…' : 'Send activation email'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="h-10 rounded-full px-4"
          onClick={() => setShowForm(false)}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
