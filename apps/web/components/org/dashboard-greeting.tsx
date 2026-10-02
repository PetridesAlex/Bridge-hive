'use client';

import { CalendarDays } from 'lucide-react';
import { useEffect, useState } from 'react';

import { OrgMark } from '@/components/org/org-mark';

export function DashboardGreeting({
  firstName,
  orgName,
  orgLogoUrl,
  dateLabel,
  weekLabel,
}: {
  firstName: string;
  orgName: string;
  orgLogoUrl?: string | null;
  /** e.g. Monday, 29 Sept 2026 */
  dateLabel: string;
  /** e.g. Week 40 */
  weekLabel?: string;
}) {
  const [greeting, setGreeting] = useState('Hello');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-bh-border bg-bh-surface px-5 py-5 shadow-[0_8px_24px_rgba(7,29,48,0.05)] sm:px-6 sm:py-6">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(37,99,235,0.12),_transparent_55%),radial-gradient(ellipse_at_bottom_right,_rgba(224,170,24,0.14),_transparent_50%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-8 top-0 h-40 w-64 opacity-40"
        aria-hidden
      >
        <svg viewBox="0 0 280 140" className="h-full w-full" fill="none">
          <path
            d="M0 90 C60 40 100 120 160 70 C210 30 250 90 280 55 L280 140 L0 140 Z"
            fill="url(#greet-wave)"
          />
          <defs>
            <linearGradient id="greet-wave" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#2563EB" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#E0AA18" stopOpacity="0.12" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <OrgMark
            displayName={orgName}
            logoUrl={orgLogoUrl}
            size="display"
            className="shadow-md ring-bh-border"
          />
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-bh-text-muted">
              Dashboard
            </p>
            <h1 className="mt-1 text-[26px] font-bold leading-tight tracking-tight text-bh-text sm:text-[30px]">
              {greeting}, {firstName}
            </h1>
            <p className="mt-1.5 max-w-xl text-sm leading-6 text-bh-text-secondary">
              Here’s what needs attention at{' '}
              <span className="font-semibold text-bh-text">{orgName}</span>.
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3 rounded-2xl border border-bh-border bg-bh-surface/95 px-4 py-3 shadow-sm">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-bh-accent-blue-soft text-bh-accent-blue">
            <CalendarDays className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <p className="text-sm font-semibold text-bh-text">{dateLabel}</p>
            {weekLabel ? (
              <p className="mt-0.5 text-xs font-medium text-bh-text-muted">{weekLabel}</p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
