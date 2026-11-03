'use client';

import { Loader2, Power, PowerOff } from 'lucide-react';
import { useActionState } from 'react';

import {
  setOrganizationRecruitmentEnabledAction,
  type RecruitmentAdminActionResult,
} from '@/app/actions/recruitment-admin';
import { cn } from '@/lib/utils';

const initialState: RecruitmentAdminActionResult = {};

export function RecruitmentAccessForm({
  organizationId,
  recruitmentEnabled,
}: {
  organizationId: string;
  recruitmentEnabled: boolean;
}) {
  const [state, formAction, isPending] = useActionState(
    setOrganizationRecruitmentEnabledAction,
    initialState,
  );

  const Icon = recruitmentEnabled ? PowerOff : Power;

  return (
    <form
      action={formAction}
      className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end"
    >
      <input type="hidden" name="organizationId" value={organizationId} />
      <input
        type="hidden"
        name="enabled"
        value={recruitmentEnabled ? 'false' : 'true'}
      />
      <button
        type="submit"
        disabled={isPending}
        className={cn(
          'group relative inline-flex h-11 items-center justify-center gap-2 overflow-hidden rounded-full px-5 text-sm font-semibold transition duration-300 hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bh-teal disabled:pointer-events-none disabled:opacity-60 motion-reduce:transition-none motion-reduce:hover:translate-y-0',
          recruitmentEnabled
            ? 'border border-bh-danger/30 bg-white text-bh-danger shadow-sm hover:border-bh-danger/50 hover:bg-bh-danger-soft'
            : 'bg-gradient-to-r from-bh-sidebar via-[#0e4a63] to-bh-teal text-white shadow-[0_10px_24px_rgba(7,29,48,0.28)] hover:shadow-[0_14px_28px_rgba(7,29,48,0.34)]',
        )}
      >
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
        <span className="relative">
          {isPending
            ? recruitmentEnabled
              ? 'Disabling…'
              : 'Enabling…'
            : recruitmentEnabled
              ? 'Disable recruitment'
              : 'Enable recruitment'}
        </span>
      </button>
      {state.error ? (
        <p
          className="max-w-xs rounded-xl border border-bh-danger/30 bg-bh-danger-soft px-3 py-2 text-xs font-medium text-bh-danger sm:text-right"
          role="alert"
        >
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
