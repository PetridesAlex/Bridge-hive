'use client';

import { useActionState, useEffect } from 'react';
import { toast } from 'sonner';

import {
  reviewTimesheetAction,
  type ActionResult,
} from '@/app/actions/shifts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const initial: ActionResult = {};

export function TimesheetReviewForm({
  slug,
  shiftId,
  timesheetId,
  submittedMinutes,
}: {
  slug: string;
  shiftId: string;
  timesheetId: string;
  submittedMinutes: number | null;
}) {
  const action = reviewTimesheetAction.bind(null, slug, shiftId);
  const [state, formAction, pending] = useActionState(action, initial);

  useEffect(() => {
    if (state.success) toast.success('Timesheet reviewed');
    if (state.error) toast.error(state.error);
  }, [state]);

  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="timesheetId" value={timesheetId} />

      <div className="space-y-1.5">
        <Label htmlFor="decision">Decision</Label>
        <select
          id="decision"
          name="decision"
          required
          className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
          defaultValue="approve"
        >
          <option value="approve">Approve</option>
          <option value="reject">Reject</option>
        </select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="approvedMinutes">Approved minutes (optional)</Label>
        <Input
          id="approvedMinutes"
          name="approvedMinutes"
          type="number"
          min={0}
          placeholder={
            submittedMinutes != null ? String(submittedMinutes) : undefined
          }
        />
      </div>

      <div className="sm:col-span-2 space-y-1.5">
        <Label htmlFor="reviewNote">Review note</Label>
        <Textarea id="reviewNote" name="reviewNote" />
      </div>

      {state.error ? (
        <p className="sm:col-span-2 text-sm text-red-600" role="alert">
          {state.error}
        </p>
      ) : null}

      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? 'Submitting…' : 'Submit review'}
        </Button>
      </div>
    </form>
  );
}
