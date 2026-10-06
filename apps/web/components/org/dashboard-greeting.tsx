import { CalendarDays } from 'lucide-react';
import Image from 'next/image';

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
        'relative overflow-hidden border border-bh-border/80',
        'shadow-[0_18px_48px_rgba(7,29,48,0.16)]',
        '-mx-4 -mt-6 w-[calc(100%+2rem)] rounded-none sm:-mx-6 sm:w-[calc(100%+3rem)] sm:rounded-2xl lg:-mx-8 lg:-mt-8 lg:w-[calc(100%+4rem)]',
      ].join(' ')}
    >
      <div className="relative min-h-[260px] w-full sm:min-h-[300px] lg:min-h-[340px] xl:min-h-[380px]">
        <Image
          src="/org/bridge-hive-dashboard-banner.webp"
          alt=""
          fill
          priority
          sizes="(max-width: 768px) 100vw, min(1440px, 100vw)"
          className="object-cover object-[center_42%]"
        />

        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#061726]/72 via-[#061726]/18 to-[#061726]/10"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#061726]/40 via-transparent to-[#061726]/10"
          aria-hidden
        />

        <div className="relative z-10 flex h-full min-h-[260px] flex-col justify-end gap-6 p-6 sm:min-h-[300px] sm:p-8 lg:min-h-[340px] lg:flex-row lg:items-end lg:justify-between lg:p-10 xl:min-h-[380px]">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#f5c518]">
                Welcome back
              </p>
              <span className="h-px w-12 bg-[#f5c518]/75 sm:w-16" aria-hidden />
            </div>

            <h1 className="mt-3 text-[30px] font-semibold leading-[1.05] tracking-[-0.02em] text-white sm:text-[38px] lg:text-[44px]">
              {greeting},{' '}
              <span className="font-bold uppercase tracking-[0.08em] text-white">
                {firstName}
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
    </div>
  );
}
