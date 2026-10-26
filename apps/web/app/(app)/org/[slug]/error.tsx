'use client';

import { useEffect } from 'react';

import { Button } from '@/components/ui/button';

export default function OrgError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="rounded-xl border border-bh-danger/30 bg-bh-danger-soft p-6">
      <h2 className="text-lg font-semibold text-bh-text">Something went wrong</h2>
      <p className="mt-2 text-sm text-bh-text-secondary">
        We could not load this page. Try again. If the problem continues, contact Bridge Hive
        support.
      </p>
      <Button type="button" className="mt-4" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
