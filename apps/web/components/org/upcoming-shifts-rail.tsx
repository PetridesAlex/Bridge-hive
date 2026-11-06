import {
  relativeDateKind,
  type CalendarEvent,
} from '@bridge-hive/domain';
import { ArrowRight, CalendarDays } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { ShiftStatusBadge } from '@/components/shift-status-badge';
import {
  formatTimeInTimezone,
  tomorrowYmdInTimezone,
  ymdFromIsoInTimezone,
} from '@/lib/org-calendar-time';
import { cn } from '@/lib/utils';

const TONE_BAR: Record<CalendarEvent['tone'], string> = {
  rn: 'bg-[#5b9bff]',
  ward: 'bg-[#7dffb3]',
  physio: 'bg-[#e4b334]',
  draft: 'bg-white/45',
  open: 'bg-[#2ad4e0]',
  filled: 'bg-[#7dffb3]',
  amber: 'bg-[#e4b334]',
  done: 'bg-[#7dffb3]',
  danger: 'bg-[#ff8a7a]',
};

const STATUS_BADGE: Record<string, string> = {
  published: 'bg-[#e4b334] text-[#071d30]',
  filled: 'bg-[#7dffb3] text-[#071d30]',
  draft: 'bg-white/15 text-white',
  in_progress: 'bg-[#5b9bff] text-[#071d30]',
  cancelled: 'bg-[#ff8a7a] text-[#071d30]',
};

export function UpcomingShiftsRail({
  slug,
  timeZone,
  todayYmd,
  events,
  canCreate,
  showCreateInEmpty,
}: {
  slug: string;
  timeZone: string;
  todayYmd: string;
  events: CalendarEvent[];
  canCreate?: boolean;
  showCreateInEmpty?: boolean;
}) {
  const tomorrow = tomorrowYmdInTimezone(timeZone);
  const items = events.slice(0, 5);

  return (
    <section
      className="relative overflow-hidden rounded-2xl border border-white/45 bg-white/30 p-4 shadow-[0_12px_28px_rgba(7,29,48,0.06)] backdrop-blur-md sm:p-5"
      aria-labelledby="upcoming-shifts-heading"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -left-10 -top-12 h-28 w-28 rounded-full bg-bh-teal/20 blur-3xl"
      />
      <span
        aria-hidden
        className="bh-orb-drift pointer-events-none absolute -bottom-14 right-0 h-24 w-24 rounded-full bg-[#e4b334]/15 blur-3xl"
      />

      <div className="relative mb-4 flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2.5">
          <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#e4b334] text-[#071d30] shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_8px_16px_rgba(228,179,52,0.28)]">
            <CalendarDays className="h-4 w-4" strokeWidth={2.4} aria-hidden />
          </span>
          <div className="min-w-0">
            <h2
              id="upcoming-shifts-heading"
              className="text-[16px] font-bold tracking-tight text-[#071d30]"
            >
              Upcoming shifts
            </h2>
            <p className="mt-0.5 text-[12px] font-medium text-[#071d30]/65">
              {items.length === 0
                ? 'Nothing scheduled'
                : events.length > items.length
                  ? `Next ${items.length} of ${events.length}`
                  : `${events.length} scheduled`}
            </p>
          </div>
        </div>
        <Link
          href={`/org/${slug}/shifts?range=upcoming`}
          prefetch={false}
          className="group inline-flex shrink-0 items-center gap-1 rounded-lg bg-[#071d30] px-2.5 py-1.5 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#0b2a40] motion-reduce:hover:translate-y-0"
        >
          View all
          <ArrowRight
            className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
            aria-hidden
          />
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="relative rounded-xl border border-white/50 bg-white/40 px-3 py-7 text-center backdrop-blur-sm">
          <CalendarDays
            className="mx-auto h-5 w-5 text-bh-teal-strong"
            aria-hidden
          />
          <p className="mt-2 text-sm font-semibold text-[#071d30]">No upcoming shifts</p>
          <p className="mt-1 text-xs text-[#071d30]/65">
            Published openings will show here.
          </p>
          {showCreateInEmpty && canCreate ? (
            <Button asChild variant="honey" size="sm" className="mt-4 rounded-xl">
              <Link href={`/org/${slug}/shifts/new`}>Create shift</Link>
            </Button>
          ) : null}
        </div>
      ) : (
        <ul className="relative space-y-2">
          {items.map((event, index) => {
            const ymd = ymdFromIsoInTimezone(event.startsAt, timeZone);
            const kind = relativeDateKind(event.startsAt, todayYmd, tomorrow, ymd);
            const dateLabel =
              kind === 'today' ? 'Today' : kind === 'tomorrow' ? 'Tomorrow' : ymd;
            const urgent = kind === 'today' || kind === 'tomorrow';

            return (
              <li
                key={event.id}
                className="bh-drop-in"
                style={{ animationDelay: `${index * 70}ms` }}
              >
                <Link
                  href={event.href}
                  className="group relative flex gap-3 overflow-hidden rounded-xl bg-[linear-gradient(155deg,#16384f_0%,#071d30_72%)] p-3 text-white shadow-[0_12px_24px_rgba(7,29,48,0.22)] ring-1 ring-white/10 transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_28px_rgba(7,29,48,0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bh-teal motion-reduce:hover:translate-y-0"
                >
                  <span
                    className={cn(
                      'w-1.5 shrink-0 self-stretch rounded-full',
                      TONE_BAR[event.tone],
                    )}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className="bh-tabular text-[15px] font-bold tracking-tight text-[#f3d27a]">
                        {formatTimeInTimezone(event.startsAt, timeZone)}–
                        {formatTimeInTimezone(event.endsAt, timeZone)}
                      </span>
                      <ShiftStatusBadge
                        status={event.status}
                        className={cn(
                          'px-2 py-0.5 text-[10px] uppercase tracking-[0.08em]',
                          STATUS_BADGE[event.status] ?? 'bg-white/15 text-white',
                        )}
                      />
                    </span>
                    <span className="mt-1 block truncate text-[15px] font-bold leading-snug text-white">
                      {event.title}
                    </span>
                    <span className="mt-0.5 block truncate text-xs font-medium text-white/75">
                      {[event.locationName, event.roleLabel].filter(Boolean).join(' · ')}
                    </span>
                    <span
                      className={cn(
                        'mt-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em]',
                        urgent
                          ? 'bg-[#e4b334] text-[#071d30]'
                          : 'bg-white/12 text-white/85',
                      )}
                    >
                      {dateLabel}
                    </span>
                  </span>
                  <ArrowRight
                    className="mt-1 h-4 w-4 shrink-0 text-white/55 transition-transform group-hover:translate-x-0.5 group-hover:text-[#e4b334]"
                    aria-hidden
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
