'use client';

import { ExternalLink, Loader2 } from 'lucide-react';
import { useState, useTransition } from 'react';

import { getCredentialDocumentUrl } from '@/app/actions/admin';
import { cn } from '@/lib/utils';

export function OpenCredentialDocumentButton({
  credentialId,
  className,
}: {
  credentialId: string;
  className?: string;
}) {
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  return (
    <div className={cn('space-y-1.5', className)}>
      <button
        type="button"
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
        className={cn(
          'group relative inline-flex h-9 items-center justify-center gap-2 overflow-hidden rounded-full bg-bh-sidebar px-3.5 text-xs font-semibold text-white shadow-[0_8px_18px_rgba(7,29,48,0.2)] transition duration-300',
          'hover:-translate-y-0.5 hover:bg-bh-sidebar-raised hover:shadow-[0_12px_24px_rgba(7,29,48,0.28)]',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bh-teal',
          'disabled:pointer-events-none disabled:opacity-60',
          'motion-reduce:transition-none motion-reduce:hover:translate-y-0',
        )}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition duration-700 group-hover:translate-x-full"
        />
        {pending ? (
          <Loader2 className="relative h-3.5 w-3.5 animate-spin" aria-hidden />
        ) : (
          <ExternalLink
            className="relative h-3.5 w-3.5 transition duration-300 group-hover:scale-110"
            aria-hidden
          />
        )}
        <span className="relative">
          {pending ? 'Opening…' : 'Open document'}
        </span>
      </button>
      {error ? (
        <p className="text-xs font-medium text-bh-danger">{error}</p>
      ) : null}
    </div>
  );
}
