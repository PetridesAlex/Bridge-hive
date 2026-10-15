import {
  BULK_SHIFT_MAX,
  SHIFT_POSITIONS_MAX,
  SHIFT_POSITIONS_MIN,
  addCalendarDaysYmd,
  isValidHm,
  isValidYmd,
  isoWeekdayOfYmd,
  parseShiftPositions,
  type IsoWeekday,
  type WorkerRole,
} from '@bridge-hive/domain';

export type BulkCustomRow = {
  key: string;
  dateYmd: string;
  startHm: string;
  endHm: string;
  locationId: string;
  wardId: string;
  requiredRole: WorkerRole;
  breakMinutes: number;
  rateEuros: string;
  positions: number;
};

export type BulkCustomRowSeed = {
  locationId: string;
  wardId: string;
  requiredRole: WorkerRole;
  startHm: string;
  endHm: string;
  breakMinutes: number;
  rateEuros: string;
  positions: number;
};

export type BulkCustomRowField =
  | 'dateYmd'
  | 'startHm'
  | 'endHm'
  | 'locationId'
  | 'wardId'
  | 'requiredRole'
  | 'breakMinutes'
  | 'rateEuros'
  | 'positions';

export type BulkCustomRowFieldErrors = Partial<
  Record<BulkCustomRowField, string>
>;

const WEEKDAY_SHORT: Record<IsoWeekday, string> = {
  1: 'Mon',
  2: 'Tue',
  3: 'Wed',
  4: 'Thu',
  5: 'Fri',
  6: 'Sat',
  7: 'Sun',
};

export function todayYmdLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function weekdayLabelForYmd(ymd: string): string {
  if (!isValidYmd(ymd)) return '—';
  return WEEKDAY_SHORT[isoWeekdayOfYmd(ymd)];
}

export function isOvernightShift(startHm: string, endHm: string): boolean {
  return isValidHm(startHm) && isValidHm(endHm) && endHm <= startHm;
}

export function createCustomRowKey(prefix = 'r'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createStarterCustomRows(seed: BulkCustomRowSeed): BulkCustomRow[] {
  const day0 = todayYmdLocal();
  return [
    {
      key: createCustomRowKey('r1'),
      dateYmd: day0,
      ...seed,
    },
    {
      key: createCustomRowKey('r2'),
      dateYmd: addCalendarDaysYmd(day0, 1),
      ...seed,
    },
  ];
}

export function wardBelongsToLocation(
  wardId: string,
  locationId: string,
  wards: Array<{ id: string; locationId: string }>,
): boolean {
  if (!wardId) return true;
  return wards.some((w) => w.id === wardId && w.locationId === locationId);
}

export function withLocationChange(
  row: BulkCustomRow,
  locationId: string,
  wards: Array<{ id: string; locationId: string }>,
): BulkCustomRow {
  const wardId = wardBelongsToLocation(row.wardId, locationId, wards)
    ? row.wardId
    : '';
  return { ...row, locationId, wardId };
}

export function addCustomRow(
  rows: BulkCustomRow[],
  seedFallback: BulkCustomRowSeed,
): BulkCustomRow[] {
  if (rows.length >= BULK_SHIFT_MAX) return rows;
  const last = rows[rows.length - 1];
  const next: BulkCustomRow = last
    ? {
        ...last,
        key: createCustomRowKey('add'),
        dateYmd: addCalendarDaysYmd(last.dateYmd, 1),
      }
    : {
        key: createCustomRowKey('add'),
        dateYmd: todayYmdLocal(),
        ...seedFallback,
      };
  return [...rows, next];
}

export function duplicateCustomRow(
  rows: BulkCustomRow[],
  index: number,
): BulkCustomRow[] {
  if (rows.length >= BULK_SHIFT_MAX) return rows;
  const row = rows[index];
  if (!row) return rows;
  const copy: BulkCustomRow = {
    ...row,
    key: createCustomRowKey('dup'),
    dateYmd: addCalendarDaysYmd(row.dateYmd, 1),
  };
  const next = [...rows];
  next.splice(index + 1, 0, copy);
  return next;
}

export function deleteCustomRow(
  rows: BulkCustomRow[],
  index: number,
): BulkCustomRow[] {
  if (index < 0 || index >= rows.length) return rows;
  return rows.filter((_, i) => i !== index);
}

/** Remove every custom row from the batch editor. */
export function clearCustomRows(): BulkCustomRow[] {
  return [];
}

export function copyFirstRowFieldsToAll(rows: BulkCustomRow[]): BulkCustomRow[] {
  const first = rows[0];
  if (!first) return rows;
  return rows.map((row) => ({
    ...row,
    startHm: first.startHm,
    endHm: first.endHm,
    locationId: first.locationId,
    wardId: first.wardId,
    requiredRole: first.requiredRole,
    breakMinutes: first.breakMinutes,
    rateEuros: first.rateEuros,
    positions: first.positions,
  }));
}

export function sumCustomRowPositions(rows: ReadonlyArray<BulkCustomRow>): number {
  return rows.reduce((sum, row) => sum + (Number.isFinite(row.positions) ? row.positions : 0), 0);
}

export function validateCustomRowFields(
  row: BulkCustomRow,
): BulkCustomRowFieldErrors {
  const errors: BulkCustomRowFieldErrors = {};

  if (!row.dateYmd || !isValidYmd(row.dateYmd)) {
    errors.dateYmd = 'Enter a valid date.';
  }
  if (!row.startHm || !isValidHm(row.startHm)) {
    errors.startHm = 'Enter a valid start time.';
  }
  if (!row.endHm || !isValidHm(row.endHm)) {
    errors.endHm = 'Enter a valid end time.';
  }
  if (!row.locationId) {
    errors.locationId = 'Select a location.';
  }
  if (!Number.isInteger(row.breakMinutes) || row.breakMinutes < 0) {
    errors.breakMinutes = 'Break must be zero or more minutes.';
  }
  const rate = Number.parseFloat(row.rateEuros);
  if (!Number.isFinite(rate) || rate <= 0) {
    errors.rateEuros = 'Enter a rate greater than zero.';
  }
  if (parseShiftPositions(row.positions) == null) {
    errors.positions = `Positions must be a whole number from ${SHIFT_POSITIONS_MIN} to ${SHIFT_POSITIONS_MAX}.`;
  }

  return errors;
}

export function parsePositionsInput(raw: string): number | null {
  return parseShiftPositions(raw);
}
