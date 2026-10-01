import { ArrowLeft } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * Premium back navigation used across org detail screens.
 *
 * Uses a native anchor (not next/link) so navigation from a dynamic child
 * route like `/shifts/[id]` back to `/shifts` cannot stall in soft-nav.
 */
export function BackLink({
  href,
  label,
  className,
}: {
  href: string;
  label: string;
  className?: string;
}) {
  return (
    <a
      href={href}
      className={cn(
        'group relative z-10 inline-flex items-center gap-2 rounded-full border border-bh-border bg-bh-surface px-3 py-1.5 text-sm font-medium text-bh-text-secondary shadow-[0_1px_2px_rgba(7,29,48,0.04)] transition-all',
        'hover:border-bh-teal/40 hover:bg-bh-teal-soft/50 hover:text-bh-teal-strong',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bh-teal',
        className,
      )}
    >
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-bh-subtle text-bh-text-secondary transition-colors group-hover:bg-bh-teal group-hover:text-white">
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
      </span>
      {label}
    </a>
  );
}
