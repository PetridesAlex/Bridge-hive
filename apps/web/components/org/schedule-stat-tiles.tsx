'use client';

import { CircleCheck, CircleDot, Layers, type LucideIcon } from 'lucide-react';
import { useEffect, useId, useState } from 'react';

import { CountUp } from '@/components/org/count-up';
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
  tone: 'neutral' | 'open' | 'filled';
  share?: number;
  mounted: boolean;
}) {
  const toneClasses = {
    neutral: {
      shell:
        'border-white/70 bg-white/55 ring-[#5ec8ff]/15 shadow-[0_10px_22px_rgba(7,29,48,0.07)]',
      chip: 'bg-[#071d30] text-[#5ec8ff] shadow-[0_8px_14px_rgba(7,29,48,0.22)]',
      label: 'text-[#1a8fd4]',
      bar: 'bg-[linear-gradient(90deg,#8adbff_0%,#2aa8ef_100%)]',
      glow: 'bg-[#5ec8ff]/20',
    },
    open: {
      shell:
        'border-white/70 bg-white/55 ring-[#16a6b6]/20 shadow-[0_10px_22px_rgba(22,166,182,0.1)]',
      chip: 'bg-[linear-gradient(165deg,#8adbff_0%,#4fc3ff_50%,#2aa8ef_100%)] text-white shadow-[0_8px_14px_rgba(42,168,239,0.32)]',
      label: 'text-[#0e8a96]',
      bar: 'bg-[linear-gradient(90deg,#5ec8ff_0%,#16a6b6_100%)]',
      glow: 'bg-[#16a6b6]/18',
    },
    filled: {
      shell:
        'border-white/70 bg-white/55 ring-emerald-400/20 shadow-[0_10px_22px_rgba(16,185,129,0.1)]',
      chip: 'bg-[linear-gradient(165deg,#34d399_0%,#10b981_55%,#059669_100%)] text-white shadow-[0_8px_14px_rgba(16,185,129,0.3)]',
      label: 'text-emerald-700',
      bar: 'bg-[linear-gradient(90deg,#34d399_0%,#059669_100%)]',
      glow: 'bg-emerald-400/18',
    },
  }[tone];

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border px-3.5 py-3.5 backdrop-blur-md ring-1',
        toneClasses.shell,
      )}
    >
      <span
        aria-hidden
        className={cn(
          'pointer-events-none absolute -right-6 -top-8 h-20 w-20 rounded-full blur-2xl',
          toneClasses.glow,
        )}
      />
      <div className="relative flex items-center justify-between gap-2">
        <p
          className={cn(
            'text-[10px] font-bold uppercase tracking-[0.14em]',
            toneClasses.label,
          )}
        >
          {label}
        </p>
        <span
          className={cn(
            'grid h-8 w-8 place-items-center rounded-xl',
            toneClasses.chip,
          )}
        >
          <Icon className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden />
        </span>
      </div>
      <div className="relative mt-2 flex items-baseline gap-2">
        <p className="bh-tabular text-[28px] font-extrabold leading-none tracking-[-0.03em] text-[#071d30]">
          <CountUp value={value} />
        </p>
        {share !== undefined ? (
          <span className="bh-tabular inline-flex items-center rounded-full bg-[#071d30]/06 px-1.5 py-0.5 text-[11px] font-bold text-[#071d30]/70">
            {share}%
          </span>
        ) : null}
      </div>
      {share !== undefined ? (
        <div className="relative mt-3">
          <div className="mb-1 flex items-center justify-between text-[9px] font-semibold uppercase tracking-[0.1em] text-[#071d30]/40">
            <span>{caption}</span>
            <span className="bh-tabular">{share}/100</span>
          </div>
          <div
            className="h-2 overflow-hidden rounded-full bg-[#071d30]/08 ring-1 ring-white/60"
            role="progressbar"
            aria-label={`${label} share of shifts in view`}
            aria-valuenow={share}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className={cn(
                'h-full rounded-full shadow-[0_0_10px_rgba(42,168,239,0.35)] transition-[width] duration-700 ease-out motion-reduce:transition-none',
                toneClasses.bar,
              )}
              style={{ width: mounted ? `${share}%` : '0%' }}
            />
          </div>
        </div>
      ) : (
        <p className="relative mt-3 text-[11px] font-semibold text-[#071d30]/55">
          {caption}
        </p>
      )}
    </div>
  );
}

function CoverageTile({ pct, mounted }: { pct: number; mounted: boolean }) {
  const gradientId = `bh-coverage-ring-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const offset = RING_CIRCUMFERENCE * (1 - (mounted ? pct : 0) / 100);
  const status =
    pct >= 80 ? 'Healthy' : pct >= 50 ? 'Partial' : 'Needs staff';
  const statusTone =
    pct >= 80
      ? 'bg-emerald-500/15 text-emerald-700 ring-emerald-500/25'
      : pct >= 50
        ? 'bg-[#5ec8ff]/15 text-[#0f7ec4] ring-[#5ec8ff]/30'
        : 'bg-[#071d30]/08 text-[#071d30]/70 ring-[#071d30]/10';

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/70 bg-white/55 px-3.5 py-3.5 text-[#071d30] shadow-[0_10px_22px_rgba(7,29,48,0.07)] ring-1 ring-[#5ec8ff]/20 backdrop-blur-md">
      <span
        aria-hidden
        className="pointer-events-none absolute -right-5 -top-8 h-24 w-24 rounded-full bg-[#5ec8ff]/25 blur-2xl"
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#1a8fd4]">
            Coverage
          </p>
          <p className="bh-tabular mt-2 text-[28px] font-extrabold leading-none tracking-[-0.03em] text-[#071d30]">
            <CountUp value={pct} />
            <span className="text-[16px] font-bold text-[#071d30]/45">%</span>
          </p>
          <span
            className={cn(
              'mt-2 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] ring-1',
              statusTone,
            )}
          >
            {status}
          </span>
        </div>
        <svg
          viewBox="0 0 56 56"
          className="h-14 w-14 shrink-0 -rotate-90"
          role="img"
          aria-label={`Coverage ${pct}%`}
        >
          <circle
            cx="28"
            cy="28"
            r={RING_RADIUS}
            fill="none"
            stroke="rgba(7,29,48,0.1)"
            strokeWidth="6"
          />
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
            className="drop-shadow-[0_0_8px_rgba(42,168,239,0.45)] transition-[stroke-dashoffset] duration-1000 ease-out motion-reduce:transition-none"
          />
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#8adbff" />
              <stop offset="55%" stopColor="#2aa8ef" />
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
        caption="Awaiting staff"
        icon={CircleDot}
        tone="open"
        share={shareOf(open, total)}
        mounted={mounted}
      />
      <CountTile
        label="Filled"
        value={filled}
        caption="Staff assigned"
        icon={CircleCheck}
        tone="filled"
        share={shareOf(filled, total)}
        mounted={mounted}
      />
      <CoverageTile pct={coveragePct} mounted={mounted} />
    </div>
  );
}
