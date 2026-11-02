import { useId } from 'react';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { ArrowUpRight } from 'lucide-react';

import { cn } from '@/lib/utils';

const SPARK_STOP: Record<
  'teal' | 'honey' | 'blue' | 'success' | 'danger',
  string
> = {
  teal: '#16a6b6',
  honey: '#e0aa18',
  blue: '#2563eb',
  success: '#198754',
  danger: '#b42318',
};

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
  const reactId = useId().replace(/:/g, '');
  const fillId = `metricSpark-${tone}-${reactId}`;

  const tones = {
    teal: {
      icon: 'bg-bh-teal-soft text-bh-teal-strong ring-bh-teal/20',
      bar: 'from-bh-teal via-bh-teal-strong to-bh-sidebar',
      spark: 'text-bh-teal',
      glow: 'group-hover:shadow-[0_16px_40px_rgba(22,166,182,0.16)]',
      cta: 'border-bh-teal/30 bg-bh-teal-soft text-bh-teal-strong hover:border-bh-teal/50 hover:bg-bh-teal hover:text-white',
    },
    honey: {
      icon: 'bg-bh-honey-soft text-bh-honey-strong ring-bh-honey/25',
      bar: 'from-bh-honey via-bh-honey-strong to-bh-sidebar',
      spark: 'text-bh-honey-strong',
      glow: 'group-hover:shadow-[0_16px_40px_rgba(224,170,24,0.16)]',
      cta: 'border-bh-honey/40 bg-bh-honey-soft text-bh-honey-strong hover:border-bh-honey/60 hover:bg-bh-honey hover:text-bh-sidebar',
    },
    blue: {
      icon: 'bg-bh-accent-blue-soft text-bh-accent-blue ring-bh-accent-blue/20',
      bar: 'from-bh-accent-blue via-[#1d4ed8] to-bh-sidebar',
      spark: 'text-bh-accent-blue',
      glow: 'group-hover:shadow-[0_16px_40px_rgba(37,99,235,0.14)]',
      cta: 'border-bh-accent-blue/30 bg-bh-accent-blue-soft text-bh-accent-blue hover:border-bh-accent-blue/50 hover:bg-bh-accent-blue hover:text-white',
    },
    success: {
      icon: 'bg-bh-success-soft text-bh-success ring-bh-success/20',
      bar: 'from-bh-success via-[#146c43] to-bh-sidebar',
      spark: 'text-bh-success',
      glow: 'group-hover:shadow-[0_16px_40px_rgba(25,135,84,0.14)]',
      cta: 'border-bh-success/30 bg-bh-success-soft text-bh-success hover:border-bh-success/50 hover:bg-bh-success hover:text-white',
    },
    danger: {
      icon: 'bg-bh-danger-soft text-bh-danger ring-bh-danger/20',
      bar: 'from-bh-danger via-[#912018] to-bh-sidebar',
      spark: 'text-bh-danger',
      glow: 'group-hover:shadow-[0_16px_40px_rgba(180,35,24,0.14)]',
      cta: 'border-bh-danger/30 bg-bh-danger-soft text-bh-danger hover:border-bh-danger/50 hover:bg-bh-danger hover:text-white',
    },
  } as const;

  const palette = tones[tone];
  const max = Math.max(1, ...(sparkline ?? [0]));
  const width = 96;
  const height = 36;
  const pts = (sparkline ?? []).map((v, i, arr) => {
    const x = arr.length <= 1 ? width / 2 : (i / (arr.length - 1)) * width;
    const y = height - (v / max) * (height - 6) - 3;
    return { x, y };
  });
  const line = pts.map((p) => `${p.x},${p.y}`).join(' ');
  const area =
    pts.length > 1
      ? `${0},${height} ${line} ${width},${height}`
      : '';

  return (
    <article
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-[1.25rem] border border-bh-border/90 bg-bh-surface shadow-[0_8px_28px_rgba(7,29,48,0.05)] transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-0.5 hover:border-bh-border-strong motion-reduce:transition-none motion-reduce:hover:translate-y-0',
        palette.glow,
        className,
      )}
    >
      <div
        aria-hidden
        className={cn('h-1 bg-gradient-to-r', palette.bar)}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-bh-subtle/70 to-transparent"
      />

      <div className="relative flex flex-1 flex-col p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <span
            className={cn(
              'flex h-11 w-11 items-center justify-center rounded-2xl ring-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]',
              palette.icon,
            )}
          >
            <Icon className="h-5 w-5" aria-hidden />
          </span>
          {sparkline && sparkline.length > 1 ? (
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className={cn('h-9 w-24', palette.spark)}
              aria-hidden
            >
              <defs>
                <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor={SPARK_STOP[tone]}
                    stopOpacity="0.28"
                  />
                  <stop
                    offset="100%"
                    stopColor={SPARK_STOP[tone]}
                    stopOpacity="0"
                  />
                </linearGradient>
              </defs>
              {area ? (
                <polygon fill={`url(#${fillId})`} points={area} />
              ) : null}
              <polyline
                fill="none"
                stroke="currentColor"
                strokeWidth="2.25"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={line}
              />
            </svg>
          ) : null}
        </div>

        <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.14em] text-bh-text-muted">
          {label}
        </p>
        <p className="bh-tabular mt-1.5 text-[2rem] font-bold leading-none tracking-tight text-bh-text">
          {value}
        </p>

        {delta ? (
          <p
            className={cn(
              'mt-2 inline-flex w-fit items-center rounded-full px-2 py-0.5 text-[11px] font-bold',
              delta.value >= 0
                ? 'bg-bh-success-soft text-bh-success'
                : 'bg-bh-danger-soft text-bh-danger',
            )}
          >
            {delta.value >= 0 ? '+' : ''}
            {delta.value} {delta.label}
          </p>
        ) : null}

        {subtext ? (
          <p className="mt-2.5 text-xs leading-5 text-bh-text-secondary">
            {subtext}
          </p>
        ) : null}

        {href && linkLabel ? (
          <div className="mt-auto w-full pt-4">
            <Link
              href={href}
              className={cn(
                'inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-full border px-4 text-sm font-bold tracking-tight shadow-[0_4px_12px_rgba(7,29,48,0.08)] transition-[transform,background-color,border-color,color,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_18px_rgba(7,29,48,0.14)] motion-reduce:transition-none motion-reduce:hover:translate-y-0',
                palette.cta,
              )}
            >
              {linkLabel}
              <ArrowUpRight
                className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                aria-hidden
              />
            </Link>
          </div>
        ) : null}
      </div>
    </article>
  );
}
