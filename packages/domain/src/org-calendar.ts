/**
 * Organization calendar presentation helpers (Phase 7B refinement).
 * Pure functions — timezone wall-clock conversion stays in the web layer.
 */

import { WORKER_ROLE_LABELS, type WorkerRole } from './types';

export type CalendarViewMode = 'day' | 'week' | 'month';

export type CalendarShiftInput = {
  id: string;
  title: string | null;
  status: string;
  starts_at: string;
  ends_at: string;
  required_role: string;
  acceptance_deadline?: string | null;
  rate_minor?: number | null;
  currency?: string | null;
  location_id?: string | null;
  location_name?: string | null;
  ward_name?: string | null;
};

export type CalendarEvent = {
  id: string;
  title: string;
  status: string;
  startsAt: string;
  endsAt: string;
  requiredRole: string;
  roleLabel: string;
  locationName: string | null;
  wardName: string | null;
  rateMinor: number | null;
  currency: string | null;
  coverageLabel: string;
  /** Semantic style key for UI */
  tone: CalendarEventTone;
  href: string;
};

export type CalendarEventTone =
  | 'rn'
  | 'ward'
  | 'draft'
  | 'open'
  | 'filled'
  | 'amber'
  | 'done'
  | 'danger';

export function parseCalendarView(raw: string | null | undefined): CalendarViewMode {
  if (raw === 'day' || raw === 'month' || raw === 'week') return raw;
  return 'week';
}

/** Accept YYYY-MM-DD only; otherwise null (caller falls back to today in org TZ). */
export function parseCalendarDateParam(raw: string | null | undefined): string | null {
  if (!raw) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const [y, m, d] = raw.split('-').map(Number);
  if (!y || !m || !d || m > 12 || d > 31) return null;
  return raw;
}

export function coverageLabelForStatus(status: string): string {
  switch (status) {
    case 'draft':
      return 'Draft';
    case 'published':
      return 'Open';
    case 'filled':
      return 'Filled';
    case 'in_progress':
      return 'In progress';
    case 'awaiting_approval':
      return 'Awaiting approval';
    case 'completed':
      return 'Completed';
    case 'cancelled':
      return 'Cancelled';
    case 'disputed':
      return 'Disputed';
    default:
      return status;
  }
}

export function calendarEventTone(
  status: string,
  requiredRole: string,
): CalendarEventTone {
  if (status === 'draft') return 'draft';
  if (status === 'cancelled' || status === 'disputed') return 'danger';
  if (status === 'awaiting_approval') return 'amber';
  if (status === 'completed') return 'done';
  if (status === 'filled' || status === 'in_progress') return 'filled';
  if (status === 'published') return 'open';
  if (requiredRole === 'ward_assistant') return 'ward';
  if (requiredRole === 'registered_nurse') return 'rn';
  return 'open';
}

export function mapShiftToCalendarEvent(
  shift: CalendarShiftInput,
  slug: string,
): CalendarEvent {
  const role = shift.required_role;
  const title =
    shift.title?.trim() ||
    shift.ward_name?.trim() ||
    WORKER_ROLE_LABELS[role as WorkerRole] ||
    'Shift';
  return {
    id: shift.id,
    title,
    status: shift.status,
    startsAt: shift.starts_at,
    endsAt: shift.ends_at,
    requiredRole: role,
    roleLabel: WORKER_ROLE_LABELS[role as WorkerRole] ?? role,
    locationName: shift.location_name ?? null,
    wardName: shift.ward_name ?? null,
    rateMinor: shift.rate_minor ?? null,
    currency: shift.currency ?? null,
    coverageLabel: coverageLabelForStatus(shift.status),
    tone: calendarEventTone(shift.status, role),
    href: `/org/${slug}/shifts/${shift.id}`,
  };
}

export type LayoutSegment = {
  eventId: string;
  /** 0–1 column start within the day lane */
  column: number;
  /** number of concurrent columns */
  columnCount: number;
};

/**
 * Greedy overlap layout: assign each event a side-by-side column so text never stacks.
 */
export function layoutOverlappingEvents(
  events: Array<{ id: string; startMs: number; endMs: number }>,
): LayoutSegment[] {
  const sorted = [...events].sort(
    (a, b) => a.startMs - b.startMs || a.endMs - b.endMs || a.id.localeCompare(b.id),
  );
  const columnById = new Map<string, number>();
  const active: Array<{ id: string; endMs: number; column: number }> = [];

  for (const event of sorted) {
    for (let i = active.length - 1; i >= 0; i -= 1) {
      if (active[i]!.endMs <= event.startMs) active.splice(i, 1);
    }
    const used = new Set(active.map((a) => a.column));
    let column = 0;
    while (used.has(column)) column += 1;
    active.push({ id: event.id, endMs: event.endMs, column });
    columnById.set(event.id, column);
  }

  // Cluster column counts: for each event, max columns among all overlapping peers
  const result: LayoutSegment[] = [];
  for (const event of sorted) {
    const overlapping = sorted.filter(
      (other) =>
        other.id === event.id ||
        (other.startMs < event.endMs && other.endMs > event.startMs),
    );
    const columnCount =
      Math.max(...overlapping.map((o) => (columnById.get(o.id) ?? 0) + 1), 1);
    result.push({
      eventId: event.id,
      column: columnById.get(event.id) ?? 0,
      columnCount,
    });
  }
  return result;
}

export type QuickAction = {
  id: string;
  href: string;
  title: string;
  description: string;
  tone: 'teal' | 'honey' | 'navy' | 'info';
};

export function buildDashboardQuickActions(params: {
  slug: string;
  canOperate: boolean;
  canManageShifts: boolean;
  canReviewTimesheets: boolean;
  canManageLocations: boolean;
  canAccessBilling: boolean;
}): QuickAction[] {
  if (!params.canOperate) return [];
  const base = `/org/${params.slug}`;
  const actions: QuickAction[] = [];
  if (params.canManageShifts) {
    actions.push({
      id: 'create-shift',
      href: `${base}/shifts/new`,
      title: 'Create shift',
      description: 'Add a nurse or ward-assistant opening',
      tone: 'teal',
    });
    actions.push({
      id: 'create-multiple-shifts',
      href: `${base}/shifts/new/bulk`,
      title: 'Create multiple',
      description: 'Repeat or pick dates in one batch',
      tone: 'honey',
    });
  }
  if (params.canReviewTimesheets) {
    actions.push({
      id: 'review-timesheets',
      href: `${base}/timesheets`,
      title: 'Review timesheets',
      description: 'Approve submitted work',
      tone: 'honey',
    });
  }
  if (params.canManageLocations) {
    actions.push({
      id: 'manage-locations',
      href: `${base}/locations`,
      title: 'Manage locations',
      description: 'Update locations and wards',
      tone: 'navy',
    });
  }
  if (params.canAccessBilling) {
    actions.push({
      id: 'payments',
      href: `${base}/payments`,
      title: 'View financial obligations',
      description: 'Approved gross worker pay',
      tone: 'info',
    });
  }
  // Invite team member omitted — no org-scoped invite route yet.
  return actions;
}

export type RelativeDateKind = 'today' | 'tomorrow' | 'later';

export function relativeDateKind(
  startsAtIso: string,
  todayYmd: string,
  tomorrowYmd: string,
  startsAtYmd: string,
): RelativeDateKind {
  if (startsAtYmd === todayYmd) return 'today';
  if (startsAtYmd === tomorrowYmd) return 'tomorrow';
  return 'later';
}

export function filterCalendarShifts(
  shifts: CalendarShiftInput[],
  filters: { locationId?: string | null; role?: string | null },
): CalendarShiftInput[] {
  return shifts.filter((s) => {
    if (filters.locationId && s.location_id !== filters.locationId) return false;
    if (filters.role && s.required_role !== filters.role) return false;
    return true;
  });
}

/** Split a cross-midnight event into per-day segments using local YMD keys. */
export function splitCrossMidnightSegments(params: {
  eventId: string;
  startMs: number;
  endMs: number;
  /** Local calendar day keys overlapping the event, sorted ascending YYYY-MM-DD */
  dayKeys: string[];
  /** Start-of-day epoch ms for each dayKey in the same timezone */
  dayStartMs: Record<string, number>;
}): Array<{ eventId: string; dayKey: string; startMs: number; endMs: number }> {
  const out: Array<{ eventId: string; dayKey: string; startMs: number; endMs: number }> = [];
  for (const dayKey of params.dayKeys) {
    const dayStart = params.dayStartMs[dayKey];
    if (dayStart == null) continue;
    const dayEnd = dayStart + 24 * 60 * 60 * 1000;
    const segStart = Math.max(params.startMs, dayStart);
    const segEnd = Math.min(params.endMs, dayEnd);
    if (segEnd <= segStart) continue;
    out.push({
      eventId: params.eventId,
      dayKey,
      startMs: segStart,
      endMs: segEnd,
    });
  }
  return out;
}
