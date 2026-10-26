'use client';

import { toast } from 'sonner';

import { publishShiftAction } from '@/app/actions/shifts';
import { Button } from '@/components/ui/button';

export function PublishShiftButton({
  slug,
  shiftId,
}: {
  slug: string;
  shiftId: string;
}) {
  return (
    <Button
      type="button"
      onClick={async () => {
        if (!confirm('Publish this shift to the worker marketplace?')) return;
        const result = await publishShiftAction(slug, shiftId);
        if (result.error) toast.error(result.error);
        else toast.success('Shift published');
      }}
    >
      Publish shift
    </Button>
  );
}
