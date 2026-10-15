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
  title: 'Day coverage',
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

  it('never deletes below the minimum batch size', () => {
    const starter = createStarterCustomRows(seed);
    expect(deleteCustomRow(starter, 0)).toHaveLength(BULK_SHIFT_MIN);
    const three = addCustomRow(starter, seed);
    expect(deleteCustomRow(three, 1)).toHaveLength(2);
  });

  it('clears back to two valid starter rows', () => {
    const three = addCustomRow(createStarterCustomRows(seed), seed);
    const cleared = clearCustomRows({
      ...seed,
      requiredRole: 'physiotherapist',
      rateEuros: '40.00',
    });
    expect(cleared).toHaveLength(BULK_SHIFT_MIN);
    expect(cleared[0]!.requiredRole).toBe('physiotherapist');
    expect(cleared[0]!.rateEuros).toBe('40.00');
    expect(three).toHaveLength(3);
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
        title: 'Other',
      },
    ];
    const next = copyFirstRowFieldsToAll(rows);
    expect(next[1]!.dateYmd).toBe('2026-10-20');
    expect(next[1]!.requiredRole).toBe('ward_assistant');
    expect(next[1]!.rateEuros).toBe('18.00');
    expect(next[1]!.title).toBe('Day coverage');
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
      title: 'x'.repeat(201),
    });
    expect(bad.dateYmd).toMatch(/valid date/i);
    expect(bad.startHm).toMatch(/start/i);
    expect(bad.endHm).toMatch(/end/i);
    expect(bad.locationId).toMatch(/location/i);
    expect(bad.breakMinutes).toMatch(/break/i);
    expect(bad.rateEuros).toMatch(/rate/i);
    expect(bad.title).toMatch(/200/i);

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
});
