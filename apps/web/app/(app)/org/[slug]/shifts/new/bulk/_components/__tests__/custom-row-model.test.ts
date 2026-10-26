import {
  BULK_SHIFT_MAX,
  BULK_SHIFT_MIN,
} from '@bridge-hive/domain';

import {
  addCustomRow,
  clearCustomRows,
  copyFirstRowFieldsToAll,
  createStarterCustomRows,
  deleteCustomRow,
  duplicateCustomRow,
  isOvernightShift,
  validateCustomRowFields,
  wardBelongsToLocation,
  weekdayLabelForYmd,
  withLocationChange,
  type BulkCustomRow,
  type BulkCustomRowSeed,
} from '../custom-row-model';

const seed: BulkCustomRowSeed = {
  locationId: 'loc-a',
  wardId: 'ward-a',
  requiredRole: 'registered_nurse',
  startHm: '08:00',
  endHm: '16:00',
  breakMinutes: 30,
  rateEuros: '25.00',
  positions: 1,
};

const wards = [
  { id: 'ward-a', locationId: 'loc-a' },
  { id: 'ward-b', locationId: 'loc-b' },
];

describe('custom-row-model', () => {
  it('creates two starter rows with consecutive dates', () => {
    const rows = createStarterCustomRows(seed);
    expect(rows).toHaveLength(BULK_SHIFT_MIN);
    expect(rows[0]!.locationId).toBe('loc-a');
    expect(rows[0]!.requiredRole).toBe('registered_nurse');
    expect(rows[1]!.dateYmd > rows[0]!.dateYmd).toBe(true);
  });

  it('adds a row using the previous values and next calendar day', () => {
    const starter = createStarterCustomRows(seed);
    const next = addCustomRow(starter, seed);
    expect(next).toHaveLength(3);
    expect(next[2]!.startHm).toBe(starter[1]!.startHm);
    expect(next[2]!.dateYmd > starter[1]!.dateYmd).toBe(true);
  });

  it('stops adding at the batch maximum', () => {
    let rows = createStarterCustomRows(seed);
    for (let i = 0; i < BULK_SHIFT_MAX + 5; i += 1) {
      rows = addCustomRow(rows, seed);
    }
    expect(rows).toHaveLength(BULK_SHIFT_MAX);
  });

  it('duplicates a row below the source and advances its date', () => {
    const starter = createStarterCustomRows(seed);
    const next = duplicateCustomRow(starter, 0);
    expect(next).toHaveLength(3);
    expect(next[1]!.startHm).toBe(starter[0]!.startHm);
    expect(next[1]!.dateYmd > starter[0]!.dateYmd).toBe(true);
    expect(next[2]!.key).toBe(starter[1]!.key);
  });

  it('deletes any chosen row, including below the batch minimum', () => {
    const starter = createStarterCustomRows(seed);
    expect(deleteCustomRow(starter, 0)).toHaveLength(1);
    expect(deleteCustomRow(starter, 1)).toHaveLength(1);
    const three = addCustomRow(starter, seed);
    expect(deleteCustomRow(three, 1)).toHaveLength(2);
    expect(deleteCustomRow(deleteCustomRow(starter, 0), 0)).toHaveLength(0);
  });

  it('clears every custom row from the batch', () => {
    const three = addCustomRow(createStarterCustomRows(seed), seed);
    expect(three).toHaveLength(3);
    expect(clearCustomRows()).toEqual([]);
  });

  it('copies first-row fields without changing dates', () => {
    const rows: BulkCustomRow[] = [
      {
        key: 'a',
        dateYmd: '2026-10-15',
        ...seed,
        requiredRole: 'ward_assistant',
        rateEuros: '18.00',
      },
      {
        key: 'b',
        dateYmd: '2026-10-20',
        ...seed,
        requiredRole: 'physiotherapist',
        rateEuros: '45.00',
        positions: 3,
      },
    ];
    const next = copyFirstRowFieldsToAll(rows);
    expect(next[1]!.dateYmd).toBe('2026-10-20');
    expect(next[1]!.requiredRole).toBe('ward_assistant');
    expect(next[1]!.rateEuros).toBe('18.00');
    expect(next[1]!.positions).toBe(1);
  });

  it('resets an incompatible ward when the location changes', () => {
    const row: BulkCustomRow = {
      key: 'a',
      dateYmd: '2026-10-15',
      ...seed,
      wardId: 'ward-a',
    };
    const changed = withLocationChange(row, 'loc-b', wards);
    expect(changed.locationId).toBe('loc-b');
    expect(changed.wardId).toBe('');
    expect(wardBelongsToLocation('ward-a', 'loc-a', wards)).toBe(true);
    expect(wardBelongsToLocation('ward-a', 'loc-b', wards)).toBe(false);
  });

  it('keeps a compatible ward when the location stays valid', () => {
    const row: BulkCustomRow = {
      key: 'a',
      dateYmd: '2026-10-15',
      ...seed,
      wardId: 'ward-a',
    };
    expect(withLocationChange(row, 'loc-a', wards).wardId).toBe('ward-a');
  });

  it('treats no ward as a valid selection', () => {
    const row: BulkCustomRow = {
      key: 'a',
      dateYmd: '2026-10-15',
      ...seed,
      wardId: '',
    };
    expect(validateCustomRowFields(row)).not.toHaveProperty('wardId');
    expect(withLocationChange(row, 'loc-b', wards).wardId).toBe('');
  });

  it('retains entered row values when the shared wards list grows', () => {
    const rows = createStarterCustomRows(seed);
    rows[0]!.positions = 4;
    rows[0]!.rateEuros = '33.00';
    rows[0]!.wardId = '';

    const grownWards = [
      ...wards,
      { id: 'ward-new', locationId: 'loc-a' },
    ];
    // Selecting a newly added ward must not wipe other fields.
    const next = rows.map((row, index) =>
      index === 0 ? { ...row, wardId: 'ward-new' } : row,
    );

    expect(next[0]!.positions).toBe(4);
    expect(next[0]!.rateEuros).toBe('33.00');
    expect(next[0]!.wardId).toBe('ward-new');
    expect(wardBelongsToLocation('ward-new', 'loc-a', grownWards)).toBe(true);
    expect(next[1]!.positions).toBe(rows[1]!.positions);
  });

  it('validates required fields and overnight windows', () => {
    expect(isOvernightShift('22:00', '06:00')).toBe(true);
    expect(isOvernightShift('08:00', '16:00')).toBe(false);
    expect(weekdayLabelForYmd('2026-10-15')).toBe('Thu');

    const bad = validateCustomRowFields({
      key: 'x',
      dateYmd: 'bad',
      startHm: '99:99',
      endHm: '',
      locationId: '',
      wardId: '',
      requiredRole: 'registered_nurse',
      breakMinutes: -1,
      rateEuros: '0',
      positions: 0,
    });
    expect(bad.dateYmd).toMatch(/valid date/i);
    expect(bad.startHm).toMatch(/start/i);
    expect(bad.endHm).toMatch(/end/i);
    expect(bad.locationId).toMatch(/location/i);
    expect(bad.breakMinutes).toMatch(/break/i);
    expect(bad.rateEuros).toMatch(/rate/i);
    expect(bad.positions).toMatch(/1 to 100/i);

    expect(
      Object.keys(
        validateCustomRowFields({
          key: 'ok',
          dateYmd: '2026-10-15',
          ...seed,
        }),
      ),
    ).toHaveLength(0);
  });

  it('defaults positions to 1 and rejects invalid capacity values', () => {
    const rows = createStarterCustomRows(seed);
    expect(rows[0]!.positions).toBe(1);

    const base = {
      key: 'a',
      dateYmd: '2026-10-15',
      ...seed,
    };
    expect(validateCustomRowFields({ ...base, positions: 100 })).not.toHaveProperty(
      'positions',
    );
    expect(validateCustomRowFields({ ...base, positions: -1 }).positions).toMatch(
      /1 to 100/i,
    );
    expect(validateCustomRowFields({ ...base, positions: 1.5 }).positions).toMatch(
      /1 to 100/i,
    );
    expect(validateCustomRowFields({ ...base, positions: 101 }).positions).toMatch(
      /1 to 100/i,
    );

    const duplicated = duplicateCustomRow(
      [{ ...rows[0]!, positions: 7 }, rows[1]!],
      0,
    );
    expect(duplicated[1]!.positions).toBe(7);
  });
});
