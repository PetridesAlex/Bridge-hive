import {
  BULK_SHIFT_MAX,
  BULK_SHIFT_MIN,
  assertBulkDateSpan,
  assertBulkShiftCount,
  deadlineHoursBeforeStart,
  expandIndividualDates,
  expandWeekdayRecurrence,
  findExactDuplicateShifts,
  findOverlappingShifts,
  isoWeekdayOfYmd,
  resolveShiftLocalWindow,
  summarizeBulkBatch,
  type BulkPreviewShift,
} from '@bridge-hive/domain';

describe('bulk shift domain helpers', () => {
  describe('expandWeekdayRecurrence', () => {
    it('expands Mon/Wed in a two-week range', () => {
      // 2026-10-05 is Monday
      const result = expandWeekdayRecurrence({
        startYmd: '2026-10-05',
        endYmd: '2026-10-16',
        weekdays: [1, 3],
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.dates).toEqual([
        '2026-10-05',
        '2026-10-07',
        '2026-10-12',
        '2026-10-14',
      ]);
    });

    it('rejects empty weekdays and oversized spans', () => {
      expect(
        expandWeekdayRecurrence({
          startYmd: '2026-10-01',
          endYmd: '2026-10-10',
          weekdays: [],
        }).ok,
      ).toBe(false);

      expect(
        assertBulkDateSpan('2026-01-01', '2026-08-01').ok,
      ).toBe(false);
    });

    it('rejects fewer than min shifts', () => {
      const result = expandWeekdayRecurrence({
        startYmd: '2026-10-05',
        endYmd: '2026-10-05',
        weekdays: [1],
      });
      expect(result.ok).toBe(false);
    });
  });

  describe('expandIndividualDates', () => {
    it('dedupes and sorts', () => {
      const result = expandIndividualDates([
        '2026-10-10',
        '2026-10-08',
        '2026-10-10',
      ]);
      expect(result).toEqual({
        ok: true,
        dates: ['2026-10-08', '2026-10-10'],
      });
    });

    it('rejects single date', () => {
      expect(expandIndividualDates(['2026-10-08']).ok).toBe(false);
    });
  });

  describe('overnight + deadline', () => {
    it('rolls end to next day when endHm <= startHm', () => {
      const window = resolveShiftLocalWindow({
        dateYmd: '2026-10-05',
        startHm: '22:00',
        endHm: '06:00',
      });
      expect(window).toEqual({
        ok: true,
        startsLocal: '2026-10-05T22:00',
        endsLocal: '2026-10-06T06:00',
        overnight: true,
      });
    });

    it('keeps same day for day shift', () => {
      const window = resolveShiftLocalWindow({
        dateYmd: '2026-10-05',
        startHm: '08:00',
        endHm: '16:00',
      });
      expect(window.ok && window.overnight).toBe(false);
      if (!window.ok) return;
      expect(window.endsLocal).toBe('2026-10-05T16:00');
    });

    it('computes deadline hours before start', () => {
      const result = deadlineHoursBeforeStart(
        '2026-10-05T08:00:00.000Z',
        12,
      );
      expect(result).toEqual({
        ok: true,
        deadlineIso: '2026-10-04T20:00:00.000Z',
      });
    });
  });

  describe('duplicates / overlaps / summary / limits', () => {
    const base: BulkPreviewShift = {
      rowIndex: 0,
      dateYmd: '2026-10-05',
      startsAtIso: '2026-10-05T06:00:00.000Z',
      endsAtIso: '2026-10-05T14:00:00.000Z',
      requiredRole: 'registered_nurse',
      locationId: 'loc-1',
      rateMinor: 2500,
      currency: 'EUR',
      breakMinutes: 30,
    };

    it('finds exact duplicates', () => {
      const dupes = findExactDuplicateShifts([
        base,
        { ...base, rowIndex: 1 },
        { ...base, rowIndex: 2, startsAtIso: '2026-10-06T06:00:00.000Z', endsAtIso: '2026-10-06T14:00:00.000Z' },
      ]);
      expect(dupes).toHaveLength(1);
      expect(dupes[0]).toMatchObject({ a: 0, b: 1 });
    });

    it('finds overlaps on same location', () => {
      const overlaps = findOverlappingShifts([
        base,
        {
          ...base,
          rowIndex: 1,
          startsAtIso: '2026-10-05T12:00:00.000Z',
          endsAtIso: '2026-10-05T18:00:00.000Z',
        },
        {
          ...base,
          rowIndex: 2,
          locationId: 'loc-2',
          startsAtIso: '2026-10-05T12:00:00.000Z',
          endsAtIso: '2026-10-05T18:00:00.000Z',
        },
      ]);
      expect(overlaps).toEqual([{ a: 0, b: 1 }]);
    });

    it('summarizes role counts and gross', () => {
      const summary = summarizeBulkBatch([
        base,
        {
          ...base,
          rowIndex: 1,
          requiredRole: 'ward_assistant',
          rateMinor: 1800,
          breakMinutes: 0,
          startsAtIso: '2026-10-06T06:00:00.000Z',
          endsAtIso: '2026-10-06T14:00:00.000Z',
        },
      ]);
      expect(summary.shiftCount).toBe(2);
      expect(summary.roleCounts.find((r) => r.role === 'registered_nurse')?.count).toBe(1);
      expect(summary.roleCounts.find((r) => r.role === 'ward_assistant')?.count).toBe(1);
      // RN: 7.5h * 2500 = 18750; WA: 8h * 1800 = 14400
      expect(summary.estimatedGrossMinor).toBe(18750 + 14400);
    });

    it('enforces min/max counts', () => {
      expect(assertBulkShiftCount(1).ok).toBe(false);
      expect(assertBulkShiftCount(BULK_SHIFT_MIN).ok).toBe(true);
      expect(assertBulkShiftCount(BULK_SHIFT_MAX).ok).toBe(true);
      expect(assertBulkShiftCount(BULK_SHIFT_MAX + 1).ok).toBe(false);
    });

    it('isoWeekdayOfYmd matches Monday', () => {
      expect(isoWeekdayOfYmd('2026-10-05')).toBe(1);
      expect(isoWeekdayOfYmd('2026-10-11')).toBe(7);
    });
  });
});
