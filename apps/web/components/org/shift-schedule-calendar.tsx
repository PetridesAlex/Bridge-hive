'use client';

import {
  WORKER_ROLE_LABELS,
  WORKER_ROLES,
  layoutOverlappingEvents,
  splitCrossMidnightSegments,
  type CalendarEvent,
  type CalendarViewMode,
} from '@bridge-hive/domain';
import {
  Banknote,
  Briefcase,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Filter,
  MapPin,
  ArrowRight,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { ShiftStartsIn } from '@/components/org/shift-starts-in';
import { ScheduleStatTiles } from '@/components/org/schedule-stat-tiles';
import { formatRate } from '@/lib/format';
import {
  formatTimeInTimezone,
  shiftCalendarAnchor,
  ymdFromIsoInTimezone,
} from '@/lib/org-calendar-time';
import { cn } from '@/lib/utils';
import { formatInTimeZone } from 'date-fns-tz';

const HOUR_START = 7;
const HOUR_END = 20;
const EVENT_MIN_HEIGHT = 28;
const EVENT_GUTTER_PX = 3;
const TIME_LABEL_COL = 48;

function pxPerHourForView(view: CalendarViewMode): number {
  if (view === 'day') return 56;
  return 48;
}

const TONE_CLASS: Record<CalendarEvent['tone'], string> = {
  rn: 'border-l-[3px] border-bh-accent-blue border-y-bh-accent-blue/20 border-r-bh-accent-blue/20 bg-[linear-gradient(135deg,#eff6ff_0%,#dbeafe_100%)] text-bh-text shadow-[0_4px_12px_rgba(37,99,235,0.12)]',
  ward: 'border-l-[3px] border-bh-success border-y-bh-success/20 border-r-bh-success/20 bg-[linear-gradient(135deg,#e7f6ed_0%,#d1fae5_100%)] text-bh-text shadow-[0_4px_12px_rgba(25,135,84,0.12)]',
  physio: 'border-l-[3px] border-bh-honey border-y-bh-honey/30 border-r-bh-honey/30 bg-[linear-gradient(135deg,#fff8e8_0%,#fef3c7_100%)] text-bh-text shadow-[0_4px_12px_rgba(224,170,24,0.14)]',
  draft: 'border-l-[3px] border-bh-border-strong border-y-bh-border border-r-bh-border bg-bh-subtle text-bh-text-secondary',
  open: 'border-l-[3px] border-bh-teal border-y-bh-teal/25 border-r-bh-teal/25 bg-[linear-gradient(135deg,#e4f7f9_0%,#ccfbf1_100%)] text-bh-text shadow-[0_4px_12px_rgba(22,166,182,0.14)]',
  filled: 'border-l-[3px] border-emerald-500 border-y-emerald-300/50 border-r-emerald-300/50 bg-[linear-gradient(135deg,#ecfdf5_0%,#d1fae5_100%)] text-bh-text shadow-[0_4px_12px_rgba(16,185,129,0.12)]',
  amber: 'border-l-[3px] border-bh-honey-strong border-y-bh-honey/35 border-r-bh-honey/35 bg-[linear-gradient(135deg,#fff5d6_0%,#fde68a_100%)] text-bh-text shadow-[0_4px_12px_rgba(201,146,15,0.16)]',
  done: 'border-l-[3px] border-bh-success border-y-bh-success/25 border-r-bh-success/25 bg-bh-success-soft/90 text-bh-text',
  danger: 'border-l-[3px] border-bh-danger border-y-bh-danger/25 border-r-bh-danger/25 bg-bh-danger-soft/90 text-bh-text-secondary',
};

const MONTH_CHIP_TONE: Record<CalendarEvent['tone'], string> = {
  rn: 'border-l-[3px] border-bh-accent-blue',
  ward: 'border-l-[3px] border-bh-success',
  physio: 'border-l-[3px] border-bh-honey',
  draft: 'border-l-[3px] border-bh-text-muted',
  open: 'border-l-[3px] border-bh-teal',
  filled: 'border-l-[3px] border-emerald-500',
  amber: 'border-l-[3px] border-bh-honey-strong',
  done: 'border-l-[3px] border-bh-success',
  danger: 'border-l-[3px] border-bh-danger',
};

function coveragePillClass(status: string) {
  switch (status) {
    case 'published':
      return 'bg-bh-teal-soft text-bh-teal-strong';
    case 'filled':
    case 'in_progress':
    case 'completed':
      return 'bg-bh-success-soft text-bh-success';
    case 'awaiting_approval':
      return 'bg-bh-warning-soft text-bh-warning';
    case 'cancelled':
    case 'disputed':
      return 'bg-bh-danger-soft text-bh-danger';
    default:
      return 'bg-bh-subtle text-bh-text-secondary';
  }
}

const WEEKDAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

const STAFFED_STATUSES = new Set([
  'filled',
  'in_progress',
  'awaiting_approval',
  'completed',
]);

type LocationOption = { id: string; name: string };

export type ShiftScheduleCalendarProps = {
  slug: string;
  /** Query-string base for view/date/filter links. Defaults to org dashboard. */
  basePath?: string;
  /** When true, day/week/month is stored as `cal` and `view=calendar` is preserved (shifts list page). */
  embedInShiftsList?: boolean;
  /** Dashboard: hide Day/Week toggles and always render the month board. */
  monthOnly?: boolean;
  timeZone: string;
  view: CalendarViewMode;
  dateYmd: string;
  periodLabel: string;
  dayKeys: string[];
  dayStartMs: Record<string, number>;
  todayYmd: string;
  events: CalendarEvent[];
  locations: LocationOption[];
  locationFilter: string | null;
  roleFilter: string | null;
  canCreateShift: boolean;
  canReviewTimesheets: boolean;
  loadError?: boolean;
  filteredEmpty?: boolean;
};

function buildHref(
  basePath: string,
  params: {
    view: CalendarViewMode;
    date: string;
    location?: string | null;
    role?: string | null;
  },
  options?: { embedInShiftsList?: boolean },
) {
  const q = new URLSearchParams();
  if (options?.embedInShiftsList) {
    q.set('view', 'calendar');
    q.set('cal', params.view);
  } else {
    q.set('view', params.view);
  }
  q.set('date', params.date);
  if (params.location) q.set('location', params.location);
  if (params.role) q.set('role', params.role);
  return `${basePath}?${q.toString()}`;
}

function eventAccessibleName(
  event: CalendarEvent,
  timeZone: string,
): string {
  const start = formatTimeInTimezone(event.startsAt, timeZone);
  const end = formatTimeInTimezone(event.endsAt, timeZone);
  const place = [event.locationName, event.wardName].filter(Boolean).join(', ');
  return [
    event.title,
    `${start} to ${end}`,
    event.roleLabel,
    place || null,
    event.coverageLabel,
  ]
    .filter(Boolean)
    .join(', ');
}

function minutesFromDayStart(ms: number, dayStartMs: number): number {
  return Math.max(0, (ms - dayStartMs) / 60000);
}

function visibleHourRange(
  events: CalendarEvent[],
  dayKeys: string[],
  dayStartMs: Record<string, number>,
): {
  start: number;
  end: number;
} {
  let start = HOUR_START;
  let end = HOUR_END;
  for (const e of events) {
    const segments = splitCrossMidnightSegments({
      eventId: e.id,
      startMs: new Date(e.startsAt).getTime(),
      endMs: new Date(e.endsAt).getTime(),
      dayKeys,
      dayStartMs,
    });
    for (const seg of segments) {
      const dayStart = dayStartMs[seg.dayKey];
      if (dayStart == null) continue;
      const sm = minutesFromDayStart(seg.startMs, dayStart) / 60;
      const em = minutesFromDayStart(seg.endMs, dayStart) / 60;
      if (sm < start) start = Math.max(0, Math.floor(sm));
      if (em > end) end = Math.min(24, Math.ceil(em));
    }
  }
  if (end <= start) {
    start = HOUR_START;
    end = HOUR_END;
  }
  // Keep the grid to a professional workday window (~13h) so week columns stay readable.
  if (end - start > 13) {
    start = Math.max(0, Math.min(start, HOUR_START));
    end = Math.min(24, Math.max(start + 13, HOUR_END));
    if (end - start > 13) {
      end = start + 13;
    }
  }
  return { start, end };
}

function EventBlockContent({
  event,
  timeZone,
  height,
  dense,
}: {
  event: CalendarEvent;
  timeZone: string;
  height: number;
  dense?: boolean;
}) {
  const start = formatTimeInTimezone(event.startsAt, timeZone);
  const end = formatTimeInTimezone(event.endsAt, timeZone);
  const place = [event.locationName, event.wardName].filter(Boolean).join(' · ');
  const compact = height < 40;
  const medium = height >= 40 && height < 88;

  if (compact) {
    return (
      <span className="flex h-full min-h-0 items-center gap-1 overflow-hidden px-0.5">
        <span className="bh-tabular shrink-0 text-[10px] font-bold text-bh-text">
          {start}
        </span>
        <span className="truncate text-[10px] font-semibold leading-none text-bh-text">
          {event.title}
        </span>
      </span>
    );
  }

  if (medium || dense) {
    return (
      <span className="flex min-h-0 flex-col gap-0.5 overflow-hidden">
        <span className="truncate text-[11px] font-bold leading-tight text-bh-text">
          {event.title}
        </span>
        <span className="bh-tabular truncate text-[10px] font-semibold leading-tight text-bh-text/80">
          {start}–{end}
        </span>
        {!dense ? (
          <span className="truncate text-[10px] font-medium leading-tight text-bh-text/70">
            {event.positionsLabel &&
            event.requiredPositions != null &&
            event.requiredPositions > 1
              ? event.positionsLabel
              : event.coverageLabel}
          </span>
        ) : null}
      </span>
    );
  }

  // Tall blocks: keep copy pinned to the top so long shifts don’t look empty.
  return (
    <span className="flex min-h-0 flex-col gap-1 overflow-hidden">
      <span className="bh-tabular text-[11px] font-bold leading-none text-bh-text">
        {start}–{end}
      </span>
      <span className="truncate text-[12px] font-bold leading-tight text-bh-text">
        {event.title}
      </span>
      <span className="truncate text-[11px] font-medium leading-tight text-bh-text/75">
        {event.roleLabel}
      </span>
      {place ? (
        <span className="truncate text-[10px] leading-tight text-bh-text/65">
          {place}
        </span>
      ) : null}
      <span className="mt-1 inline-flex max-w-full self-start truncate rounded-md bg-bh-surface/70 px-1.5 py-0.5 text-[10px] font-bold leading-none text-bh-text shadow-sm">
        {event.positionsLabel &&
        event.requiredPositions != null &&
        event.requiredPositions > 1
          ? `${event.coverageLabel} · ${event.positionsLabel}`
          : event.coverageLabel}
      </span>
    </span>
  );
}

export function ShiftScheduleCalendar(props: ShiftScheduleCalendarProps) {
  const {
    slug,
    basePath: basePathProp,
    embedInShiftsList = false,
    monthOnly = false,
    timeZone,
    view: viewProp,
    dateYmd,
    periodLabel,
    dayKeys,
    dayStartMs,
    todayYmd,
    events,
    locations,
    locationFilter,
    roleFilter,
    canCreateShift,
    canReviewTimesheets,
    loadError,
    filteredEmpty,
  } = props;

  const basePath = basePathProp ?? `/org/${slug}/dashboard`;
  const view: CalendarViewMode = monthOnly ? 'month' : viewProp;
  const href = (
    params: {
      view: CalendarViewMode;
      date: string;
      location?: string | null;
      role?: string | null;
    },
  ) =>
    buildHref(
      basePath,
      {
        ...params,
        view: monthOnly ? 'month' : params.view,
      },
      { embedInShiftsList },
    );
  const router = useRouter();
  const [filterPending, startFilterTransition] = useTransition();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isNarrow, setIsNarrow] = useState(false);
  const [nowMs, setNowMs] = useState<number | null>(null);

  const pushFilterHref = (nextHref: string) => {
    startFilterTransition(() => {
      router.push(nextHref, { scroll: false });
    });
  };

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const apply = () => setIsNarrow(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  useEffect(() => {
    setNowMs(Date.now());
    const id = window.setInterval(() => setNowMs(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const selected = events.find((e) => e.id === selectedId) ?? null;

  const prevDate = shiftCalendarAnchor({
    timeZone,
    view,
    dateYmd,
    direction: 'prev',
  });
  const nextDate = shiftCalendarAnchor({
    timeZone,
    view,
    dateYmd,
    direction: 'next',
  });
  const todayAnchor = shiftCalendarAnchor({
    timeZone,
    view,
    dateYmd,
    direction: 'today',
  });

  const filterParams = { location: locationFilter, role: roleFilter };
  const hasFilters = Boolean(locationFilter || roleFilter);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const key of dayKeys) map.set(key, []);
    for (const event of events) {
      const segments = splitCrossMidnightSegments({
        eventId: event.id,
        startMs: new Date(event.startsAt).getTime(),
        endMs: new Date(event.endsAt).getTime(),
        dayKeys,
        dayStartMs,
      });
      for (const seg of segments) {
        const list = map.get(seg.dayKey) ?? [];
        if (!list.find((e) => e.id === event.id)) {
          list.push(event);
          map.set(seg.dayKey, list);
        }
      }
    }
    return map;
  }, [events, dayKeys, dayStartMs]);

  const openInView = events.filter((e) => e.status === 'published').length;
  const filledInView = events.filter(
    (e) => e.status === 'filled' || e.status === 'in_progress',
  ).length;
  const coveragePct =
    events.length > 0
      ? Math.round((filledInView / events.length) * 100)
      : 0;

  return (
    <section
      className="relative overflow-hidden rounded-[var(--bh-org-radius)] border border-white/50 bg-white/35 shadow-[0_1px_2px_rgba(7,29,48,0.04)] backdrop-blur-xl"
      aria-labelledby="shift-schedule-heading"
    >
      <div className="relative border-b border-white/40 px-4 py-4 sm:px-5">
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-bh-teal-strong">
              Coverage board
            </p>
            <div className="mt-2 flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#071d30]/[0.06] text-[#071d30]">
                <CalendarDays className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <h2
                  id="shift-schedule-heading"
                  className="text-[17px] font-semibold tracking-tight text-[#071d30] sm:text-[18px]"
                >
                  Shift schedule
                </h2>
                <p className="mt-0.5 text-sm text-bh-text-secondary">
                  Plan and monitor coverage across your locations.
                </p>
              </div>
            </div>
          </div>

          {monthOnly ? (
            <div className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-bh-subtle/70 px-3.5 py-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#071d30] text-white">
                <CalendarDays className="h-4 w-4" aria-hidden />
              </span>
              <div>
                <p className="text-xs font-semibold text-bh-text">Month board</p>
                <p className="text-[11px] font-medium text-bh-text-muted">
                  All shifts in this month
                </p>
              </div>
            </div>
          ) : (
            <div
              role="group"
              aria-label="Calendar view"
              className="inline-flex w-full shrink-0 rounded-2xl border border-bh-border/80 bg-white/80 p-1 shadow-sm backdrop-blur-sm lg:w-auto"
            >
              {(
                [
                  { mode: 'day' as const, label: 'Day', hint: 'Single day timeline' },
                  { mode: 'week' as const, label: 'Week', hint: '7-day coverage' },
                  { mode: 'month' as const, label: 'Month', hint: 'Month overview' },
                ] as const
              ).map(({ mode, label, hint }) => {
                const active = view === mode;
                return (
                  <Link
                    key={mode}
                    href={href({
                      view: mode,
                      date: dateYmd,
                      ...filterParams,
                    })}
                    aria-current={active ? 'true' : undefined}
                    title={hint}
                    className={cn(
                      'flex flex-1 flex-col items-center justify-center rounded-xl px-3 py-2 transition-all duration-200 sm:flex-none sm:items-start sm:px-3.5',
                      active
                        ? 'bg-[linear-gradient(155deg,#16384f_0%,#071d30_100%)] text-white shadow-[0_8px_18px_rgba(7,29,48,0.22)]'
                        : 'text-bh-text-secondary hover:bg-bh-subtle hover:text-bh-text',
                    )}
                  >
                    <span className="text-xs font-bold leading-none">{label}</span>
                    <span
                      className={cn(
                        'mt-1 hidden text-[10px] font-medium leading-none sm:block',
                        active ? 'text-white/70' : 'text-bh-text-muted',
                      )}
                    >
                      {hint}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {!loadError ? (
          <ScheduleStatTiles
            total={events.length}
            open={openInView}
            filled={filledInView}
            coveragePct={coveragePct}
          />
        ) : null}
      </div>

      <div className="flex flex-col gap-3 border-b border-white/40 bg-white/15 px-4 py-3.5 sm:px-5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <div className="inline-flex items-center gap-1 rounded-xl border border-bh-border/80 bg-bh-subtle/40 p-1">
            <Button
              asChild
              size="sm"
              variant="outline"
              className="h-8 w-8 rounded-lg border-transparent bg-white px-0 shadow-sm hover:border-bh-border"
              aria-label="Previous period"
            >
              <Link
                href={href({
                  view,
                  date: prevDate,
                  ...filterParams,
                })}
              >
                <ChevronLeft className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="sm"
              variant="outline"
              className="h-8 rounded-lg border-transparent bg-[linear-gradient(155deg,#16384f_0%,#071d30_100%)] px-3.5 font-semibold text-white shadow-sm hover:border-transparent hover:bg-[#0c2844] hover:text-white"
            >
              <Link
                href={href({
                  view,
                  date: todayAnchor,
                  ...filterParams,
                })}
              >
                Today
              </Link>
            </Button>
            <Button
              asChild
              size="sm"
              variant="outline"
              className="h-8 w-8 rounded-lg border-transparent bg-white px-0 shadow-sm hover:border-bh-border"
              aria-label="Next period"
            >
              <Link
                href={href({
                  view,
                  date: nextDate,
                  ...filterParams,
                })}
              >
                <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          <p
            className="min-w-0 rounded-xl border border-bh-border/70 bg-white px-3 py-1.5 text-[15px] font-semibold tracking-tight text-bh-text shadow-sm"
            aria-live="polite"
          >
            {periodLabel}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2" aria-busy={filterPending || undefined}>
          <span className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-bh-subtle px-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-bh-text-muted">
            <Filter className="h-3.5 w-3.5" aria-hidden />
            Filter
          </span>
          <label className="sr-only" htmlFor="cal-location">
            Location filter
          </label>
          <select
            id="cal-location"
            className="h-9 max-w-[min(100%,220px)] truncate rounded-xl border border-bh-border bg-white px-3 text-xs font-semibold text-bh-text shadow-sm focus-visible:border-bh-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bh-teal/25"
            value={locationFilter ?? ''}
            disabled={filterPending}
            onChange={(e) => {
              const next = e.target.value || null;
              pushFilterHref(
                href({
                  view,
                  date: dateYmd,
                  location: next,
                  role: roleFilter,
                }),
              );
            }}
          >
            <option value="">All locations</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
              </option>
            ))}
          </select>
          <label className="sr-only" htmlFor="cal-role">
            Required role filter
          </label>
          <select
            id="cal-role"
            className="h-9 max-w-[min(100%,200px)] truncate rounded-xl border border-bh-border bg-white px-3 text-xs font-semibold text-bh-text shadow-sm focus-visible:border-bh-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bh-teal/25"
            value={roleFilter ?? ''}
            disabled={filterPending}
            onChange={(e) => {
              const next = e.target.value || null;
              pushFilterHref(
                href({
                  view,
                  date: dateYmd,
                  location: locationFilter,
                  role: next,
                }),
              );
            }}
          >
            <option value="">All roles</option>
            {WORKER_ROLES.map((role) => (
              <option key={role} value={role}>
                {WORKER_ROLE_LABELS[role]}
              </option>
            ))}
          </select>
          {hasFilters ? (
            <Link
              href={href({ view, date: dateYmd })}
              className="inline-flex h-9 items-center rounded-xl border border-bh-border bg-white px-3 text-xs font-semibold text-bh-accent-blue shadow-sm hover:bg-bh-subtle"
            >
              Clear filters
            </Link>
          ) : null}
        </div>
      </div>

      <div className="p-3 sm:p-4">

      {loadError ? (
        <div className="rounded-xl border border-bh-danger/30 bg-bh-danger-soft/40 px-4 py-8 text-center">
          <p className="font-semibold text-bh-text">Could not load the shift schedule</p>
          <p className="mt-1 text-sm text-bh-text-secondary">
            Your selected view and filters were preserved.
          </p>
          <Button asChild size="sm" className="mt-4" variant="outline">
            <Link
              href={href( {
                view,
                date: dateYmd,
                ...filterParams,
              })}
            >
              Retry
            </Link>
          </Button>
        </div>
      ) : filteredEmpty ? (
        <div className="rounded-xl border border-dashed border-bh-border bg-bh-subtle/40 px-4 py-10 text-center">
          <p className="font-semibold text-bh-text">No shifts match these filters</p>
          <Link
            href={href( { view, date: dateYmd })}
            className="mt-3 inline-block text-sm font-medium text-bh-teal-strong hover:underline"
          >
            Clear filters
          </Link>
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-xl border border-dashed border-bh-border bg-bh-subtle/40 px-4 py-10 text-center">
          <p className="font-semibold text-bh-text">No shifts scheduled for this period</p>
          <p className="mt-1 text-sm text-bh-text-secondary">
            Create a shift or adjust the date and filters.
          </p>
          {canCreateShift ? (
            <Button asChild size="sm" variant="honey" className="mt-4 rounded-xl">
              <Link href={`/org/${slug}/shifts/new`}>Create shift</Link>
            </Button>
          ) : null}
        </div>
      ) : monthOnly || view === 'month' ? (
        <MonthGrid
          dayKeys={dayKeys}
          todayYmd={todayYmd}
          eventsByDay={eventsByDay}
          timeZone={timeZone}
          basePath={basePath}
          embedInShiftsList={embedInShiftsList}
          filterParams={filterParams}
          monthOnly={monthOnly}
          onSelect={setSelectedId}
        />
      ) : isNarrow ? (
        <AgendaList
          events={events}
          timeZone={timeZone}
          todayYmd={todayYmd}
          onSelect={setSelectedId}
        />
      ) : (
        <TimeGrid
          view={view}
          dayKeys={dayKeys}
          dayStartMs={dayStartMs}
          todayYmd={todayYmd}
          events={events}
          eventsByDay={eventsByDay}
          timeZone={timeZone}
          nowMs={nowMs}
          pxPerHour={pxPerHourForView(view)}
          onSelect={setSelectedId}
        />
      )}

      </div>

      <Dialog open={Boolean(selected)} onOpenChange={(o) => !o && setSelectedId(null)}>
        {selected ? (
          <DialogContent
            showClose={false}
            overlayClassName="bg-[rgba(5,15,26,0.78)] backdrop-blur-2xl backdrop-saturate-150 duration-300 data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0"
            className={cn(
              'left-1/2 top-1/2 max-w-[460px] -translate-x-1/2 -translate-y-1/2 gap-0 overflow-hidden rounded-[1.4rem] border-0 bg-[#f4f7f9] p-0 shadow-[0_32px_80px_rgba(7,29,48,0.35)]',
              'data-[state=open]:animate-in data-[state=closed]:animate-out',
            )}
          >
            <ShiftPreview
              event={selected}
              timeZone={timeZone}
              slug={slug}
              canReviewTimesheets={canReviewTimesheets}
            />
          </DialogContent>
        ) : null}
      </Dialog>
    </section>
  );
}

const PREVIEW_STATUS: Record<string, { label: string; pill: string; bar: string }> = {
  published: {
    label: 'Open · awaiting worker',
    pill: 'bg-bh-teal-soft text-bh-teal-strong',
    bar: 'bg-bh-teal',
  },
  filled: {
    label: 'Filled · worker assigned',
    pill: 'bg-bh-success-soft text-bh-success',
    bar: 'bg-bh-success',
  },
  in_progress: {
    label: 'In progress',
    pill: 'bg-bh-info-soft text-bh-info',
    bar: 'bg-bh-info',
  },
  awaiting_approval: {
    label: 'Awaiting timesheet approval',
    pill: 'bg-bh-warning-soft text-bh-warning',
    bar: 'bg-bh-warning',
  },
};

const PREVIEW_STATUS_FALLBACK = {
  label: '',
  pill: 'bg-bh-subtle text-bh-text-secondary',
  bar: 'bg-bh-text-muted',
};

function ShiftPreview({
  event,
  timeZone,
  slug,
  canReviewTimesheets,
}: {
  event: CalendarEvent;
  timeZone: string;
  slug: string;
  canReviewTimesheets: boolean;
}) {
  const startMs = new Date(event.startsAt).getTime();
  const endMs = new Date(event.endsAt).getTime();
  const durationMin = Math.max(0, Math.round((endMs - startMs) / 60000));
  const hours = Math.floor(durationMin / 60);
  const mins = durationMin % 60;
  const durationLabel = mins ? `${hours}h ${mins}m` : `${hours}h`;
  const startHour =
    Number(formatInTimeZone(new Date(startMs), timeZone, 'H')) +
    Number(formatInTimeZone(new Date(startMs), timeZone, 'm')) / 60;
  const barLeft = (startHour / 24) * 100;
  const barWidth = Math.min(100 - barLeft, (durationMin / 60 / 24) * 100);
  const status = PREVIEW_STATUS[event.status] ?? {
    ...PREVIEW_STATUS_FALLBACK,
    label: event.coverageLabel,
  };
  const place = [event.locationName, event.wardName].filter(Boolean);

  return (
    <>
      <div className="relative overflow-hidden border-b border-white/10 bg-[linear-gradient(155deg,#16384f_0%,#071d30_58%,#0c3a42_100%)] px-5 pb-4 pt-5">
        <span
          aria-hidden
          className="pointer-events-none absolute -left-8 -top-10 h-28 w-28 rounded-full bg-bh-teal/30 blur-2xl"
        />
        <span
          aria-hidden
          className="bh-orb-drift pointer-events-none absolute -bottom-12 right-0 h-32 w-32 rounded-full bg-[#e4b334]/22 blur-2xl"
        />
        <span
          aria-hidden
          className="bh-org-topbar-line pointer-events-none absolute inset-x-0 bottom-0 h-[3px]"
        />

        <DialogClose className="absolute right-3.5 top-3.5 z-10 grid h-9 w-9 place-items-center rounded-xl bg-white/10 text-white/80 ring-1 ring-white/15 transition-colors hover:bg-white/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e4b334]">
          <X className="h-4 w-4" aria-hidden />
          <span className="sr-only">Close</span>
        </DialogClose>

        <div className="relative flex items-start gap-3.5 pr-10">
          <div className="flex h-[62px] w-[54px] shrink-0 flex-col items-center justify-center rounded-2xl bg-[#e4b334] text-[#071d30] shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_10px_18px_rgba(228,179,52,0.38)]">
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#071d30]/65">
              {formatInTimeZone(new Date(startMs), timeZone, 'MMM')}
            </span>
            <span className="bh-tabular text-[22px] font-bold leading-none">
              {formatInTimeZone(new Date(startMs), timeZone, 'd')}
            </span>
            <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-[#071d30]/55">
              {formatInTimeZone(new Date(startMs), timeZone, 'EEE')}
            </span>
          </div>
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#f3d27a]">
              Shift preview
              <span className="inline-flex items-center gap-1 rounded-full bg-[#e4b334]/15 px-1.5 py-0.5 text-[9px] font-bold tracking-[0.14em] text-[#f3d27a] ring-1 ring-[#e4b334]/35">
                <span
                  aria-hidden
                  className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#e4b334] motion-reduce:animate-none"
                />
                Live
              </span>
            </p>
            <DialogTitle className="mt-1 truncate text-[20px] font-bold leading-tight tracking-tight text-white">
              {event.title}
            </DialogTitle>
            <DialogDescription className="mt-0.5 text-[13px] text-white/75">
              Quick look before opening the full shift record.
            </DialogDescription>
          </div>
        </div>

        <div className="relative mt-4 flex flex-wrap items-center gap-2">
          <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-white/10', status.pill)}>
            {status.label}
          </span>
          <span className="bh-tabular inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white ring-1 ring-white/15">
            <Clock3 className="h-3 w-3 text-[#f3d27a]" aria-hidden />
            {durationLabel}
          </span>
          {event.coverageLabel &&
          !status.label.toLowerCase().startsWith(event.coverageLabel.toLowerCase()) ? (
            <span className="inline-flex items-center rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white/80 ring-1 ring-white/15">
              {event.coverageLabel}
            </span>
          ) : null}
          <span className="inline-flex items-center rounded-full bg-[#e4b334] px-2.5 py-1 text-[11px] font-bold text-[#071d30] shadow-[0_6px_14px_rgba(228,179,52,0.32)]">
            <ShiftStartsIn startsAt={event.startsAt} endsAt={event.endsAt} />
          </span>
        </div>
      </div>

      <div className="px-5 py-4">
        <div className="overflow-hidden rounded-2xl bg-white">
          <div className="flex items-start gap-3 px-4 py-3.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-bh-teal-soft text-bh-teal-strong">
              <Clock3 className="h-4 w-4" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-bh-text-muted">When</p>
              <p className="bh-tabular mt-0.5 text-[15px] font-semibold tracking-tight text-[#071d30]">
                {formatTimeInTimezone(event.startsAt, timeZone)}
                <span className="mx-1 font-medium text-bh-text-muted">→</span>
                {formatTimeInTimezone(event.endsAt, timeZone)}
              </p>
              <p className="mt-0.5 text-[12.5px] text-bh-text-secondary">
                {formatInTimeZone(new Date(startMs), timeZone, 'EEEE, d MMMM yyyy')}
              </p>
              <div className="mt-3">
                <div className="relative h-1.5 overflow-hidden rounded-full bg-bh-subtle">
                  <div
                    className={cn('absolute inset-y-0 rounded-full', status.bar)}
                    style={{ left: `${barLeft}%`, width: `${Math.max(barWidth, 2)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mx-4 h-px bg-bh-border/60" />

          <div className="flex items-start gap-3 px-4 py-3.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#071d30]/[0.06] text-[#071d30]">
              <MapPin className="h-4 w-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-bh-text-muted">Location</p>
              <p className="mt-0.5 truncate text-[14px] font-semibold text-[#071d30]">
                {place[0] ?? 'No location set'}
              </p>
              {place[1] ? (
                <p className="mt-0.5 truncate text-[12.5px] text-bh-text-secondary">{place[1]}</p>
              ) : null}
            </div>
          </div>

          <div className="mx-4 h-px bg-bh-border/60" />

          <div className="grid grid-cols-2 gap-2.5 px-3 pb-3">
            <div className="relative overflow-hidden rounded-xl bg-[linear-gradient(165deg,#f4f8fb_0%,#e8f0f6_100%)] px-3.5 py-3.5 ring-1 ring-[#071d30]/10">
              <span
                aria-hidden
                className="pointer-events-none absolute -right-5 -top-7 h-16 w-16 rounded-full bg-bh-teal/20 blur-xl"
              />
              <span className="relative mb-2.5 grid h-8 w-8 place-items-center rounded-lg bg-[#071d30] text-white shadow-[0_8px_14px_rgba(7,29,48,0.28)]">
                <Briefcase className="h-3.5 w-3.5" aria-hidden />
              </span>
              <p className="relative text-[10px] font-semibold uppercase tracking-[0.16em] text-bh-teal-strong">
                Role
              </p>
              <p className="relative mt-1 text-[14px] font-bold leading-snug tracking-tight text-[#071d30]">
                {event.roleLabel}
              </p>
            </div>
            <div className="relative overflow-hidden rounded-xl bg-[linear-gradient(155deg,#16384f_0%,#071d30_100%)] px-3.5 py-3.5 ring-1 ring-white/10">
              <span
                aria-hidden
                className="bh-orb-drift pointer-events-none absolute -bottom-8 -right-4 h-20 w-20 rounded-full bg-[#e4b334]/28 blur-xl"
              />
              <span className="relative mb-2.5 grid h-8 w-8 place-items-center rounded-lg bg-[#e4b334] text-[#071d30] shadow-[0_8px_14px_rgba(228,179,52,0.4)]">
                <Banknote className="h-3.5 w-3.5" aria-hidden />
              </span>
              <p className="relative text-[10px] font-semibold uppercase tracking-[0.16em] text-[#f3d27a]">
                Rate
              </p>
              <p className="bh-tabular relative mt-1 text-[16px] font-bold leading-snug tracking-tight text-white">
                {event.rateMinor != null && event.currency
                  ? formatRate(event.rateMinor, event.currency)
                  : '—'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 border-t border-bh-border/50 bg-white px-5 py-4">
        <div className="flex gap-2">
          <Button asChild variant="outline" size="lg" className="rounded-xl px-5">
            <DialogClose>Close</DialogClose>
          </Button>
          <Button asChild size="lg" className="flex-1 rounded-xl">
            <Link href={event.href}>
              View shift
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </Button>
        </div>
        {canReviewTimesheets && event.status === 'awaiting_approval' ? (
          <Button asChild variant="outline" size="lg" className="w-full rounded-xl">
            <Link href={`/org/${slug}/timesheets`}>Review timesheet</Link>
          </Button>
        ) : null}
      </div>
    </>
  );
}

function AgendaList({
  events,
  timeZone,
  todayYmd,
  onSelect,
}: {
  events: CalendarEvent[];
  timeZone: string;
  todayYmd: string;
  onSelect: (id: string) => void;
}) {
  const sorted = [...events].sort(
    (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
  );
  return (
    <ul className="space-y-2" aria-label="Shift agenda">
      {sorted.map((event) => {
        const ymd = ymdFromIsoInTimezone(event.startsAt, timeZone);
        return (
          <li key={event.id}>
            <button
              type="button"
              onClick={() => onSelect(event.id)}
              className={cn(
                'flex w-full gap-3 rounded-xl border px-3 py-3 text-left transition-shadow hover:shadow-sm focus-visible:ring-2 focus-visible:ring-bh-teal',
                TONE_CLASS[event.tone],
              )}
              aria-label={eventAccessibleName(event, timeZone)}
            >
              <div className="bh-tabular shrink-0 text-xs font-semibold">
                <span className="block text-bh-text-muted">
                  {ymd === todayYmd ? 'Today' : ymd}
                </span>
                {formatTimeInTimezone(event.startsAt, timeZone)}–
                {formatTimeInTimezone(event.endsAt, timeZone)}
              </div>
              <div className="min-w-0">
                <p className="truncate font-semibold">{event.title}</p>
                <p className="text-xs text-bh-text-secondary">
                  {event.roleLabel} · {event.coverageLabel}
                </p>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function TimeGrid({
  view,
  dayKeys,
  dayStartMs,
  todayYmd,
  events,
  eventsByDay,
  timeZone,
  nowMs,
  pxPerHour,
  onSelect,
}: {
  view: CalendarViewMode;
  dayKeys: string[];
  dayStartMs: Record<string, number>;
  todayYmd: string;
  events: CalendarEvent[];
  eventsByDay: Map<string, CalendarEvent[]>;
  timeZone: string;
  nowMs: number | null;
  pxPerHour: number;
  onSelect: (id: string) => void;
}) {
  const range = visibleHourRange(events, dayKeys, dayStartMs);
  const hours = Array.from(
    { length: range.end - range.start },
    (_, i) => range.start + i,
  );
  const gridHeight = hours.length * pxPerHour;
  const includesToday = dayKeys.includes(todayYmd);
  const dense = view === 'week';

  return (
    <div className="min-w-0">
      <div className="overflow-x-auto rounded-2xl border border-bh-border/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
        <div
          className={cn(
            'min-w-[560px]',
            view === 'day' && 'min-w-0',
          )}
        >
          <div
            className="sticky top-0 z-[1] grid border-b border-[#16384f]/20 bg-[linear-gradient(180deg,#16384f_0%,#0d2a3d_100%)]"
            style={{
              gridTemplateColumns: `${TIME_LABEL_COL}px repeat(${dayKeys.length}, minmax(0, 1fr))`,
            }}
          >
            <div className="border-r border-white/10" />
            {dayKeys.map((key) => {
              const isToday = key === todayYmd;
              const d = new Date(`${key}T12:00:00`);
              const weekday = d.toLocaleDateString('en-GB', { weekday: 'short' });
              const dayNum = key.slice(8);
              const dayCount = (eventsByDay.get(key) ?? []).length;
              return (
                <div
                  key={key}
                  className={cn(
                    'border-r border-white/10 px-1 py-2.5 text-center last:border-r-0',
                    isToday && 'bg-white/10',
                  )}
                >
                  <p
                    className={cn(
                      'text-[10px] font-semibold uppercase tracking-[0.1em]',
                      isToday ? 'text-[#f5c518]' : 'text-white/60',
                    )}
                  >
                    {weekday}
                  </p>
                  <p
                    className={cn(
                      'bh-tabular mt-1 inline-flex min-w-8 items-center justify-center rounded-full px-2 py-0.5 text-base font-bold leading-none',
                      isToday
                        ? 'bg-[#f5c518] text-[#071d30] shadow-[0_4px_12px_rgba(245,197,24,0.35)]'
                        : 'text-white',
                    )}
                  >
                    {Number(dayNum)}
                  </p>
                  {dayCount > 0 ? (
                    <p className="mt-1 text-[10px] font-semibold text-white/55">
                      {dayCount} shift{dayCount === 1 ? '' : 's'}
                    </p>
                  ) : (
                    <p className="mt-1 text-[10px] font-medium text-white/35">Clear</p>
                  )}
                </div>
              );
            })}
          </div>

          <div
            className="relative max-h-[min(640px,62vh)] overflow-y-auto"
            style={{ scrollbarGutter: 'stable' }}
          >
            <div
              className="relative grid"
              style={{
                gridTemplateColumns: `${TIME_LABEL_COL}px repeat(${dayKeys.length}, minmax(0, 1fr))`,
                height: gridHeight,
              }}
            >
              <div className="relative border-r border-bh-border/80 bg-bh-subtle/20">
                {hours.map((h) => (
                  <div
                    key={h}
                    className="absolute right-1.5 bh-tabular text-[10px] font-medium tabular-nums text-bh-text-muted"
                    style={{ top: (h - range.start) * pxPerHour - 5 }}
                  >
                    {String(h).padStart(2, '0')}:00
                  </div>
                ))}
              </div>

              {dayKeys.map((key) => {
                const dayEvents = eventsByDay.get(key) ?? [];
                const dayStart = dayStartMs[key]!;
                const layouts = layoutOverlappingEvents(
                  dayEvents.map((e) => {
                    const segs = splitCrossMidnightSegments({
                      eventId: e.id,
                      startMs: new Date(e.startsAt).getTime(),
                      endMs: new Date(e.endsAt).getTime(),
                      dayKeys: [key],
                      dayStartMs: { [key]: dayStart },
                    });
                    const seg = segs[0];
                    return {
                      id: e.id,
                      startMs: seg?.startMs ?? new Date(e.startsAt).getTime(),
                      endMs: seg?.endMs ?? new Date(e.endsAt).getTime(),
                    };
                  }),
                );
                const layoutMap = new Map(layouts.map((l) => [l.eventId, l]));
                const isToday = key === todayYmd;

                return (
                  <div
                    key={key}
                    className={cn(
                      'relative border-r border-bh-border/50 last:border-r-0',
                      isToday && 'bg-bh-accent-blue-soft/25',
                    )}
                  >
                    {hours.map((h) => (
                      <div
                        key={h}
                        className="absolute inset-x-0 border-t border-bh-border/35"
                        style={{ top: (h - range.start) * pxPerHour }}
                      />
                    ))}

                    {includesToday && isToday && nowMs != null ? (
                      <CurrentTimeLine
                        nowMs={nowMs}
                        dayStart={dayStart}
                        rangeStart={range.start}
                        rangeEnd={range.end}
                        pxPerHour={pxPerHour}
                      />
                    ) : null}

                    {(() => {
                      const MAX_COLS = 3;
                      const overflow = dayEvents.filter((event) => {
                        const layout = layoutMap.get(event.id);
                        return layout && layout.column >= MAX_COLS;
                      });
                      const visible = dayEvents.filter((event) => {
                        const layout = layoutMap.get(event.id);
                        return layout && layout.column < MAX_COLS;
                      });

                      return (
                        <>
                          {visible.map((event) => {
                            const layout = layoutMap.get(event.id)!;
                            const segs = splitCrossMidnightSegments({
                              eventId: event.id,
                              startMs: new Date(event.startsAt).getTime(),
                              endMs: new Date(event.endsAt).getTime(),
                              dayKeys: [key],
                              dayStartMs: { [key]: dayStart },
                            });
                            const seg = segs[0];
                            if (!seg) return null;
                            const colCount = Math.min(layout.columnCount, MAX_COLS);
                            const startMin = minutesFromDayStart(seg.startMs, dayStart);
                            const endMin = minutesFromDayStart(seg.endMs, dayStart);
                            const top =
                              (startMin / 60 - range.start) * pxPerHour + 1;
                            const rawHeight =
                              ((endMin - startMin) / 60) * pxPerHour - 2;
                            const height = Math.max(EVENT_MIN_HEIGHT, rawHeight);
                            const widthPct = 100 / colCount;
                            const leftPct = layout.column * widthPct;

                            return (
                              <button
                                key={`${event.id}-${key}`}
                                type="button"
                                onClick={() => onSelect(event.id)}
                                className={cn(
                                  'absolute flex flex-col items-stretch justify-start overflow-hidden rounded-lg border px-1.5 py-1 text-left',
                                  'transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-lg',
                                  'focus-visible:ring-2 focus-visible:ring-bh-teal focus-visible:outline-none',
                                  TONE_CLASS[event.tone],
                                )}
                                style={{
                                  top,
                                  height,
                                  left: `calc(${leftPct}% + ${EVENT_GUTTER_PX}px)`,
                                  width: `calc(${widthPct}% - ${EVENT_GUTTER_PX * 2}px)`,
                                }}
                                aria-label={eventAccessibleName(event, timeZone)}
                              >
                                <EventBlockContent
                                  event={event}
                                  timeZone={timeZone}
                                  height={height}
                                  dense={dense}
                                />
                              </button>
                            );
                          })}
                          {overflow.length > 0 ? (
                            <button
                              type="button"
                              className="absolute bottom-1 right-1 z-20 rounded-md border border-bh-border bg-bh-surface px-1.5 py-0.5 text-[10px] font-semibold text-bh-accent-blue shadow-sm hover:bg-bh-subtle focus-visible:ring-2 focus-visible:ring-bh-teal"
                              aria-label={`${overflow.length} more shifts on this day`}
                              onClick={() => onSelect(overflow[0]!.id)}
                            >
                              +{overflow.length} more
                            </button>
                          ) : null}
                        </>
                      );
                    })()}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      <ul
        className="mt-3.5 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-bh-text-secondary"
        aria-label="Calendar color legend"
      >
        {[
          { label: 'RN', className: 'bg-bh-accent-blue' },
          { label: 'Ward', className: 'bg-bh-success' },
          { label: 'Open', className: 'bg-bh-teal' },
          { label: 'Filled', className: 'bg-emerald-500' },
          { label: 'Attention', className: 'bg-bh-honey' },
        ].map((item) => (
          <li
            key={item.label}
            className="inline-flex items-center gap-1.5 rounded-full border border-bh-border/70 bg-white px-2.5 py-1 shadow-sm"
          >
            <span className={cn('h-2 w-2 rounded-full', item.className)} aria-hidden />
            {item.label}
          </li>
        ))}
      </ul>
      <div className="sr-only">
      <table>
        <caption>Shift schedule list equivalent</caption>
        <thead>
          <tr>
            <th>Shift</th>
            <th>Start</th>
            <th>End</th>
            <th>Role</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {events.map((e) => (
            <tr key={e.id}>
              <td>{e.title}</td>
              <td>{e.startsAt}</td>
              <td>{e.endsAt}</td>
              <td>{e.roleLabel}</td>
              <td>{e.coverageLabel}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}

function CurrentTimeLine({
  nowMs,
  dayStart,
  rangeStart,
  rangeEnd,
  pxPerHour,
}: {
  nowMs: number;
  dayStart: number;
  rangeStart: number;
  rangeEnd: number;
  pxPerHour: number;
}) {
  const mins = minutesFromDayStart(nowMs, dayStart);
  const top = (mins / 60 - rangeStart) * pxPerHour;
  const maxTop = (rangeEnd - rangeStart) * pxPerHour;
  if (top < 0 || top > maxTop) return null;
  return (
    <div
      className="pointer-events-none absolute inset-x-0 z-10"
      style={{ top }}
      aria-hidden
    >
      <div className="h-0.5 bg-gradient-to-r from-bh-danger via-rose-400 to-bh-danger/40 shadow-[0_0_12px_rgba(180,35,24,0.45)]" />
      <div className="absolute -left-1.5 -top-1.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-bh-danger shadow-[0_0_10px_rgba(180,35,24,0.55)]" />
    </div>
  );
}

function MonthGrid({
  dayKeys,
  todayYmd,
  eventsByDay,
  timeZone,
  basePath,
  embedInShiftsList,
  filterParams,
  monthOnly = false,
  onSelect,
}: {
  dayKeys: string[];
  todayYmd: string;
  eventsByDay: Map<string, CalendarEvent[]>;
  timeZone: string;
  basePath: string;
  embedInShiftsList: boolean;
  filterParams: { location?: string | null; role?: string | null };
  monthOnly?: boolean;
  onSelect: (id: string) => void;
}) {
  const first = dayKeys[0]!;
  const startDow = new Date(`${first}T12:00:00`).getDay();
  const mondayOffset = startDow === 0 ? 6 : startDow - 1;
  const blanks = Array.from({ length: mondayOffset });
  const todayColumn = dayKeys.includes(todayYmd)
    ? (new Date(`${todayYmd}T12:00:00`).getDay() + 6) % 7
    : -1;
  const cellHeight = monthOnly ? 'min-h-[184px]' : 'min-h-[112px]';

  return (
    <div key={first} className="overflow-hidden rounded-2xl">
      <div className="grid grid-cols-7 text-center text-[11px] font-bold uppercase tracking-[0.16em]">
        {WEEKDAY_HEADERS.map((d, i) => (
          <div
            key={d}
            className={cn(
              'relative px-1 py-2.5',
              i === todayColumn
                ? 'text-[#071d30]'
                : i >= 5
                  ? 'text-[#071d30]/40'
                  : 'text-[#071d30]/80',
            )}
          >
            {d}
            {i === todayColumn ? (
              <span
                aria-hidden
                className="absolute inset-x-4 bottom-0 h-[2px] rounded-full bg-[#071d30]"
              />
            ) : null}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {blanks.map((_, i) => (
          <div
            key={`b-${i}`}
            className={cn('rounded-xl bg-white/10', cellHeight)}
          />
        ))}
        {dayKeys.map((key, index) => {
          const dayEvents = [...(eventsByDay.get(key) ?? [])].sort(
            (a, b) =>
              new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
          );
          const isToday = key === todayYmd;
          const isPast = key < todayYmd;
          const column = (mondayOffset + index) % 7;
          const isWeekend = column >= 5;
          const openCount = dayEvents.filter((e) => e.status === 'published').length;
          const staffedCount = dayEvents.filter((e) => STAFFED_STATUSES.has(e.status)).length;
          const coverage = dayEvents.length ? staffedCount / dayEvents.length : 0;
          const dayNumber = Number(key.slice(8));
          const numberClass = cn(
            'bh-tabular inline-flex items-center justify-center font-bold tracking-tight',
            isToday
              ? 'h-8 min-w-8 rounded-lg bg-[#071d30] px-1.5 text-[15px] text-white shadow-[0_6px_14px_rgba(7,29,48,0.28)]'
              : cn(
                  'h-8 min-w-8 rounded-lg text-[15px]',
                  isPast ? 'text-[#071d30]/45' : 'text-[#071d30]',
                  'group-hover/day:bg-white/50',
                ),
          );

          return (
            <div
              key={key}
              className={cn(
                'bh-cal-cell group/day relative flex flex-col rounded-xl p-1.5 transition-[background-color,box-shadow] duration-200',
                'hover:z-[1] hover:bg-white/55 hover:shadow-[0_10px_24px_rgba(7,29,48,0.08)]',
                cellHeight,
                isToday
                  ? 'bg-white/60 ring-1 ring-[#071d30]/20'
                  : isWeekend
                    ? 'bg-white/20'
                    : 'bg-white/35',
              )}
              style={{ animationDelay: `${Math.min(index, 34) * 14}ms` }}
            >
              {isToday ? (
                <span
                  aria-hidden
                  className="absolute inset-x-3 top-0 h-[2px] rounded-full bg-[#071d30]"
                />
              ) : null}
              <div className="mb-1.5 flex shrink-0 items-center justify-between gap-1">
                <span className="flex min-w-0 items-center gap-1.5">
                  {monthOnly ? (
                    <span className={numberClass}>{dayNumber}</span>
                  ) : (
                    <Link
                      href={buildHref(
                        basePath,
                        {
                          view: 'day',
                          date: key,
                          ...filterParams,
                        },
                        { embedInShiftsList },
                      )}
                      className={numberClass}
                      aria-label={`Open day view for ${key}`}
                    >
                      {dayNumber}
                    </Link>
                  )}
                  {isToday ? (
                    <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#071d30]">
                      Today
                    </span>
                  ) : null}
                </span>
                <span className="flex items-center gap-1">
                  {openCount > 0 ? (
                    <span
                      className="relative flex h-2 w-2"
                      title={`${openCount} open`}
                      aria-label={`${openCount} open shift${openCount === 1 ? '' : 's'}`}
                    >
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-bh-teal" />
                    </span>
                  ) : null}
                  {dayEvents.length > 0 ? (
                    <span className="bh-tabular rounded-md bg-[#071d30]/10 px-1.5 py-0.5 text-[10px] font-bold text-[#071d30]">
                      {dayEvents.length}
                    </span>
                  ) : null}
                </span>
              </div>
              <ul
                className={cn(
                  'flex min-h-0 flex-1 flex-col gap-1',
                  monthOnly && dayEvents.length > 3 && 'max-h-[220px] overflow-y-auto pr-0.5',
                )}
              >
                {dayEvents.map((e, eventIndex) => {
                  const place = [e.locationName, e.wardName].filter(Boolean).join(' · ');
                  const note = place || (e.title !== e.roleLabel ? e.title : null);
                  return (
                    <li
                      key={e.id}
                      className="bh-cal-chip"
                      style={{ animationDelay: `${Math.min(index, 34) * 14 + 120 + eventIndex * 60}ms` }}
                    >
                      <button
                        type="button"
                        onClick={() => onSelect(e.id)}
                        className={cn(
                          'w-full rounded-lg bg-white/80 px-2 py-1.5 text-left shadow-[0_1px_2px_rgba(7,29,48,0.06)] backdrop-blur-sm',
                          'transition-[transform,box-shadow] duration-200 ease-out',
                          'hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_8px_18px_rgba(7,29,48,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bh-teal',
                          'motion-reduce:transition-none motion-reduce:hover:translate-y-0',
                          MONTH_CHIP_TONE[e.tone],
                        )}
                        aria-label={eventAccessibleName(e, timeZone)}
                      >
                        <span className="flex items-center justify-between gap-1">
                          <span className="bh-tabular text-[11px] font-bold leading-none text-[#071d30]">
                            {formatTimeInTimezone(e.startsAt, timeZone)}–
                            {formatTimeInTimezone(e.endsAt, timeZone)}
                          </span>
                          {e.coverageLabel || e.positionsLabel ? (
                            <span
                              className={cn(
                                'shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em]',
                                coveragePillClass(e.status),
                              )}
                            >
                              {e.positionsLabel &&
                              e.requiredPositions != null &&
                              e.requiredPositions > 1
                                ? e.positionsLabel
                                : e.coverageLabel}
                            </span>
                          ) : null}
                        </span>
                        {note ? (
                          <span className="mt-1 block truncate text-[11px] font-semibold leading-tight text-[#071d30]">
                            {note}
                          </span>
                        ) : null}
                        <span className="mt-0.5 block truncate text-[10px] font-medium leading-tight text-bh-text-secondary">
                          {e.roleLabel}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              {dayEvents.length > 0 ? (
                <div
                  className="mt-1.5 h-1 shrink-0 overflow-hidden rounded-full bg-white/50"
                  title={`${staffedCount} of ${dayEvents.length} staffed`}
                  aria-hidden
                >
                  <div
                    className="bh-cal-bar h-full rounded-full bg-[#071d30]/70"
                    style={{
                      width: `${Math.round(coverage * 100)}%`,
                      animationDelay: `${Math.min(index, 34) * 14 + 200}ms`,
                    }}
                  />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
