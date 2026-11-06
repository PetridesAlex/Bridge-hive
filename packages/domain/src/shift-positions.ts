import { grossFromRateAndMinutes } from './money';

/** Capacity of a single shift: how many eligible workers may accept it. */
export const SHIFT_POSITIONS_MIN = 1;
export const SHIFT_POSITIONS_MAX = 100;

/**
 * Assignment statuses that occupy one position on a multi-worker shift.
 * Must stay aligned with `shift_active_assignment_count` in
 * `supabase/migrations/031_shift_positions_capacity.sql`.
 *
 * Not occupying: withdrawn, cancelled, rejected, no_show.
 */
export const SHIFT_OCCUPYING_ASSIGNMENT_STATUSES = [
  'accepted',
  'checked_in',
  'checked_out',
  'submitted',
  'approved',
] as const;

export type ShiftOccupyingAssignmentStatus =
  (typeof SHIFT_OCCUPYING_ASSIGNMENT_STATUSES)[number];

export function isOccupyingAssignmentStatus(
  status: string | null | undefined,
): status is ShiftOccupyingAssignmentStatus {
  if (!status) return false;
  return (SHIFT_OCCUPYING_ASSIGNMENT_STATUSES as readonly string[]).includes(
    status,
  );
}

/** Count assignments that currently occupy capacity. */
export function countOccupyingAssignments(
  statuses: ReadonlyArray<string | null | undefined>,
): number {
  return statuses.reduce(
    (sum, status) => sum + (isOccupyingAssignmentStatus(status) ? 1 : 0),
    0,
  );
}

export function clampShiftPositions(value: number): number {
  if (!Number.isFinite(value)) return SHIFT_POSITIONS_MIN;
  return Math.min(
    SHIFT_POSITIONS_MAX,
    Math.max(SHIFT_POSITIONS_MIN, Math.trunc(value)),
  );
}

/** Parse UI/form input into a valid positions integer, or null if invalid. */
export function parseShiftPositions(raw: unknown): number | null {
  if (typeof raw === 'number') {
    if (!Number.isInteger(raw)) return null;
    if (raw < SHIFT_POSITIONS_MIN || raw > SHIFT_POSITIONS_MAX) return null;
    return raw;
  }
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed || !/^\d+$/.test(trimmed)) return null;
  const value = Number.parseInt(trimmed, 10);
  if (value < SHIFT_POSITIONS_MIN || value > SHIFT_POSITIONS_MAX) return null;
  return value;
}

export function sumRequiredPositions(
  rows: ReadonlyArray<{ requiredPositions?: number | null; positions?: number | null }>,
): number {
  return rows.reduce((sum, row) => {
    const value = row.requiredPositions ?? row.positions ?? SHIFT_POSITIONS_MIN;
    return sum + (Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0);
  }, 0);
}

export function openPositionsLabel(openCount: number): string {
  const n = Math.max(0, Math.trunc(openCount));
  return n === 1 ? '1 position open' : `${n} positions open`;
}

export function filledPositionsLabel(
  filledCount: number,
  requiredPositions: number,
): string {
  const filled = Math.max(0, Math.trunc(filledCount));
  const required = Math.max(
    SHIFT_POSITIONS_MIN,
    Math.trunc(requiredPositions || SHIFT_POSITIONS_MIN),
  );
  return `${filled} / ${required} positions filled`;
}

/**
 * Organization availability copy.
 * Example: "4 positions · 2 filled · 2 available"
 * Fully booked: "4 positions · 4 filled · Fully booked"
 */
export function positionsAvailabilityLabel(
  requiredPositions: number,
  filledCount: number,
): string {
  const required = Math.max(
    SHIFT_POSITIONS_MIN,
    Math.trunc(requiredPositions || SHIFT_POSITIONS_MIN),
  );
  const filled = Math.min(
    required,
    Math.max(0, Math.trunc(filledCount)),
  );
  const open = remainingOpenPositions(required, filled);
  const positionsWord = required === 1 ? 'position' : 'positions';
  if (open === 0) {
    return `${required} ${positionsWord} · ${filled} filled · Fully booked`;
  }
  return `${required} ${positionsWord} · ${filled} filled · ${open} available`;
}

/** Compact calendar / chip label: "2/4" or "Full". */
export function positionsCompactLabel(
  requiredPositions: number,
  filledCount: number,
): string {
  const required = Math.max(
    SHIFT_POSITIONS_MIN,
    Math.trunc(requiredPositions || SHIFT_POSITIONS_MIN),
  );
  const filled = Math.min(
    required,
    Math.max(0, Math.trunc(filledCount)),
  );
  const open = remainingOpenPositions(required, filled);
  if (open === 0) return 'Full';
  return `${filled}/${required}`;
}

export function remainingOpenPositions(
  requiredPositions: number,
  activeAssignments: number,
): number {
  const required = Math.max(
    SHIFT_POSITIONS_MIN,
    Math.trunc(requiredPositions || SHIFT_POSITIONS_MIN),
  );
  const active = Math.max(0, Math.trunc(activeAssignments));
  return Math.max(0, required - active);
}

/** Paid minutes for a shift window (break excluded). */
export function estimatedShiftPaidMinutes(params: {
  startsAtIso: string;
  endsAtIso: string;
  breakMinutes?: number | null;
}): number {
  const start = new Date(params.startsAtIso).getTime();
  const end = new Date(params.endsAtIso).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
  const breakMinutes = Math.max(0, Math.trunc(params.breakMinutes ?? 0));
  return Math.max(0, Math.round((end - start) / 60_000) - breakMinutes);
}

/**
 * Expected pay for one professional on a multi-position shift.
 * Rate is always per professional; never multiply by positions here.
 */
export function estimatedWorkerShiftPayMinor(params: {
  rateMinor: number;
  startsAtIso: string;
  endsAtIso: string;
  breakMinutes?: number | null;
}): number {
  if (!Number.isFinite(params.rateMinor) || params.rateMinor <= 0) return 0;
  const minutes = estimatedShiftPaidMinutes(params);
  if (minutes <= 0) return 0;
  return grossFromRateAndMinutes(params.rateMinor, minutes);
}

/**
 * Organization labor estimate when every position is filled at the shared rate.
 * Example: 2 positions × €25/h × 8h = €400.
 */
export function estimatedFullCoveragePayMinor(params: {
  rateMinor: number;
  startsAtIso: string;
  endsAtIso: string;
  breakMinutes?: number | null;
  requiredPositions?: number | null;
}): number {
  const perWorker = estimatedWorkerShiftPayMinor(params);
  return perWorker * clampShiftPositions(params.requiredPositions ?? SHIFT_POSITIONS_MIN);
}
