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
  rn: 'bg-bh-accent-blue',
  ward: 'bg-bh-success',
  draft: 'bg-bh-text-muted',
  open: 'bg-bh-teal',
  filled: 'bg-emerald-500',
  amber: 'bg-bh-honey',
  done: 'bg-bh-success',
  danger: 'bg-bh-danger',
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
      className="rounded-2xl border border-bh-border bg-bh-surface p-4 shadow-[0_4px_16px_rgba(7,29,48,0.04)] sm:p-5"
      aria-labelledby="upcoming-shifts-heading"
    >
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2
          id="upcoming-shifts-heading"
          className="text-[17px] font-bold tracking-tight text-bh-text"
        >
          Upcoming shifts
        </h2>
        <Link
          href={`/org/${slug}/shifts?range=upcoming`}
          className="text-sm font-semibold text-bh-accent-blue hover:underline"
        >
          View all
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-bh-border bg-bh-subtle/40 px-3 py-7 text-center">
          <CalendarDays
            className="mx-auto h-5 w-5 text-bh-accent-blue"
            aria-hidden
          />
          <p className="mt-2 text-sm font-semibold text-bh-text">No upcoming shifts</p>
          <p className="mt-1 text-xs text-bh-text-secondary">
            Published openings will show here.
          </p>
          {showCreateInEmpty && canCreate ? (
            <Button asChild variant="honey" size="sm" className="mt-4 rounded-xl">
              <Link href={`/org/${slug}/shifts/new`}>Create shift</Link>
            </Button>
          ) : null}
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((event) => {
            const ymd = ymdFromIsoInTimezone(event.startsAt, timeZone);
            const kind = relativeDateKind(event.startsAt, todayYmd, tomorrow, ymd);
            const dateLabel =
              kind === 'today' ? 'Today' : kind === 'tomorrow' ? 'Tomorrow' : ymd;

            return (
              <li key={event.id}>
                <Link
                  href={event.href}
                  className="group flex gap-3 rounded-xl border border-bh-border/70 bg-bh-subtle/30 px-3 py-2.5 transition-colors hover:border-bh-border-strong hover:bg-bh-subtle/70 focus-visible:ring-2 focus-visible:ring-bh-teal"
                >
                  <span
                    className={cn(
                      'mt-1 w-1 shrink-0 self-stretch rounded-full',
                      TONE_BAR[event.tone],
                    )}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className="bh-tabular text-xs font-bold text-bh-text">
                        {formatTimeInTimezone(event.startsAt, timeZone)}–
                        {formatTimeInTimezone(event.endsAt, timeZone)}
                      </span>
                      <ShiftStatusBadge status={event.status} />
                    </span>
                    <span className="mt-0.5 block truncate text-sm font-semibold text-bh-text group-hover:text-bh-accent-blue">
                      {event.title}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-bh-text-secondary">
                      {[event.locationName, event.roleLabel].filter(Boolean).join(' · ')}
                    </span>
                    <span className="mt-0.5 block text-[11px] font-medium text-bh-text-muted">
                      {dateLabel}
                    </span>
                  </span>
                  <ArrowRight
                    className="mt-1 h-4 w-4 shrink-0 text-bh-text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-bh-accent-blue"
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
