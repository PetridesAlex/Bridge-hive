'use client';

import {
  Ban,
  CheckCircle2,
  Loader2,
  PauseCircle,
  PlayCircle,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { useActionState, useState } from 'react';

import {
  approveOrganizationAction,
  reactivateOrganizationAction,
  rejectOrganizationAction,
  revokeOrganizationInvitationAction,
  suspendOrganizationAction,
} from '@/app/actions/admin-organizations';
import { cn } from '@/lib/utils';

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

const ACTION_STYLE: Record<
  ActionType,
  { icon: LucideIcon; trigger: string; confirm: string; panel: string; hint: string }
> = {
  approve: {
    icon: CheckCircle2,
    trigger:
      'bg-gradient-to-r from-bh-success via-[#146c43] to-bh-sidebar text-white shadow-[0_10px_24px_rgba(25,135,84,0.3)] hover:shadow-[0_14px_28px_rgba(25,135,84,0.36)]',
    confirm: 'bg-bh-success text-white hover:bg-[#146c43]',
    panel: 'border-bh-success/30 from-bh-success-soft',
    hint: 'Grants access to the live Bridge Hive network.',
  },
  reject: {
    icon: XCircle,
    trigger:
      'border border-bh-danger/30 bg-white text-bh-danger shadow-sm hover:border-bh-danger/50 hover:bg-bh-danger-soft',
    confirm: 'bg-bh-danger text-white hover:bg-[#912018]',
    panel: 'border-bh-danger/30 from-bh-danger-soft',
    hint: 'The reason is recorded in the audit log.',
  },
  suspend: {
    icon: PauseCircle,
    trigger:
      'border border-bh-danger/30 bg-white text-bh-danger shadow-sm hover:border-bh-danger/50 hover:bg-bh-danger-soft',
    confirm: 'bg-bh-danger text-white hover:bg-[#912018]',
    panel: 'border-bh-danger/30 from-bh-danger-soft',
    hint: 'Pauses all organization activity. The reason is recorded in the audit log.',
  },
  reactivate: {
    icon: PlayCircle,
    trigger:
      'bg-gradient-to-r from-bh-sidebar via-[#0e4a63] to-bh-teal text-white shadow-[0_10px_24px_rgba(7,29,48,0.28)] hover:shadow-[0_14px_28px_rgba(7,29,48,0.34)]',
    confirm: 'bg-bh-sidebar text-white hover:bg-bh-sidebar-raised',
    panel: 'border-bh-teal/30 from-bh-teal-soft',
    hint: 'Restores organization access. The reason is recorded in the audit log.',
  },
  revoke_invitation: {
    icon: Ban,
    trigger:
      'border border-bh-border bg-white text-bh-text-secondary shadow-sm hover:border-bh-danger/40 hover:bg-bh-danger-soft hover:text-bh-danger',
    confirm: 'bg-bh-danger text-white hover:bg-[#912018]',
    panel: 'border-bh-danger/30 from-bh-danger-soft',
    hint: 'The invitation link stops working immediately.',
  },
};

const PILL =
  'group relative inline-flex h-11 items-center justify-center gap-2 overflow-hidden rounded-full px-5 text-sm font-semibold transition duration-300 hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bh-teal disabled:pointer-events-none disabled:opacity-60 motion-reduce:transition-none motion-reduce:hover:translate-y-0';

export function OrganizationActionsForm({
  action,
  organizationId,
  invitationId,
  buttonText,
  requiresReason,
  buttonClassName,
}: {
  action: ActionType;
  organizationId?: string;
  invitationId?: string;
  buttonText: string;
  requiresReason?: boolean;
  buttonClassName?: string;
}) {
  const [showForm, setShowForm] = useState(false);
  const [state, formAction, isPending] = useActionState(getAction(action), {});
  const style = ACTION_STYLE[action];
  const Icon = style.icon;

  const triggerContent = (
    <>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition duration-700 group-hover:translate-x-full"
      />
      {isPending ? (
        <Loader2 className="relative h-4 w-4 animate-spin" aria-hidden />
      ) : (
        <Icon
          className="relative h-4 w-4 transition duration-300 group-hover:scale-110"
          aria-hidden
        />
      )}
      <span className="relative">{isPending ? 'Processing…' : buttonText}</span>
    </>
  );

  if (requiresReason && !showForm) {
    return (
      <button
        type="button"
        onClick={() => setShowForm(true)}
        className={cn(PILL, style.trigger, buttonClassName)}
      >
        {triggerContent}
      </button>
    );
  }

  return (
    <form
      action={formAction}
      className={cn(
        'flex flex-col gap-2',
        requiresReason && showForm && 'w-full sm:max-w-md',
      )}
    >
      {organizationId ? (
        <input type="hidden" name="organizationId" value={organizationId} />
      ) : null}
      {invitationId ? (
        <input type="hidden" name="invitationId" value={invitationId} />
      ) : null}
      {requiresReason && showForm ? (
        <div
          className={cn(
            'bh-fade-up space-y-3 rounded-2xl border bg-gradient-to-br to-bh-surface p-4 shadow-[0_10px_28px_rgba(7,29,48,0.08)]',
            style.panel,
          )}
        >
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-bh-border/70">
              <Icon className="h-4 w-4 text-bh-text" aria-hidden />
            </span>
            <div>
              <p className="text-sm font-semibold tracking-tight text-bh-text">
                {buttonText}
              </p>
              <p className="text-xs text-bh-text-secondary">{style.hint}</p>
            </div>
          </div>
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-bh-text-muted">
              Reason
            </span>
            <textarea
              name="reason"
              required
              maxLength={2000}
              rows={3}
              autoFocus
              placeholder="Explain why this action is being taken…"
              className="w-full resize-y rounded-xl border border-bh-border/90 bg-white px-3.5 py-2.5 text-sm text-bh-text outline-none transition placeholder:text-bh-text-muted focus:border-bh-teal focus:ring-2 focus:ring-bh-teal/20"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={isPending}
              className={cn(
                'inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold shadow-sm transition hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-60',
                style.confirm,
              )}
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : null}
              {isPending ? 'Processing…' : 'Confirm'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              disabled={isPending}
              className="inline-flex h-10 items-center rounded-full border border-bh-border bg-white px-4 text-sm font-semibold text-bh-text-secondary shadow-sm transition hover:bg-bh-subtle hover:text-bh-text"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="submit"
          disabled={isPending}
          className={cn(PILL, style.trigger, buttonClassName)}
        >
          {triggerContent}
        </button>
      )}
      {state.error ? (
        <p
          className="rounded-xl border border-bh-danger/30 bg-bh-danger-soft px-3 py-2 text-sm font-medium text-bh-danger"
          role="alert"
        >
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
