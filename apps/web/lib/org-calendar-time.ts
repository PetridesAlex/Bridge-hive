/**
 * Organization-timezone calendar period helpers for the org dashboard.
 * Uses date-fns-tz so boundaries are wall-clock accurate (no UTC string round-trips).
 */

import { addDays, addMonths, addWeeks } from 'date-fns';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';

import {
  parseCalendarDateParam,
  parseCalendarView,
  type CalendarViewMode,
} from '@bridge-hive/domain';

export type CalendarPeriod = {
  view: CalendarViewMode;
  /** Anchor date YYYY-MM-DD in organization timezone */
  dateYmd: string;
  rangeStartIso: string;
  rangeEndIso: string;
  label: string;
  dayKeys: string[];
  dayStartMs: Record<string, number>;
};

function ymdInTz(date: Date, timeZone: string): string {
  return formatInTimeZone(date, timeZone, 'yyyy-MM-dd');
}

function startOfLocalDayIso(ymd: string, timeZone: string): string {
  return fromZonedTime(`${ymd}T00:00:00`, timeZone).toISOString();
}

function endOfLocalDayExclusiveIso(ymd: string, timeZone: string): string {
  const next = addDays(fromZonedTime(`${ymd}T00:00:00`, timeZone), 1);
  return next.toISOString();
}

/** Monday-start week containing the local YMD in the given timezone. */
function mondayOfWeek(ymd: string, timeZone: string): string {
  const localNoon = fromZonedTime(`${ymd}T12:00:00`, timeZone);
  // date-fns `i` = ISO day of week (1=Monday … 7=Sunday) in the target zone
  const isoDow = Number(formatInTimeZone(localNoon, timeZone, 'i'));
  const diff = 1 - isoDow;
  return ymdInTz(addDays(localNoon, diff), timeZone);
}

function monthStartYmd(ymd: string): string {
  return `${ymd.slice(0, 7)}-01`;
}

function daysInMonth(ymd: string, timeZone: string): number {
  const [y, m] = ymd.split('-').map(Number);
  const firstNext = fromZonedTime(
    `${m === 12 ? y + 1 : y}-${String(m === 12 ? 1 : m + 1).padStart(2, '0')}-01T12:00:00`,
    timeZone,
  );
  const last = addDays(firstNext, -1);
  return Number(formatInTimeZone(last, timeZone, 'd'));
}

export function todayYmdInTimezone(timeZone: string, now = new Date()): string {
  return ymdInTz(now, timeZone);
}

export function resolveCalendarPeriod(params: {
  timeZone: string;
  viewRaw?: string | null;
  dateRaw?: string | null;
  now?: Date;
}): CalendarPeriod {
  const timeZone = params.timeZone || 'Europe/Nicosia';
  const view = parseCalendarView(params.viewRaw);
  const today = todayYmdInTimezone(timeZone, params.now);
  const dateYmd = parseCalendarDateParam(params.dateRaw) ?? today;

  if (view === 'day') {
    const dayKeys = [dateYmd];
    const dayStartMs = {
      [dateYmd]: fromZonedTime(`${dateYmd}T00:00:00`, timeZone).getTime(),
    };
    return {
      view,
      dateYmd,
      rangeStartIso: startOfLocalDayIso(dateYmd, timeZone),
      rangeEndIso: endOfLocalDayExclusiveIso(dateYmd, timeZone),
      label: formatInTimeZone(
        fromZonedTime(`${dateYmd}T12:00:00`, timeZone),
        timeZone,
        'EEEE d MMM yyyy',
      ),
      dayKeys,
      dayStartMs,
    };
  }

  if (view === 'month') {
    const start = monthStartYmd(dateYmd);
    const dim = daysInMonth(start, timeZone);
    const dayKeys: string[] = [];
    const dayStartMs: Record<string, number> = {};
    for (let d = 1; d <= dim; d += 1) {
      const key = `${start.slice(0, 8)}${String(d).padStart(2, '0')}`;
      dayKeys.push(key);
      dayStartMs[key] = fromZonedTime(`${key}T00:00:00`, timeZone).getTime();
    }
    const endExclusive = endOfLocalDayExclusiveIso(dayKeys[dayKeys.length - 1]!, timeZone);
    return {
      view,
      dateYmd: start,
      rangeStartIso: startOfLocalDayIso(start, timeZone),
      rangeEndIso: endExclusive,
      label: formatInTimeZone(
        fromZonedTime(`${start}T12:00:00`, timeZone),
        timeZone,
        'MMMM yyyy',
      ),
      dayKeys,
      dayStartMs,
    };
  }

  // week
  const monday = mondayOfWeek(dateYmd, timeZone);
  const dayKeys: string[] = [];
  const dayStartMs: Record<string, number> = {};
  for (let i = 0; i < 7; i += 1) {
    const key = ymdInTz(
      addDays(fromZonedTime(`${monday}T12:00:00`, timeZone), i),
      timeZone,
    );
    dayKeys.push(key);
    dayStartMs[key] = fromZonedTime(`${key}T00:00:00`, timeZone).getTime();
  }
  const sunday = dayKeys[6]!;
  return {
    view: 'week',
    dateYmd: monday,
    rangeStartIso: startOfLocalDayIso(monday, timeZone),
    rangeEndIso: endOfLocalDayExclusiveIso(sunday, timeZone),
    label: `${formatInTimeZone(
      fromZonedTime(`${monday}T12:00:00`, timeZone),
      timeZone,
      'd MMM',
    )} – ${formatInTimeZone(
      fromZonedTime(`${sunday}T12:00:00`, timeZone),
      timeZone,
      'd MMM yyyy',
    )}`,
    dayKeys,
    dayStartMs,
  };
}

export function shiftCalendarAnchor(params: {
  timeZone: string;
  view: CalendarViewMode;
  dateYmd: string;
  direction: 'prev' | 'next' | 'today';
  now?: Date;
}): string {
  const timeZone = params.timeZone || 'Europe/Nicosia';
  if (params.direction === 'today') {
    return todayYmdInTimezone(timeZone, params.now);
  }
  const delta = params.direction === 'next' ? 1 : -1;
  const base = fromZonedTime(`${params.dateYmd}T12:00:00`, timeZone);
  if (params.view === 'day') {
    return ymdInTz(addDays(base, delta), timeZone);
  }
  if (params.view === 'month') {
    return monthStartYmd(ymdInTz(addMonths(base, delta), timeZone));
  }
  return mondayOfWeek(ymdInTz(addWeeks(base, delta), timeZone), timeZone);
}

export function ymdFromIsoInTimezone(iso: string, timeZone: string): string {
  return formatInTimeZone(new Date(iso), timeZone, 'yyyy-MM-dd');
}

export function formatTimeInTimezone(iso: string, timeZone: string): string {
  return formatInTimeZone(new Date(iso), timeZone, 'HH:mm');
}

export function tomorrowYmdInTimezone(timeZone: string, now = new Date()): string {
  const today = todayYmdInTimezone(timeZone, now);
  return ymdInTz(addDays(fromZonedTime(`${today}T12:00:00`, timeZone), 1), timeZone);
}
