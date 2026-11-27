/**
 * Super-admin Active Shifts monitor — pure filter / phase / export helpers.
 * There is no DB status named "active"; Active is a derived filter.
 */

import {
  remainingOpenPositions,
  SHIFT_OCCUPYING_ASSIGNMENT_STATUSES,
} from './shift-positions';
import type { ShiftStatus, WorkerRole } from './types';
import { isWorkerRole, WORKER_ROLE_LABELS } from './types';

/** Stored statuses included in the default Active monitor view. */
export const ADMIN_ACTIVE_SHIFT_STATUSES = [
  'published',
  'filled',
  'in_progress',
] as const satisfies readonly ShiftStatus[];

export type AdminActiveShiftStatus =
  (typeof ADMIN_ACTIVE_SHIFT_STATUSES)[number];

export const ADMIN_SHIFT_MONITOR_VIEWS = [
  'active',
  'upcoming',
  'in_progress',
  'ended',
  'cancelled',
  'draft',
  'all',
] as const;

export type AdminShiftMonitorView =
  (typeof ADMIN_SHIFT_MONITOR_VIEWS)[number];

export const ADMIN_SHIFT_MONITOR_SORTS = [
  'starts_asc',
  'starts_desc',
  'updated_desc',
] as const;

export type AdminShiftMonitorSort =
  (typeof ADMIN_SHIFT_MONITOR_SORTS)[number];

/** Derived time phase — independent of stored shift.status. */
export type AdminShiftPhase = 'upcoming' | 'in_progress' | 'ended';

export const ADMIN_SHIFTS_PAGE_SIZE = 40;
export const ADMIN_SHIFTS_EXPORT_CAP = 5000;

export function isAdminShiftMonitorView(
  value: unknown,
): value is AdminShiftMonitorView {
  return (
    typeof value === 'string' &&
    (ADMIN_SHIFT_MONITOR_VIEWS as readonly string[]).includes(value)
  );
}

export function parseAdminShiftMonitorView(
  raw: string | null | undefined,
): AdminShiftMonitorView {
  return isAdminShiftMonitorView(raw) ? raw : 'active';
}

export function parseAdminShiftMonitorSort(
  raw: string | null | undefined,
): AdminShiftMonitorSort {
  if (
    typeof raw === 'string' &&
    (ADMIN_SHIFT_MONITOR_SORTS as readonly string[]).includes(raw)
  ) {
    return raw as AdminShiftMonitorSort;
  }
  return 'starts_asc';
}

export function parseAdminShiftRoleFilter(
  raw: string | null | undefined,
): WorkerRole | undefined {
  return isWorkerRole(raw) ? raw : undefined;
}

/** Short operational reference from a UUID (first 8 hex chars, uppercased). */
export function adminShiftShortRef(id: string): string {
  return id.replaceAll('-', '').slice(0, 8).toUpperCase();
}

export function adminShiftRoleLabel(role: string | null | undefined): string {
  if (!role) return '—';
  if (isWorkerRole(role)) return WORKER_ROLE_LABELS[role];
  return role.replaceAll('_', ' ');
}

export function deriveAdminShiftPhase(
  startsAtIso: string,
  endsAtIso: string,
  now: Date = new Date(),
): AdminShiftPhase {
  const start = new Date(startsAtIso).getTime();
  const end = new Date(endsAtIso).getTime();
  const t = now.getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 'ended';
  if (end <= t) return 'ended';
  if (start > t) return 'upcoming';
  return 'in_progress';
}

export function adminShiftPhaseLabel(phase: AdminShiftPhase): string {
  if (phase === 'upcoming') return 'Upcoming';
  if (phase === 'in_progress') return 'In progress';
  return 'Ended';
}

/**
 * Default Active: operational published/filled/in_progress and not ended.
 * Fully staffed shifts remain included.
 */
export function isAdminActiveShift(params: {
  status: string;
  endsAtIso: string;
  now?: Date;
}): boolean {
  if (
    !(ADMIN_ACTIVE_SHIFT_STATUSES as readonly string[]).includes(params.status)
  ) {
    return false;
  }
  const end = new Date(params.endsAtIso).getTime();
  const now = (params.now ?? new Date()).getTime();
  return Number.isFinite(end) && end > now;
}

export function adminShiftMatchesMonitorView(params: {
  view: AdminShiftMonitorView;
  status: string;
  startsAtIso: string;
  endsAtIso: string;
  now?: Date;
}): boolean {
  const now = params.now ?? new Date();
  const phase = deriveAdminShiftPhase(
    params.startsAtIso,
    params.endsAtIso,
    now,
  );

  switch (params.view) {
    case 'active':
      return isAdminActiveShift({
        status: params.status,
        endsAtIso: params.endsAtIso,
        now,
      });
    case 'upcoming':
      return (
        isAdminActiveShift({
          status: params.status,
          endsAtIso: params.endsAtIso,
          now,
        }) && phase === 'upcoming'
      );
    case 'in_progress':
      return (
        isAdminActiveShift({
          status: params.status,
          endsAtIso: params.endsAtIso,
          now,
        }) && phase === 'in_progress'
      );
    case 'ended':
      return phase === 'ended' && params.status !== 'draft';
    case 'cancelled':
      return params.status === 'cancelled';
    case 'draft':
      return params.status === 'draft';
    case 'all':
      return true;
    default:
      return false;
  }
}

export function adminShiftCapacity(params: {
  requiredPositions: number;
  occupied: number;
}): { required: number; occupied: number; remaining: number } {
  const required = Math.max(1, Math.trunc(params.requiredPositions || 1));
  const occupied = Math.max(0, Math.trunc(params.occupied));
  return {
    required,
    occupied: Math.min(required, occupied),
    remaining: remainingOpenPositions(required, occupied),
  };
}

/** Statuses counted toward occupancy — re-export for admin loaders. */
export const ADMIN_OCCUPYING_ASSIGNMENT_STATUSES =
  SHIFT_OCCUPYING_ASSIGNMENT_STATUSES;

/**
 * Prevent spreadsheet formula injection: keep values as literal text.
 * Prefix formula-leading characters for CSV/XLSX string cells.
 */
export function sanitizeSpreadsheetText(value: string | null | undefined): string {
  if (value == null) return '';
  const text = String(value);
  if (/^[=+\-@\t\r]/.test(text)) {
    return `'${text}`;
  }
  return text;
}

export type AdminShiftAggregateInput = {
  organizationId: string;
  requiredPositions: number;
  occupied: number;
};

/** Aggregate metrics for the full matching filter set (not a single page). */
export function computeAdminShiftAggregates(
  rows: ReadonlyArray<AdminShiftAggregateInput>,
): {
  shiftCount: number;
  organizationCount: number;
  requiredSlots: number;
  occupiedSlots: number;
  unfilledSlots: number;
} {
  const orgIds = new Set<string>();
  let requiredSlots = 0;
  let occupiedSlots = 0;
  let unfilledSlots = 0;

  for (const row of rows) {
    orgIds.add(row.organizationId);
    const cap = adminShiftCapacity({
      requiredPositions: row.requiredPositions,
      occupied: row.occupied,
    });
    requiredSlots += cap.required;
    occupiedSlots += cap.occupied;
    unfilledSlots += cap.remaining;
  }

  return {
    shiftCount: rows.length,
    organizationCount: orgIds.size,
    requiredSlots,
    occupiedSlots,
    unfilledSlots,
  };
}
