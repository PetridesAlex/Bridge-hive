import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

export function OrgTableShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border border-bh-border bg-bh-surface shadow-[0_1px_2px_rgba(7,29,48,0.04)]',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function OrgTableHeadCell({
  icon: Icon,
  label,
  className,
  align = 'left',
}: {
  icon: LucideIcon;
  label: string;
  className?: string;
  align?: 'left' | 'right';
}) {
  return (
    <th
      className={cn(
        'px-4 py-3.5',
        align === 'right' && 'text-right',
        className,
      )}
    >
      <span
        className={cn(
          'inline-flex items-center gap-2',
          align === 'right' && 'justify-end',
        )}
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-bh-teal-soft text-bh-teal-strong">
          <Icon className="h-3.5 w-3.5" aria-hidden />
        </span>
        <span>{label}</span>
      </span>
    </th>
  );
}

export const orgTableHeadClassName =
  'border-b border-bh-border bg-gradient-to-b from-bh-subtle/80 to-bh-subtle/40 text-[11px] font-semibold uppercase tracking-[0.06em] text-bh-text-muted';

export const orgTableRowClassName =
  'group border-b border-bh-border/60 transition-colors last:border-0 hover:bg-bh-teal-soft/30';
