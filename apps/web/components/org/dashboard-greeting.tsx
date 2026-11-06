import { CalendarDays } from 'lucide-react';

function initialsFor(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const letters =
    words.length > 1 ? `${words[0][0]}${words[1][0]}` : (words[0] ?? '').slice(0, 2);
  return letters.toUpperCase() || 'BH';
}

export function DashboardGreeting({
  firstName,
  orgName,
  dateLabel,
  weekLabel,
  greeting,
}: {
  firstName: string;
  orgName: string;
  orgLogoUrl?: string | null;
  dateLabel: string;
  weekLabel?: string;
  greeting: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-[linear-gradient(155deg,#16384f_0%,#071d30_58%,#0c3a42_100%)] px-5 py-6 text-white shadow-[0_18px_40px_rgba(7,29,48,0.28)] sm:px-6 sm:py-7 lg:px-8">
      <span
        aria-hidden
        className="bh-orb-drift pointer-events-none absolute -left-10 -top-12 h-40 w-40 rounded-full bg-bh-teal/30 blur-3xl"
      />
      <span
        aria-hidden
        className="bh-orb-drift pointer-events-none absolute -bottom-16 right-8 h-36 w-36 rounded-full bg-[#e4b334]/20 blur-3xl"
        style={{ animationDelay: '-7s' }}
      />
      <span
        aria-hidden
        className="bh-org-topbar-line pointer-events-none absolute inset-x-0 bottom-0 h-[3px]"
      />

      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <div
            aria-hidden
            className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#e4b334] text-[15px] font-bold tracking-[0.08em] text-[#071d30] shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_10px_22px_rgba(228,179,52,0.35)] sm:flex"
          >
            {initialsFor(orgName)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-[11px] font-semibold uppercase tracking-[0.18em] text-[#f3d27a]">
              Organization workspace
              <span className="mx-2 text-white/40" aria-hidden>
                ·
              </span>
              <span className="text-white/70">{orgName}</span>
            </p>
            <h1 className="mt-1.5 truncate text-[28px] font-bold leading-none tracking-[-0.04em] text-white sm:text-[34px]">
              {greeting}, {firstName}
            </h1>
            <p className="mt-2 text-[15px] text-white/75">
              Overview of shifts, timesheets, and coverage for today.
            </p>
          </div>
        </div>

        <dl className="flex shrink-0 items-stretch self-start overflow-hidden rounded-2xl bg-white/10 ring-1 ring-white/15 backdrop-blur-md lg:self-center">
          <div className="flex items-center gap-3 px-4 py-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#e4b334] text-[#071d30]">
              <CalendarDays className="h-4 w-4" strokeWidth={2.4} aria-hidden />
            </span>
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/55">
                Today
              </dt>
              <dd className="text-sm font-semibold text-white">{dateLabel}</dd>
            </div>
          </div>
          {weekLabel ? (
            <div className="flex flex-col justify-center border-l border-white/15 px-4 py-3">
              <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/55">
                Period
              </dt>
              <dd className="bh-tabular text-sm font-semibold text-white">{weekLabel}</dd>
            </div>
          ) : null}
        </dl>
      </div>
    </div>
  );
}
