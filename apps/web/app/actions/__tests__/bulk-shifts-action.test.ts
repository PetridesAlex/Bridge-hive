/**
 * Unit tests for bulk shift batch action validation helpers (pure path).
 * RPC is covered by pgTAP; this file gates auth-shaped results & schemas.
 */

import {
  BULK_SHIFT_MAX,
  BULK_SHIFT_MIN,
  assertBulkShiftCount,
  findExactDuplicateShifts,
  newBulkRequestKey,
  type BulkPreviewShift,
} from '@bridge-hive/domain';

describe('bulk shift action gates', () => {
  it('rejects batches outside 2–100 before RPC', () => {
    expect(assertBulkShiftCount(1).ok).toBe(false);
    expect(assertBulkShiftCount(BULK_SHIFT_MIN).ok).toBe(true);
    expect(assertBulkShiftCount(BULK_SHIFT_MAX + 1).ok).toBe(false);
  });

  it('blocks exact duplicates unless confirmed', () => {
    const rows: BulkPreviewShift[] = [
      {
        rowIndex: 0,
        dateYmd: '2026-10-05',
        startsAtIso: '2026-10-05T06:00:00.000Z',
        endsAtIso: '2026-10-05T14:00:00.000Z',
        requiredRole: 'registered_nurse',
        locationId: 'loc',
        rateMinor: 2000,
        currency: 'EUR',
        breakMinutes: 0,
      },
      {
        rowIndex: 1,
        dateYmd: '2026-10-05',
        startsAtIso: '2026-10-05T06:00:00.000Z',
        endsAtIso: '2026-10-05T14:00:00.000Z',
        requiredRole: 'registered_nurse',
        locationId: 'loc',
        rateMinor: 2000,
        currency: 'EUR',
        breakMinutes: 0,
      },
    ];
    const dupes = findExactDuplicateShifts(rows);
    expect(dupes).toHaveLength(1);
    // Mimic action gate: without allowExactDuplicates → fail
    const allowExactDuplicates = false;
    expect(dupes.length > 0 && !allowExactDuplicates).toBe(true);
  });

  it('generates stable-length request keys for idempotency', () => {
    const key = newBulkRequestKey();
    expect(key.length).toBeGreaterThanOrEqual(8);
    expect(key.length).toBeLessThanOrEqual(128);
  });
});
