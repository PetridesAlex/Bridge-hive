import { CalendarDays } from 'lucide-react';

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
    <div
      className={[
        'relative overflow-hidden border border-[#14324a]/80',
        'bg-[linear-gradient(145deg,#0a2538_0%,#071d30_48%,#0c3a42_100%)]',
        'shadow-[0_18px_48px_rgba(7,29,48,0.18)]',
        '-mx-4 -mt-6 w-[calc(100%+2rem)] rounded-none sm:-mx-6 sm:w-[calc(100%+3rem)] sm:rounded-2xl lg:-mx-8 lg:-mt-8 lg:w-[calc(100%+4rem)]',
      ].join(' ')}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-bh-teal/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 left-10 h-52 w-52 rounded-full bg-[#f5c518]/18 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40 [background-image:radial-gradient(circle_at_18%_22%,rgba(255,255,255,0.08)_0_1px,transparent_1.5px),radial-gradient(circle_at_72%_64%,rgba(255,255,255,0.06)_0_1px,transparent_1.5px)] [background-size:28px_28px]"
      />

      <div className="relative z-10 flex min-h-[200px] flex-col justify-end gap-6 p-6 sm:min-h-[220px] sm:p-8 lg:min-h-[240px] lg:flex-row lg:items-end lg:justify-between lg:p-10">
        <div className="max-w-2xl">
          <div className="flex items-center gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#f5c518]">
              Welcome back
            </p>
            <span className="h-px w-12 bg-[#f5c518]/75 sm:w-16" aria-hidden />
          </div>

          <h1 className="mt-3 text-[30px] font-semibold leading-[1.05] tracking-[-0.02em] text-white sm:text-[38px] lg:text-[44px]">
            <span className="bh-greeting-sheen-text inline">
              {greeting},{' '}
            </span>
            <span className="relative inline-block align-bottom">
              <span className="bh-greeting-sheen-text font-bold uppercase tracking-[0.08em]">
                {firstName}
              </span>
              <span className="bh-greeting-wave-underline" aria-hidden />
            </span>
            <span
              className="bh-greeting-wave-hand ml-2.5 inline-flex select-none align-middle text-[1.05em] leading-none drop-shadow-[0_6px_14px_rgba(245,197,24,0.28)] sm:ml-3.5 sm:text-[1.15em]"
              aria-hidden
            >
              👋
            </span>
          </h1>

          <p className="mt-3 max-w-xl text-[15px] leading-7 text-white/80 sm:text-base">
            Here’s what needs attention at{' '}
            <span className="font-semibold tracking-wide text-white underline decoration-[#f5c518]/70 decoration-2 underline-offset-[5px]">
              {orgName}
            </span>
            .
          </p>
        </div>

        <div className="inline-flex shrink-0 items-center gap-3 self-start rounded-2xl border border-white/25 bg-white/12 px-4 py-3 shadow-[0_10px_30px_rgba(7,29,48,0.22)] backdrop-blur-xl lg:self-end">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white">
            <CalendarDays className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <p className="text-sm font-semibold tracking-wide text-white">
              {dateLabel}
            </p>
            {weekLabel ? (
              <p className="mt-0.5 text-xs font-medium tracking-[0.06em] text-white/70">
                {weekLabel}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
