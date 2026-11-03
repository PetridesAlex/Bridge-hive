import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

import { cn } from '@/lib/utils';

export function AdminBackLink({
  href,
  label,
  className,
}: {
  href: string;
  label: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'group inline-flex items-center gap-2.5 rounded-full border border-bh-border/80 bg-bh-surface/90 py-1 pl-1 pr-4 text-sm font-semibold tracking-tight text-bh-text-secondary shadow-[0_4px_14px_rgba(7,29,48,0.06)] backdrop-blur transition duration-300',
        'hover:-translate-x-0.5 hover:border-bh-border-strong hover:bg-bh-surface hover:text-bh-text hover:shadow-[0_8px_20px_rgba(7,29,48,0.1)]',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bh-teal',
        'motion-reduce:transition-none motion-reduce:hover:translate-x-0',
        className,
      )}
    >
      <span
        aria-hidden
        className="flex h-7 w-7 items-center justify-center rounded-full bg-bh-sidebar text-white shadow-[0_4px_10px_rgba(7,29,48,0.22)] transition duration-300 group-hover:bg-bh-honey group-hover:text-bh-sidebar"
      >
        <ArrowLeft className="h-3.5 w-3.5 transition duration-300 group-hover:-translate-x-0.5" />
      </span>
      {label}
    </Link>
  );
}
