'use client';

import { CircleCheck, CircleDot, Layers, type LucideIcon } from 'lucide-react';
import { useEffect, useId, useState } from 'react';

import { cn } from '@/lib/utils';

const RING_RADIUS = 22;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return mounted;
}

function shareOf(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

function CountTile({
  label,
  value,
  caption,
  icon: Icon,
  tone,
  share,
  mounted,
}: {
  label: string;
  value: number;
  caption: string;
  icon: LucideIcon;
  tone: 'neutral' | 'teal' | 'success';
  share?: number;
  mounted: boolean;
}) {
  const toneClasses = {
    neutral: {
      chip: 'bg-bh-subtle text-bh-text-secondary',
      label: 'text-bh-text-muted',
      value: 'text-bh-text',
      bar: 'bg-bh-text-secondary',
    },
    teal: {
      chip: 'bg-bh-teal-soft text-bh-teal-strong',
      label: 'text-bh-teal-strong',
      value: 'text-bh-text',
      bar: 'bg-bh-teal',
    },
    success: {
      chip: 'bg-bh-success-soft text-bh-success',
      label: 'text-bh-success',
      value: 'text-bh-text',
      bar: 'bg-bh-success',
    },
  }[tone];

  return (
    <div className="rounded-xl bg-white/70 px-3.5 py-3">
      <div className="flex items-center justify-between gap-2">
        <p className={cn('text-[10px] font-semibold uppercase tracking-[0.14em]', toneClasses.label)}>
          {label}
        </p>
        <span
          className={cn(
            'grid h-7 w-7 place-items-center rounded-lg',
            toneClasses.chip,
          )}
        >
          <Icon className="h-3.5 w-3.5" aria-hidden />
        </span>
      </div>
      <div className="mt-1.5 flex items-baseline gap-2">
        <p className={cn('bh-tabular text-2xl font-bold tracking-tight', toneClasses.value)}>
          {value}
        </p>
        {share !== undefined ? (
          <span className="bh-tabular text-xs font-semibold text-bh-text-muted">{share}%</span>
        ) : null}
      </div>
      {share !== undefined ? (
        <div
          className="mt-2 h-1.5 overflow-hidden rounded-full bg-bh-subtle"
          role="progressbar"
          aria-label={`${label} share of shifts in view`}
          aria-valuenow={share}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className={cn(
              'h-full rounded-full transition-[width] duration-700 ease-out motion-reduce:transition-none',
              toneClasses.bar,
            )}
            style={{ width: mounted ? `${share}%` : '0%' }}
          />
        </div>
      ) : (
        <p className="mt-2 text-[11px] font-medium text-bh-text-muted">{caption}</p>
      )}
    </div>
  );
}

function CoverageTile({ pct, mounted }: { pct: number; mounted: boolean }) {
  const gradientId = `bh-coverage-ring-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const offset = RING_CIRCUMFERENCE * (1 - (mounted ? pct : 0) / 100);
  const status = pct >= 80 ? 'Healthy' : pct >= 50 ? 'Partial' : 'Needs staff';

  return (
    <div className="rounded-xl bg-[#071d30] px-3.5 py-3 text-white">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#f5c518]">
            Coverage
          </p>
          <p className="bh-tabular mt-1.5 text-2xl font-bold tracking-tight">{pct}%</p>
          <p className="mt-0.5 text-[11px] font-medium text-white/60">{status}</p>
        </div>
        <svg
          viewBox="0 0 56 56"
          className="h-14 w-14 shrink-0 -rotate-90"
          role="img"
          aria-label={`Coverage ${pct}%`}
        >
          <circle cx="28" cy="28" r={RING_RADIUS} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="6" />
          <circle
            cx="28"
            cy="28"
            r={RING_RADIUS}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={offset}
            className="transition-[stroke-dashoffset] duration-1000 ease-out motion-reduce:transition-none"
          />
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#f5c518" />
              <stop offset="100%" stopColor="#16a6b6" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
}

export function ScheduleStatTiles({
  total,
  open,
  filled,
  coveragePct,
}: {
  total: number;
  open: number;
  filled: number;
  coveragePct: number;
}) {
  const mounted = useMounted();
  return (
    <div className="relative mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
      <CountTile
        label="In view"
        value={total}
        caption={total === 1 ? 'shift this period' : 'shifts this period'}
        icon={Layers}
        tone="neutral"
        mounted={mounted}
      />
      <CountTile
        label="Open"
        value={open}
        caption="Awaiting a worker"
        icon={CircleDot}
        tone="teal"
        share={shareOf(open, total)}
        mounted={mounted}
      />
      <CountTile
        label="Filled"
        value={filled}
        caption="Worker assigned"
        icon={CircleCheck}
        tone="success"
        share={shareOf(filled, total)}
        mounted={mounted}
      />
      <CoverageTile pct={coveragePct} mounted={mounted} />
    </div>
  );
}
