'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import { publishShiftAction } from '@/app/actions/shifts';
import { showOrgSuccessToast } from '@/components/org/org-success-toast';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function PublishShiftButton({
  slug,
  shiftId,
  className,
}: {
  slug: string;
  shiftId: string;
  className?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  return (
    <Button
      type="button"
      disabled={pending || confirming}
      className={cn(className)}
      onClick={() => {
        if (pending || confirming) return;
        setConfirming(true);
        const allowed = confirm('Publish this shift to the worker marketplace?');
        setConfirming(false);
        if (!allowed) return;
        startTransition(async () => {
          const result = await publishShiftAction(slug, shiftId);
          if (result.error) toast.error(result.error);
          else
            showOrgSuccessToast('Shift published', {
              description: 'This shift is now live for matching workers.',
            });
        });
      }}
    >
      {pending ? 'Publishing…' : 'Publish shift'}
    </Button>
  );
}
