'use client';

import { useState, useTransition } from 'react';
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
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  return (
    <Button
      type="button"
      disabled={pending || confirming}
      onClick={() => {
        if (pending || confirming) return;
        setConfirming(true);
        const allowed = confirm('Publish this shift to the worker marketplace?');
        setConfirming(false);
        if (!allowed) return;
        startTransition(async () => {
          const result = await publishShiftAction(slug, shiftId);
          if (result.error) toast.error(result.error);
          else toast.success('Shift published');
        });
      }}
    >
      {pending ? 'Publishing…' : 'Publish shift'}
    </Button>
  );
}
