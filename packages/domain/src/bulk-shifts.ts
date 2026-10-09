/**
 * Bulk shift builder helpers — finite preview lists, deadlines, overlap checks.
 * Pure functions; no Storage/RPC/browser APIs.
 */

import type { WorkerRole } from './types';
import { WORKER_ROLE_LABELS, WORKER_ROLES } from './types';

export const BULK_SHIFT_MIN = 2;
export const BULK_SHIFT_MAX = 100;
/** Inclusive calendar span for recurrence / individual date ranges. */
export const BULK_RECURRENCE_MAX_MONTHS = 6;

export type BulkCreationMode = 'repeat' | 'individual' | 'custom';
export type BulkRequestedStatus = 'draft' | 'published';

/** ISO weekday: 1=Monday … 7=Sunday (matches date-fns `i`). */
export type IsoWeekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;
const HM_RE = /^\d{2}:\d{2}$/;

export function isValidYmd(value: string): boolean {
  if (!YMD_RE.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const dt = new Date(Date.UTC(y!, m! - 1, d!));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m! - 1 &&
    dt.getUTCDate() === d
  );
}

export function isValidHm(value: string): boolean {
  if (!HM_RE.test(value)) return false;
  const [h, m] = value.split(':').map(Number);
  return h! >= 0 && h! <= 23 && m! >= 0 && m! <= 59;
}

function parseYmdUtc(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!));
}

function formatYmdUtc(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** ISO weekday 1–7 for a YMD interpreted as a calendar date (UTC noon). */
export function isoWeekdayOfYmd(ymd: string): IsoWeekday {
  const dt = parseYmdUtc(ymd);
  // getUTCDay: 0=Sun … 6=Sat → ISO 1=Mon … 7=Sun
  const sun0 = dt.getUTCDay();
  return (sun0 === 0 ? 7 : sun0) as IsoWeekday;
}

export function addCalendarDaysYmd(ymd: string, days: number): string {
  const dt = parseYmdUtc(ymd);
  dt.setUTCDate(dt.getUTCDate() + days);
  return formatYmdUtc(dt);
}

export function monthsBetweenInclusive(startYmd: string, endYmd: string): number {
  const [sy, sm] = startYmd.split('-').map(Number);
  const [ey, em] = endYmd.split('-').map(Number);
  return (ey! - sy!) * 12 + (em! - sm!);
}

export type BulkLimitsResult =
  | { ok: true }
  | { ok: false; error: string };

export function assertBulkShiftCount(count: number): BulkLimitsResult {
  if (!Number.isInteger(count) || count < BULK_SHIFT_MIN) {
    return {
      ok: false,
      error: `Create at least ${BULK_SHIFT_MIN} shifts in a batch.`,
    };
  }
  if (count > BULK_SHIFT_MAX) {
    return {
      ok: false,
      error: `A batch can include at most ${BULK_SHIFT_MAX} shifts.`,
    };
  }
  return { ok: true };
}

export function assertBulkDateSpan(
  startYmd: string,
  endYmd: string,
): BulkLimitsResult {
  if (!isValidYmd(startYmd) || !isValidYmd(endYmd)) {
    return { ok: false, error: 'Enter a valid start and end date.' };
  }
  if (endYmd < startYmd) {
    return { ok: false, error: 'End date must be on or after the start date.' };
  }
  if (monthsBetweenInclusive(startYmd, endYmd) > BULK_RECURRENCE_MAX_MONTHS) {
    return {
      ok: false,
      error: `Date range cannot exceed ${BULK_RECURRENCE_MAX_MONTHS} months.`,
    };
  }
  return { ok: true };
}

/**
 * Expand weekday recurrence into a finite sorted YMD list.
 * weekdays: ISO 1=Mon … 7=Sun. Inclusive [startYmd, endYmd].
 */
export function expandWeekdayRecurrence(params: {
  startYmd: string;
  endYmd: string;
  weekdays: IsoWeekday[];
}): { ok: true; dates: string[] } | { ok: false; error: string } {
  const span = assertBulkDateSpan(params.startYmd, params.endYmd);
  if (!span.ok) return span;

  const uniqueDays = [...new Set(params.weekdays)].filter(
    (d): d is IsoWeekday => d >= 1 && d <= 7,
  );
  if (uniqueDays.length === 0) {
    return { ok: false, error: 'Select at least one weekday.' };
  }

  const daySet = new Set(uniqueDays);
  const dates: string[] = [];
  let cursor = params.startYmd;
  while (cursor <= params.endYmd) {
    if (daySet.has(isoWeekdayOfYmd(cursor))) {
      dates.push(cursor);
    }
    cursor = addCalendarDaysYmd(cursor, 1);
    if (dates.length > BULK_SHIFT_MAX) {
      return {
        ok: false,
        error: `A batch can include at most ${BULK_SHIFT_MAX} shifts.`,
      };
    }
  }

  if (dates.length < BULK_SHIFT_MIN) {
    return {
      ok: false,
      error: `Selected weekdays produce fewer than ${BULK_SHIFT_MIN} shifts in this range.`,
    };
  }

  return { ok: true, dates };
}

/** Normalize individual date picks → sorted unique YMDs within limits. */
export function expandIndividualDates(
  dates: string[],
): { ok: true; dates: string[] } | { ok: false; error: string } {
  const cleaned = [
    ...new Set(
      dates
        .map((d) => d.trim())
        .filter((d) => d.length > 0),
    ),
  ].sort();

  for (const d of cleaned) {
    if (!isValidYmd(d)) {
      return { ok: false, error: `Invalid date: ${d}` };
    }
  }

  if (cleaned.length === 0) {
    return { ok: false, error: 'Add at least two dates.' };
  }

  const span = assertBulkDateSpan(cleaned[0]!, cleaned[cleaned.length - 1]!);
  if (!span.ok) return span;

  const countCheck = assertBulkShiftCount(cleaned.length);
  if (!countCheck.ok) {
    if (cleaned.length < BULK_SHIFT_MIN) {
      return { ok: false, error: 'Add at least two dates.' };
    }
    return countCheck;
  }

  return { ok: true, dates: cleaned };
}

/**
 * If end time is on/before start time, end falls on the next calendar day
 * (overnight shift). Returns local datetime strings `YYYY-MM-DDTHH:mm`.
 */
export function resolveShiftLocalWindow(params: {
  dateYmd: string;
  startHm: string;
  endHm: string;
}):
  | { ok: true; startsLocal: string; endsLocal: string; overnight: boolean }
  | { ok: false; error: string } {
  if (!isValidYmd(params.dateYmd)) {
    return { ok: false, error: 'Invalid shift date.' };
  }
  if (!isValidHm(params.startHm) || !isValidHm(params.endHm)) {
    return { ok: false, error: 'Enter valid start and end times.' };
  }

  const startsLocal = `${params.dateYmd}T${params.startHm}`;
  const overnight = params.endHm <= params.startHm;
  const endYmd = overnight
    ? addCalendarDaysYmd(params.dateYmd, 1)
    : params.dateYmd;
  const endsLocal = `${endYmd}T${params.endHm}`;

  return { ok: true, startsLocal, endsLocal, overnight };
}

/** Deadline = startsAt − hoursBefore (ISO timestamptz strings). */
export function deadlineHoursBeforeStart(
  startsAtIso: string,
  hoursBefore: number,
): { ok: true; deadlineIso: string } | { ok: false; error: string } {
  if (!Number.isFinite(hoursBefore) || hoursBefore < 0) {
    return { ok: false, error: 'Deadline offset must be zero or positive hours.' };
  }
  const start = new Date(startsAtIso);
  if (Number.isNaN(start.getTime())) {
    return { ok: false, error: 'Invalid start time.' };
  }
  const deadline = new Date(start.getTime() - hoursBefore * 60 * 60 * 1000);
  return { ok: true, deadlineIso: deadline.toISOString() };
}

export type BulkPreviewShift = {
  rowIndex: number;
  dateYmd: string;
  startsAtIso: string;
  endsAtIso: string;
  requiredRole: WorkerRole;
  locationId: string;
  wardId?: string | null;
  rateMinor: number;
  currency: string;
  breakMinutes: number;
  title?: string | null;
};

export type ExactDuplicatePair = {
  a: number;
  b: number;
  key: string;
};

export type OverlapPair = {
  a: number;
  b: number;
};

/** Exact duplicate: same location, role, start, end. */
export function findExactDuplicateShifts(
  shifts: BulkPreviewShift[],
): ExactDuplicatePair[] {
  const pairs: ExactDuplicatePair[] = [];
  const seen = new Map<string, number>();
  for (const s of shifts) {
    const key = [
      s.locationId,
      s.requiredRole,
      s.startsAtIso,
      s.endsAtIso,
    ].join('|');
    const prev = seen.get(key);
    if (prev != null) {
      pairs.push({ a: prev, b: s.rowIndex, key });
    } else {
      seen.set(key, s.rowIndex);
    }
  }
  return pairs;
}

/** Time overlap on the same location (warn, not hard-block). */
export function findOverlappingShifts(
  shifts: BulkPreviewShift[],
): OverlapPair[] {
  const pairs: OverlapPair[] = [];
  const sorted = [...shifts].sort(
    (a, b) =>
      a.locationId.localeCompare(b.locationId) ||
      a.startsAtIso.localeCompare(b.startsAtIso),
  );

  for (let i = 0; i < sorted.length; i++) {
    const a = sorted[i]!;
    const aStart = new Date(a.startsAtIso).getTime();
    const aEnd = new Date(a.endsAtIso).getTime();
    for (let j = i + 1; j < sorted.length; j++) {
      const b = sorted[j]!;
      if (b.locationId !== a.locationId) break;
      const bStart = new Date(b.startsAtIso).getTime();
      const bEnd = new Date(b.endsAtIso).getTime();
      if (bStart >= aEnd) break;
      if (aStart < bEnd && bStart < aEnd) {
        pairs.push({ a: a.rowIndex, b: b.rowIndex });
      }
    }
  }
  return pairs;
}

export type BulkBatchSummary = {
  shiftCount: number;
  roleCounts: Array<{ role: WorkerRole; label: string; count: number }>;
  estimatedGrossMinor: number;
  currency: string;
  firstStartsAtIso: string | null;
  lastEndsAtIso: string | null;
};

/** Gross estimate = sum of rate_minor × duration hours (break excluded). */
export function summarizeBulkBatch(shifts: BulkPreviewShift[]): BulkBatchSummary {
  const roleMap = Object.fromEntries(
    WORKER_ROLES.map((role) => [role, 0]),
  ) as Record<WorkerRole, number>;
  let estimatedGrossMinor = 0;
  let firstStartsAtIso: string | null = null;
  let lastEndsAtIso: string | null = null;
  const currency = shifts[0]?.currency ?? 'EUR';

  for (const s of shifts) {
    roleMap[s.requiredRole] = (roleMap[s.requiredRole] ?? 0) + 1;
    const start = new Date(s.startsAtIso).getTime();
    const end = new Date(s.endsAtIso).getTime();
    const minutes = Math.max(0, Math.round((end - start) / 60000) - (s.breakMinutes || 0));
    const hours = minutes / 60;
    estimatedGrossMinor += Math.round(s.rateMinor * hours);

    if (!firstStartsAtIso || s.startsAtIso < firstStartsAtIso) {
      firstStartsAtIso = s.startsAtIso;
    }
    if (!lastEndsAtIso || s.endsAtIso > lastEndsAtIso) {
      lastEndsAtIso = s.endsAtIso;
    }
  }

  return {
    shiftCount: shifts.length,
    roleCounts: WORKER_ROLES.map((role) => ({
      role,
      label: WORKER_ROLE_LABELS[role],
      count: roleMap[role],
    })),
    estimatedGrossMinor,
    currency,
    firstStartsAtIso,
    lastEndsAtIso,
  };
}

export function newBulkRequestKey(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `bulk-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
