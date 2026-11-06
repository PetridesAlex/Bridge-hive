'use client';

import { useEffect, useId, useState } from 'react';

type ClockParts = {
  hours: string;
  minutes: string;
  seconds: number;
  date: string;
  week: string;
  dayProgress: number;
};

const RING_RADIUS = 12;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function isoWeekNumber(date: Date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function readClock(now = new Date()): ClockParts {
  const timeParts = new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const hours = timeParts.find((p) => p.type === 'hour')?.value ?? '--';
  const minutes = timeParts.find((p) => p.type === 'minute')?.value ?? '--';

  const date = new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  }).format(now);

  const elapsed = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();

  return {
    hours,
    minutes,
    seconds: now.getSeconds(),
    date,
    week: `Week ${isoWeekNumber(now)}`,
    dayProgress: elapsed / 86400,
  };
}

export function SidebarLiveClock() {
  const [parts, setParts] = useState<ClockParts | null>(null);
  const gradientId = useId();

  useEffect(() => {
    const tick = () => setParts(readClock());
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  const seconds = parts?.seconds ?? 0;
  const ringOffset = RING_CIRCUMFERENCE * (1 - (seconds + 1) / 60);
  const dayPct = Math.round((parts?.dayProgress ?? 0) * 100);

  return (
    <div
      className="min-w-0 rounded-lg bg-white/[0.03] px-2.5 py-2"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <p className="bh-tabular flex shrink-0 items-baseline text-[22px] font-semibold leading-none tracking-tight text-white">
          <span>{parts?.hours ?? '--'}</span>
          <span
            className="bh-clock-colon mx-px text-bh-teal/90"
            aria-hidden
          >
            :
          </span>
          <span>{parts?.minutes ?? '--'}</span>
        </p>

        <div className="relative h-8 w-8 shrink-0" aria-hidden>
          <svg viewBox="0 0 36 36" className="h-8 w-8 -rotate-90">
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#16a6b6" />
                <stop offset="100%" stopColor="#e0aa18" />
              </linearGradient>
            </defs>
            <circle
              cx="18"
              cy="18"
              r={RING_RADIUS}
              fill="none"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="2"
            />
            <circle
              cx="18"
              cy="18"
              r={RING_RADIUS}
              fill="none"
              stroke={`url(#${gradientId})`}
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray={RING_CIRCUMFERENCE}
              strokeDashoffset={parts ? ringOffset : RING_CIRCUMFERENCE}
              className={
                seconds === 0 || !parts
                  ? ''
                  : 'transition-[stroke-dashoffset] duration-1000 ease-linear'
              }
            />
          </svg>
          <span
            key={seconds}
            className="bh-clock-tick bh-tabular absolute inset-0 flex items-center justify-center text-[9px] font-medium text-white/75"
          >
            {parts ? String(seconds).padStart(2, '0') : ''}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-medium text-bh-sidebar-muted">
            {parts?.date ?? 'Updating…'}
          </p>
          <p className="mt-0.5 flex items-center justify-between gap-2 text-[10px] text-white/45">
            <span className="truncate">{parts?.week ?? '—'}</span>
            <span className="bh-tabular shrink-0 font-medium">
              {parts ? `${dayPct}%` : ''}
            </span>
          </p>
        </div>
      </div>

      <div
        className="mt-1.5 h-0.5 overflow-hidden rounded-full bg-white/[0.06]"
        aria-hidden
      >
        <div
          className="h-full rounded-full bg-bh-teal/60 transition-[width] duration-1000 ease-linear"
          style={{ width: `${(parts?.dayProgress ?? 0) * 100}%` }}
        />
      </div>
    </div>
  );
}
