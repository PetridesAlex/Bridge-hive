/** Capacity of a single shift: how many eligible workers may accept it. */
export const SHIFT_POSITIONS_MIN = 1;
export const SHIFT_POSITIONS_MAX = 100;

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
