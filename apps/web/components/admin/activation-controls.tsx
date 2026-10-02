'use client';

import { useActionState } from 'react';

import {
  diagnoseOrganizationActivationRedirectAction,
  replaceOrganizationAdminInviteAction,
  resendOrganizationActivationAction,
} from '@/app/actions/admin-organizations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function ResendActivationButton({
  invitationId,
  organizationId,
  lastSentAt,
}: {
  invitationId: string;
  organizationId: string;
  lastSentAt?: string | null;
}) {
  const [state, action, pending] = useActionState(
    resendOrganizationActivationAction,
    {},
  );

  const sentLabel = formatSentAt(lastSentAt);
  const redirectTo =
    state.data &&
    typeof state.data === 'object' &&
    'activation_redirect_to' in state.data &&
    typeof (state.data as { activation_redirect_to?: unknown }).activation_redirect_to ===
      'string'
      ? (state.data as { activation_redirect_to: string }).activation_redirect_to
      : null;

  return (
    <div className="space-y-1">
      <form action={action} className="inline">
        <input type="hidden" name="invitationId" value={invitationId} />
        <input type="hidden" name="organizationId" value={organizationId} />
        <Button type="submit" size="sm" variant="secondary" disabled={pending}>
          {pending ? 'Sending…' : 'Resend activation email'}
        </Button>
      </form>
      {state.error ? (
        <p className="text-xs text-red-700">{state.error}</p>
      ) : null}
      {state.success ? (
        <div className="text-xs text-green-800">
          <p>
            Activation email sent
            {formatSentAt(new Date().toISOString())
              ? ` at ${formatSentAt(new Date().toISOString())}`
              : ''}
            .
          </p>
          <p className="mt-0.5 text-bh-text-secondary">
            Use the newest email. Previous activation emails are no longer valid.
          </p>
          {redirectTo ? (
            <p className="mt-0.5 break-all font-mono text-[11px] text-bh-text-secondary">
              redirectTo: {redirectTo}
            </p>
          ) : null}
        </div>
      ) : sentLabel ? (
        <p className="text-xs text-bh-text-secondary">
          Activation email sent at {sentLabel}. Use the newest email. Previous
          activation emails are no longer valid.
        </p>
      ) : null}
    </div>
  );
}

/** Shows the Auth redirectTo this deployment would send — no email, no tokens. */
export function CheckActivationRedirectButton() {
  const [state, action, pending] = useActionState(
    diagnoseOrganizationActivationRedirectAction,
    {},
  );

  const data =
    state.data && typeof state.data === 'object'
      ? (state.data as {
          redirectTo?: string;
          source?: string;
          isLoopback?: boolean;
        })
      : null;

  return (
    <div className="space-y-1">
      <form action={action}>
        <Button type="submit" size="sm" variant="outline" disabled={pending}>
          {pending ? 'Checking…' : 'Check activation redirect'}
        </Button>
      </form>
      {state.error ? (
        <p className="text-xs text-red-700">{state.error}</p>
      ) : null}
      {data?.redirectTo ? (
        <div className="text-xs text-bh-text-secondary">
          <p className="break-all font-mono text-[11px]">{data.redirectTo}</p>
          <p className="mt-0.5">
            source={data.source ?? 'unknown'}
            {data.isLoopback ? ' · loopback (do not send)' : ''}
          </p>
        </div>
      ) : null}
    </div>
  );
}

function formatSentAt(iso: string | null | undefined): string | null {
  if (!iso) return null;
  try {
    return new Intl.DateTimeFormat(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date(iso));
  } catch {
    return null;
  }
}

export function ReplaceAdminInviteForm({
  invitationId,
  organizationId,
}: {
  invitationId?: string;
  organizationId: string;
}) {
  const [state, action, pending] = useActionState(
    replaceOrganizationAdminInviteAction,
    {},
  );

  return (
    <form action={action} className="space-y-2 rounded-md border border-slate-200 p-3">
      <p className="text-sm font-medium text-slate-800">
        Replace invited administrator email
      </p>
      <p className="text-xs text-slate-500">
        Revokes the current open invitation and issues a new activation email.
      </p>
      {invitationId ? (
        <input type="hidden" name="invitationId" value={invitationId} />
      ) : null}
      <input type="hidden" name="organizationId" value={organizationId} />
      <Input name="adminFullName" placeholder="Full name (optional)" />
      <Input name="email" type="email" required placeholder="New admin email" />
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? 'Replacing…' : 'Revoke and reissue'}
      </Button>
      {state.error ? (
        <p className="text-xs text-red-700">{state.error}</p>
      ) : null}
      {state.success ? (
        <div className="text-xs text-green-800">
          <p>Activation email sent.</p>
          <p className="mt-0.5 text-bh-text-secondary">
            Use the newest email. Previous activation emails are no longer valid.
          </p>
        </div>
      ) : null}
    </form>
  );
}
