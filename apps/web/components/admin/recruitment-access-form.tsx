'use client';

import { useActionState } from 'react';

import {
  setOrganizationRecruitmentEnabledAction,
  type RecruitmentAdminActionResult,
} from '@/app/actions/recruitment-admin';
import { Button } from '@/components/ui/button';

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

  return (
    <form action={formAction} className="flex flex-col items-stretch gap-2 sm:items-end">
      <input type="hidden" name="organizationId" value={organizationId} />
      <input
        type="hidden"
        name="enabled"
        value={recruitmentEnabled ? 'false' : 'true'}
      />
      <Button
        type="submit"
        className="rounded-full"
        variant="outline"
        disabled={isPending}
      >
        {isPending
          ? recruitmentEnabled
            ? 'Disabling…'
            : 'Enabling…'
          : recruitmentEnabled
            ? 'Disable recruitment'
            : 'Enable recruitment'}
      </Button>
      {state.error ? (
        <p className="max-w-xs text-right text-xs text-red-600" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
