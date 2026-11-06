'use client';

import { CheckCircle2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { formatInTimeZone } from 'date-fns-tz';

export function AllClearStatus({
  timeZone,
  initialNowIso,
}: {
  timeZone: string;
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

  return (
    <div
      className="relative overflow-hidden rounded-xl border border-emerald-300/35 bg-[linear-gradient(155deg,#0b5d3c_0%,#198754_48%,#0f9a62_100%)] px-4 py-4 text-white shadow-[0_12px_28px_rgba(25,135,84,0.28)]"
      role="status"
    >
      <span
        aria-hidden
        className="bh-orb-drift pointer-events-none absolute -left-8 -top-10 h-24 w-24 rounded-full bg-emerald-300/40 blur-2xl"
      />
      <span
        aria-hidden
        className="bh-orb-drift pointer-events-none absolute -bottom-10 -right-6 h-20 w-20 rounded-full bg-white/20 blur-2xl"
        style={{ animationDelay: '-5s' }}
      />

      <div className="relative flex items-start gap-3">
        <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/15 text-white ring-1 ring-white/30">
          <span
            aria-hidden
            className="bh-soft-pulse absolute inset-0 rounded-xl bg-emerald-200/30"
          />
          <CheckCircle2 className="relative h-5 w-5" strokeWidth={2.4} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[15px] font-semibold tracking-tight">All clear for now</p>
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-100">
              <span
                className="bh-soft-pulse h-1.5 w-1.5 rounded-full bg-[#b8f0d0]"
                aria-hidden
              />
              Live
            </span>
          </div>
          <p className="mt-0.5 text-[13px] leading-5 text-white/85">
            No drafts, deadlines, or timesheets need action from this organization.
          </p>
          <div className="mt-3 flex items-center justify-between gap-2">
            <p
              className="bh-tabular text-[12px] font-semibold text-emerald-100"
              aria-live="polite"
              aria-atomic="true"
            >
              <span>{hours}</span>
              <span className="bh-clock-colon mx-px" aria-hidden>
                :
              </span>
              <span>{minutes}</span>
              <span className="ml-1.5 font-medium uppercase tracking-[0.12em] text-white/60">
                Clear
              </span>
            </p>
            <p className="bh-tabular text-[11px] font-bold text-white">100%</p>
          </div>
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/20" aria-hidden>
            <div className="h-full w-full rounded-full bg-[#b8f0d0] shadow-[0_0_12px_rgba(184,240,208,0.85)]" />
          </div>
        </div>
      </div>
    </div>
  );
}
