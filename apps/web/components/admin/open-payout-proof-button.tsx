'use client';

import { ExternalLink, Loader2 } from 'lucide-react';
import { useState } from 'react';

import { getPayoutProofDocumentUrl } from '@/app/actions/admin';
import { cn } from '@/lib/utils';

export function OpenPayoutProofButton({
  payoutAccountId,
  className,
}: {
  payoutAccountId: string;
  className?: string;
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
    <div className={cn('space-y-1.5', className)}>
      <button
        type="button"
        disabled={loading}
        onClick={() => void onOpen()}
        className={cn(
          'group relative inline-flex h-10 items-center justify-center gap-2 overflow-hidden rounded-full bg-bh-sidebar px-4 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(7,29,48,0.22)] transition duration-300',
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
        {loading ? (
          <Loader2 className="relative h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <ExternalLink
            className="relative h-4 w-4 transition duration-300 group-hover:scale-110"
            aria-hidden
          />
        )}
        <span className="relative">
          {loading ? 'Opening…' : 'Open proof document'}
        </span>
      </button>
      {error ? (
        <p className="text-xs font-medium text-bh-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
