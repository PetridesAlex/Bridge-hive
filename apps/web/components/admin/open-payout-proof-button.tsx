'use client';

import { useState } from 'react';

import { getPayoutProofDocumentUrl } from '@/app/actions/admin';
import { Button } from '@/components/ui/button';

export function OpenPayoutProofButton({
  payoutAccountId,
}: {
  payoutAccountId: string;
}) {
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  const onOpen = async () => {
    setError(undefined);
    setLoading(true);
    const result = await getPayoutProofDocumentUrl(payoutAccountId);
    setLoading(false);
    if (result.error || !result.url) {
      setError(result.error ?? 'Could not open document.');
      return;
    }
    window.open(result.url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-2">
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={loading}
        onClick={() => void onOpen()}
      >
        {loading ? 'Opening…' : 'Open proof document'}
      </Button>
      {error ? (
        <p className="text-sm text-rose-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
