'use client';

import { useActionState, useEffect } from 'react';
import { toast } from 'sonner';

import {
  extendShiftAcceptanceDeadlineAction,
  type ActionResult,
} from '@/app/actions/shifts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatDateTimeLocalInput } from '@/lib/format';

const initial: ActionResult = {};

export function ExtendAcceptanceDeadlineForm({
  slug,
  shiftId,
  startsAt,
  currentDeadline,
  acceptanceClosed,
}: {
  slug: string;
  shiftId: string;
  startsAt: string;
  currentDeadline: string | null;
  acceptanceClosed: boolean;
}) {
  const action = extendShiftAcceptanceDeadlineAction.bind(null, slug, shiftId);
  const [state, formAction, pending] = useActionState(action, initial);

  useEffect(() => {
    if (state.success) toast.success('Acceptance window updated');
    if (state.error) toast.error(state.error);
  }, [state]);

  const defaultDeadline =
    currentDeadline && new Date(currentDeadline) > new Date()
      ? formatDateTimeLocalInput(currentDeadline)
      : '';

  return (
    <form action={formAction} className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
      <div>
        <p className="text-sm font-medium text-amber-950">
          {acceptanceClosed
            ? 'Workers cannot see this shift'
            : 'Acceptance window'}
        </p>
        <p className="mt-1 text-sm text-amber-900">
          {acceptanceClosed
            ? 'The acceptance deadline has passed, so eligible workers will not see this shift in the marketplace. Extend the deadline to a future time before the shift starts.'
            : 'You can extend the acceptance deadline while the shift remains published and unfilled.'}
        </p>
        {currentDeadline ? (
          <p className="mt-1 text-xs text-amber-800">
            Current deadline: {new Date(currentDeadline).toLocaleString()}
          </p>
        ) : (
          <p className="mt-1 text-xs text-amber-800">
            No deadline set (open until shift start under marketplace rules).
          </p>
        )}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="acceptanceDeadline">New acceptance deadline</Label>
        <Input
          id="acceptanceDeadline"
          name="acceptanceDeadline"
          type="datetime-local"
          required
          defaultValue={defaultDeadline}
          max={formatDateTimeLocalInput(startsAt)}
        />
      </div>
      {state.error ? (
        <p className="text-sm text-red-700" role="alert">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? 'Updating…' : 'Extend acceptance window'}
      </Button>
    </form>
  );
}
