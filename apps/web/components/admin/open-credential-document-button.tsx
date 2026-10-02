'use client';

import { useState, useTransition } from 'react';

import { getCredentialDocumentUrl } from '@/app/actions/admin';
import { Button } from '@/components/ui/button';

export function OpenCredentialDocumentButton({
  credentialId,
}: {
  credentialId: string;
}) {
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-1">
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() => {
          setError(undefined);
          startTransition(async () => {
            const result = await getCredentialDocumentUrl(credentialId);
            if (result.error || !result.url) {
              setError(result.error ?? 'Unable to open document.');
              return;
            }
            window.open(result.url, '_blank', 'noopener,noreferrer');
          });
        }}
      >
        {pending ? 'Opening…' : 'Open document'}
      </Button>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
