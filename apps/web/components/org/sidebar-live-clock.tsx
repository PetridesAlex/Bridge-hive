'use client';

import { useEffect, useState } from 'react';

type ClockParts = {
  time: string;
  seconds: string;
  date: string;
  week: string;
};

function isoWeekNumber(date: Date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function readClock(now = new Date()): ClockParts {
  const time = new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(now);

  const seconds = String(now.getSeconds()).padStart(2, '0');

  const date = new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(now);

  return {
    time,
    seconds,
    date,
    week: `Week ${isoWeekNumber(now)}`,
  };
}

export function SidebarLiveClock() {
  const [parts, setParts] = useState<ClockParts | null>(null);

  useEffect(() => {
    const tick = () => setParts(readClock());
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div
      className="relative mt-3 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.07] via-bh-sidebar-raised to-[#0a2438] px-3.5 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
      aria-live="polite"
      aria-atomic="true"
    >
      <div
        className="pointer-events-none absolute -right-8 -top-10 h-24 w-24 rounded-full bg-bh-honey/15 blur-2xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-10 left-0 h-20 w-20 rounded-full bg-bh-teal/20 blur-2xl"
        aria-hidden
      />

      <div className="relative flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-bh-honey">
          <span className="relative flex h-1.5 w-1.5">
            <span className="bh-soft-pulse absolute inline-flex h-full w-full rounded-full bg-bh-honey opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-bh-honey" />
          </span>
          Live
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-bh-sidebar-muted">
          {parts?.week ?? '—'}
        </span>
      </div>

      <p className="bh-tabular relative mt-2 flex items-baseline gap-1.5 text-[28px] font-bold leading-none tracking-tight text-white">
        <span>{parts?.time ?? '--:--'}</span>
        <span className="text-[15px] font-semibold text-bh-honey/90">
          {parts ? `:${parts.seconds}` : ''}
        </span>
      </p>

      <p className="relative mt-1.5 truncate text-[12px] font-medium tracking-wide text-bh-sidebar-muted">
        {parts?.date ?? 'Updating…'}
      </p>
    </div>
  );
}
