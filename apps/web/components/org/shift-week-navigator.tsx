'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';

function isoWeekKey(date: Date, timeZone: string) {
  return formatInTimeZone(date, timeZone, 'R-II');
}

function isoWeekKeyYmd(ymd: string, timeZone: string) {
  return formatInTimeZone(fromZonedTime(`${ymd}T12:00:00`, timeZone), timeZone, 'R-II');
}

function weekProgressPercent(dateYmd: string, now: Date, timeZone: string) {
  const selected = isoWeekKeyYmd(dateYmd, timeZone);
  const current = isoWeekKey(now, timeZone);
  if (selected < current) return 100;
  if (selected > current) return 0;
  const isoDow = Number(formatInTimeZone(now, timeZone, 'i'));
  const hours = Number(formatInTimeZone(now, timeZone, 'H'));
  const minutes = Number(formatInTimeZone(now, timeZone, 'm'));
  const seconds = Number(formatInTimeZone(now, timeZone, 's'));
  const elapsed = (isoDow - 1) * 86400 + hours * 3600 + minutes * 60 + seconds;
  return Math.min(100, Math.max(0, (elapsed / (7 * 86400)) * 100));
}

export function ShiftWeekNavigator({
  dateLabel,
  weekLabel,
  dateYmd,
  timeZone,
  prevHref,
  nextHref,
  todayHref,
  initialNowIso,
}: {
  dateLabel: string;
  weekLabel: string;
  dateYmd: string;
  timeZone: string;
  prevHref: string;
  nextHref: string;
  todayHref: string;
  initialNowIso: string;
}) {
  const [now, setNow] = useState(() => new Date(initialNowIso));

  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const id = window.setInterval(tick, reduced ? 60_000 : 1000);
    return () => window.clearInterval(id);
  }, []);

  const hours = formatInTimeZone(now, timeZone, 'HH');
  const minutes = formatInTimeZone(now, timeZone, 'mm');
  const viewingCurrentWeek =
    isoWeekKeyYmd(dateYmd, timeZone) === isoWeekKey(now, timeZone);
  const progress = weekProgressPercent(dateYmd, now, timeZone);

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-white/50 bg-white/25 px-2.5 py-2 shadow-[0_10px_28px_rgba(7,29,48,0.06)] backdrop-blur-xl backdrop-saturate-150"
      aria-label="Week navigator"
    >
      <span
        aria-hidden
        className="bh-orb-drift pointer-events-none absolute -left-7 -top-8 h-20 w-20 rounded-full bg-bh-teal/30 blur-2xl"
      />
      <span
        aria-hidden
        className="bh-orb-drift pointer-events-none absolute -bottom-8 -right-6 h-16 w-16 rounded-full bg-[#071d30]/15 blur-2xl"
        style={{ animationDelay: '-6s' }}
      />

      <div className="relative flex items-center gap-1.5">
        <Link
          href={prevHref}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-bh-text-muted transition-colors hover:bg-white/45 hover:text-[#071d30] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bh-teal"
          aria-label="Previous week"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>

        <div className="min-w-[11.5rem] flex-1 px-0.5">
          <div className="flex items-baseline justify-between gap-3">
            <p className="truncate text-sm font-semibold tracking-tight text-[#071d30]">
              {dateLabel}
            </p>
            <p
              className="bh-tabular shrink-0 text-[13px] font-semibold leading-none tracking-tight text-[#071d30]"
              aria-live="polite"
              aria-atomic="true"
            >
              <span>{hours}</span>
              <span className="bh-clock-colon mx-px text-bh-teal-strong" aria-hidden>
                :
              </span>
              <span>{minutes}</span>
            </p>
          </div>
          <div className="mt-0.5 flex items-center justify-between gap-2">
            <p className="truncate text-[11px] font-medium text-bh-text-muted">{weekLabel}</p>
            {viewingCurrentWeek ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-bh-teal-strong">
                <span
                  className="bh-soft-pulse h-1.5 w-1.5 rounded-full bg-bh-teal"
                  aria-hidden
                />
                Live
              </span>
            ) : (
              <Link
                href={todayHref}
                className="text-[10px] font-semibold uppercase tracking-[0.12em] text-bh-teal-strong transition-colors hover:text-[#071d30]"
              >
                Today
              </Link>
            )}
          </div>
        </div>

        <Link
          href={nextHref}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-bh-text-muted transition-colors hover:bg-white/45 hover:text-[#071d30] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bh-teal"
          aria-label="Next week"
        >
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      <div
        className="relative mt-1.5 h-0.5 overflow-hidden rounded-full bg-white/40"
        aria-hidden
      >
        <div
          className="h-full rounded-full bg-bh-teal/70 transition-[width] duration-1000 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
