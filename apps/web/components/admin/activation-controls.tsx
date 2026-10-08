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
    <div className="space-y-2 sm:max-w-xs sm:text-right">
      <form action={action}>
        <input type="hidden" name="invitationId" value={invitationId} />
        <input type="hidden" name="organizationId" value={organizationId} />
        <Button type="submit" className="h-10 w-full rounded-full px-4 sm:w-auto" disabled={pending}>
          {pending ? 'Sending…' : 'Resend activation email'}
        </Button>
      </form>
      {state.error ? (
        <p className="text-xs text-bh-danger">{state.error}</p>
      ) : null}
      {state.success ? (
        <div className="rounded-xl border border-bh-border bg-bh-subtle/70 px-3 py-2 text-left text-xs text-bh-text">
          <p className="font-semibold">
            Activation email sent
            {formatSentAt(new Date().toISOString())
              ? ` at ${formatSentAt(new Date().toISOString())}`
              : ''}
            .
          </p>
          <p className="mt-1 text-bh-text-secondary">
            Use the newest email. Previous activation emails are no longer valid.
          </p>
          {redirectTo ? (
            <p className="mt-1 break-all font-mono text-[11px] text-bh-text-secondary">
              {redirectTo}
            </p>
          ) : null}
        </div>
      ) : sentLabel ? (
        <p className="text-left text-xs leading-5 text-bh-text-secondary sm:text-right">
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
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-bh-text-muted">
          Delivery check
        </p>
        <p className="mt-0.5 text-xs text-bh-text-secondary">
          Shows the activation address this deployment would use. No email is sent.
        </p>
      </div>
      <form action={action} className="shrink-0">
        <Button
          type="submit"
          variant="outline"
          className="h-10 rounded-full px-4"
          disabled={pending}
        >
          {pending ? 'Checking…' : 'Check activation redirect'}
        </Button>
      </form>
      {state.error ? (
        <p className="text-xs text-bh-danger sm:basis-full">{state.error}</p>
      ) : null}
      {data?.redirectTo ? (
        <div className="text-xs text-bh-text-secondary sm:basis-full">
          <p className="break-all rounded-lg border border-bh-border bg-white px-3 py-2 font-mono text-[11px] text-bh-text">
            {data.redirectTo}
          </p>
          <p className="mt-1">
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
    <form
      action={action}
      className="space-y-3 rounded-2xl border border-bh-border bg-bh-surface p-4 shadow-[0_4px_16px_rgba(7,29,48,0.04)]"
    >
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-bh-honey-strong">
          Replace
        </p>
        <p className="mt-1 text-sm font-semibold text-bh-text">
          Replace invited administrator email
        </p>
        <p className="mt-1 text-xs leading-5 text-bh-text-secondary">
          Revokes the current open invitation and issues a new activation email.
        </p>
      </div>
      {invitationId ? (
        <input type="hidden" name="invitationId" value={invitationId} />
      ) : null}
      <input type="hidden" name="organizationId" value={organizationId} />
      <Input
        name="adminFullName"
        placeholder="Full name (optional)"
        className="h-11 rounded-xl border-bh-border"
      />
      <Input
        name="email"
        type="email"
        required
        placeholder="New admin email"
        className="h-11 rounded-xl border-bh-border"
      />
      <Button type="submit" variant="honey" className="h-10 rounded-full px-4" disabled={pending}>
        {pending ? 'Replacing…' : 'Revoke and reissue'}
      </Button>
      {state.error ? (
        <p className="text-xs text-bh-danger">{state.error}</p>
      ) : null}
      {state.success ? (
        <div className="rounded-xl border border-bh-border bg-bh-subtle/70 px-3 py-2 text-xs text-bh-text">
          <p className="font-semibold">Activation email sent.</p>
          <p className="mt-1 text-bh-text-secondary">
            Use the newest email. Previous activation emails are no longer valid.
          </p>
        </div>
      ) : null}
    </form>
  );
}
