'use client';

import { useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';

export function OpenRecruitmentDocumentButton({
  slug,
  documentId,
}: {
  slug: string;
  documentId: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="rounded-full border-bh-border bg-bh-surface px-3.5 font-medium shadow-sm hover:border-bh-teal/40 hover:bg-bh-teal-soft/60"
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const fd = new FormData();
            fd.set('slug', slug);
            fd.set('documentId', documentId);
            const res = await fetch('/api/recruitment/document-url', {
              method: 'POST',
              body: fd,
            });
            if (!res.ok) {
              setError('Unable to open document');
              return;
            }
            const data = (await res.json()) as { url?: string; error?: string };
            if (!data.url) {
              setError(data.error ?? 'Unable to open document');
              return;
            }
            window.open(data.url, '_blank', 'noopener,noreferrer');
          });
        }}
      >
        {pending ? 'Opening…' : 'View'}
      </Button>
      {error ? <p className="text-xs text-bh-danger">{error}</p> : null}
    </div>
  );
}
