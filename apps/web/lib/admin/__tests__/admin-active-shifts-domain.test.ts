import {
  adminShiftCapacity,
  adminShiftMatchesMonitorView,
  adminShiftShortRef,
  computeAdminShiftAggregates,
  deriveAdminShiftPhase,
  isAdminActiveShift,
  sanitizeSpreadsheetText,
} from '@bridge-hive/domain';

describe('admin active shifts domain helpers', () => {
  const now = new Date('2026-06-15T12:00:00.000Z');

  it('defines Active without a DB status named active', () => {
    expect(
      isAdminActiveShift({
        status: 'published',
        endsAtIso: '2026-06-15T18:00:00.000Z',
        now,
      }),
    ).toBe(true);
    expect(
      isAdminActiveShift({
        status: 'published',
        endsAtIso: '2026-06-15T10:00:00.000Z',
        now,
      }),
    ).toBe(false);
    expect(
      isAdminActiveShift({
        status: 'draft',
        endsAtIso: '2026-06-15T18:00:00.000Z',
        now,
      }),
    ).toBe(false);
  });

  it('derives overnight-capable phase from timestamps', () => {
    expect(
      deriveAdminShiftPhase(
        '2026-06-15T20:00:00.000Z',
        '2026-06-16T06:00:00.000Z',
        now,
      ),
    ).toBe('upcoming');
    expect(
      deriveAdminShiftPhase(
        '2026-06-15T10:00:00.000Z',
        '2026-06-16T02:00:00.000Z',
        now,
      ),
    ).toBe('in_progress');
  });

  it('keeps multi-seat capacity on one shift without overcount', () => {
    expect(adminShiftCapacity({ requiredPositions: 4, occupied: 2 })).toEqual({
      required: 4,
      occupied: 2,
      remaining: 2,
    });
  });

  it('aggregates matching-set metrics', () => {
    expect(
      computeAdminShiftAggregates([
        { organizationId: 'a', requiredPositions: 2, occupied: 1 },
        { organizationId: 'b', requiredPositions: 1, occupied: 1 },
      ]),
    ).toEqual({
      shiftCount: 2,
      organizationCount: 2,
      requiredSlots: 3,
      occupiedSlots: 2,
      unfilledSlots: 1,
    });
  });

  it('sanitizes formula-like spreadsheet text and short refs', () => {
    expect(adminShiftShortRef('5275f9d5-aaaa-4aaa-8aaa-aaaaaaaaaaaa')).toBe(
      '5275F9D5',
    );
    expect(sanitizeSpreadsheetText('=1+1')).toBe("'=1+1");
    expect(
      adminShiftMatchesMonitorView({
        view: 'ended',
        status: 'published',
        startsAtIso: '2026-06-14T08:00:00.000Z',
        endsAtIso: '2026-06-14T16:00:00.000Z',
        now,
      }),
    ).toBe(true);
  });
});
