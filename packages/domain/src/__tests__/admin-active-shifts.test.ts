import {
  adminShiftCapacity,
  adminShiftMatchesMonitorView,
  adminShiftShortRef,
  computeAdminShiftAggregates,
  deriveAdminShiftPhase,
  isAdminActiveShift,
  sanitizeSpreadsheetText,
} from '../admin-active-shifts';

describe('admin active shifts helpers', () => {
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
        status: 'filled',
        endsAtIso: '2026-06-15T18:00:00.000Z',
        now,
      }),
    ).toBe(true);
    expect(
      isAdminActiveShift({
        status: 'draft',
        endsAtIso: '2026-06-15T18:00:00.000Z',
        now,
      }),
    ).toBe(false);
    expect(
      isAdminActiveShift({
        status: 'published',
        endsAtIso: '2026-06-15T10:00:00.000Z',
        now,
      }),
    ).toBe(false);
    expect(
      isAdminActiveShift({
        status: 'cancelled',
        endsAtIso: '2026-06-15T18:00:00.000Z',
        now,
      }),
    ).toBe(false);
  });

  it('derives phase from timestamps, not stored status', () => {
    expect(
      deriveAdminShiftPhase(
        '2026-06-15T14:00:00.000Z',
        '2026-06-15T22:00:00.000Z',
        now,
      ),
    ).toBe('upcoming');
    expect(
      deriveAdminShiftPhase(
        '2026-06-15T10:00:00.000Z',
        '2026-06-15T18:00:00.000Z',
        now,
      ),
    ).toBe('in_progress');
    expect(
      deriveAdminShiftPhase(
        '2026-06-14T10:00:00.000Z',
        '2026-06-15T10:00:00.000Z',
        now,
      ),
    ).toBe('ended');
  });

  it('keeps ended published shifts out of Active / upcoming', () => {
    expect(
      adminShiftMatchesMonitorView({
        view: 'active',
        status: 'published',
        startsAtIso: '2026-06-14T08:00:00.000Z',
        endsAtIso: '2026-06-14T16:00:00.000Z',
        now,
      }),
    ).toBe(false);
    expect(
      adminShiftMatchesMonitorView({
        view: 'upcoming',
        status: 'published',
        startsAtIso: '2026-06-14T08:00:00.000Z',
        endsAtIso: '2026-06-14T16:00:00.000Z',
        now,
      }),
    ).toBe(false);
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

  it('includes fully staffed active shifts', () => {
    const cap = adminShiftCapacity({ requiredPositions: 4, occupied: 4 });
    expect(cap.remaining).toBe(0);
    expect(
      isAdminActiveShift({
        status: 'filled',
        endsAtIso: '2026-06-15T20:00:00.000Z',
        now,
      }),
    ).toBe(true);
  });

  it('computes capacity without inventing seats', () => {
    expect(adminShiftCapacity({ requiredPositions: 3, occupied: 1 })).toEqual({
      required: 3,
      occupied: 1,
      remaining: 2,
    });
    expect(adminShiftCapacity({ requiredPositions: 2, occupied: 5 })).toEqual({
      required: 2,
      occupied: 2,
      remaining: 0,
    });
  });

  it('aggregates unique orgs and slots without page fiction', () => {
    const agg = computeAdminShiftAggregates([
      { organizationId: 'a', requiredPositions: 2, occupied: 1 },
      { organizationId: 'a', requiredPositions: 3, occupied: 3 },
      { organizationId: 'b', requiredPositions: 1, occupied: 0 },
    ]);
    expect(agg).toEqual({
      shiftCount: 3,
      organizationCount: 2,
      requiredSlots: 6,
      occupiedSlots: 4,
      unfilledSlots: 2,
    });
  });

  it('builds short refs and sanitizes spreadsheet formula text', () => {
    expect(adminShiftShortRef('5275f9d5-1111-4111-8111-111111111111')).toBe(
      '5275F9D5',
    );
    expect(sanitizeSpreadsheetText('=HYPERLINK("x")')).toBe("'=HYPERLINK(\"x\")");
    expect(sanitizeSpreadsheetText('+1234')).toBe("'+1234");
    expect(sanitizeSpreadsheetText('@name')).toBe("'@name");
    expect(sanitizeSpreadsheetText('Clinic A')).toBe('Clinic A');
  });
});
