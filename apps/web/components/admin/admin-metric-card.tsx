import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

export function AdminMetricCard({
  label,
  value,
  icon: Icon,
  href,
  linkLabel,
  subtext,
  sparkline,
  delta,
  tone = 'teal',
  className,
}: {
  label: string;
  value: number | string;
  icon: LucideIcon;
  href?: string;
  linkLabel?: string;
  subtext?: string;
  sparkline?: number[];
  delta?: { value: number; label: string } | null;
  tone?: 'teal' | 'honey' | 'blue' | 'success' | 'danger';
  className?: string;
}) {
  const tones = {
    teal: 'bg-bh-teal-soft text-bh-teal-strong',
    honey: 'bg-bh-honey-soft text-bh-honey-strong',
    blue: 'bg-bh-accent-blue-soft text-bh-accent-blue',
    success: 'bg-bh-success-soft text-bh-success',
    danger: 'bg-bh-danger-soft text-bh-danger',
  } as const;

  const max = Math.max(1, ...(sparkline ?? [0]));
  const width = 88;
  const height = 32;
  const pts = (sparkline ?? []).map((v, i, arr) => {
    const x = arr.length <= 1 ? width / 2 : (i / (arr.length - 1)) * width;
    const y = height - (v / max) * (height - 4) - 2;
    return `${x},${y}`;
  });
  const line = pts.join(' ');

  return (
    <article
      className={cn(
        'flex flex-col rounded-2xl border border-bh-border bg-bh-surface p-4 shadow-[0_4px_16px_rgba(7,29,48,0.04)] sm:p-5',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-xl',
            tones[tone],
          )}
        >
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        {sparkline && sparkline.length > 1 ? (
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="h-8 w-[88px] text-bh-teal"
            aria-hidden
          >
            <polyline
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={line}
            />
          </svg>
        ) : null}
      </div>

      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.08em] text-bh-text-muted">
        {label}
      </p>
      <p className="bh-tabular mt-1 text-3xl font-bold tracking-tight text-bh-text">
        {value}
      </p>

      {delta ? (
        <p
          className={cn(
            'mt-1 text-xs font-semibold',
            delta.value >= 0 ? 'text-bh-success' : 'text-bh-danger',
          )}
        >
          {delta.value >= 0 ? '+' : ''}
          {delta.value} {delta.label}
        </p>
      ) : null}

      {subtext ? (
        <p className="mt-2 text-xs leading-5 text-bh-text-secondary">{subtext}</p>
      ) : null}

      {href && linkLabel ? (
        <Link
          href={href}
          className="mt-3 inline-flex text-sm font-semibold text-bh-teal-strong hover:underline"
        >
          {linkLabel}
        </Link>
      ) : null}
    </article>
  );
}
