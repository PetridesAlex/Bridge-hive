import {
  countOccupyingAssignments,
  estimatedFullCoveragePayMinor,
  estimatedWorkerShiftPayMinor,
  filledPositionsLabel,
  isOccupyingAssignmentStatus,
  openPositionsLabel,
  parseShiftPositions,
  positionsAvailabilityLabel,
  positionsCompactLabel,
  remainingOpenPositions,
  SHIFT_OCCUPYING_ASSIGNMENT_STATUSES,
  sumRequiredPositions,
} from '../shift-positions';

describe('shift-positions', () => {
  it('defaults and accepts 1–100', () => {
    expect(parseShiftPositions(1)).toBe(1);
    expect(parseShiftPositions(100)).toBe(100);
    expect(parseShiftPositions('42')).toBe(42);
  });

  it('rejects 0, negative, decimal, blank, and >100', () => {
    expect(parseShiftPositions(0)).toBeNull();
    expect(parseShiftPositions(-1)).toBeNull();
    expect(parseShiftPositions(1.5)).toBeNull();
    expect(parseShiftPositions('')).toBeNull();
    expect(parseShiftPositions('  ')).toBeNull();
    expect(parseShiftPositions('1.5')).toBeNull();
    expect(parseShiftPositions(101)).toBeNull();
    expect(parseShiftPositions('101')).toBeNull();
  });

  it('sums required positions across rows', () => {
    expect(
      sumRequiredPositions([
        { requiredPositions: 2 },
        { positions: 3 },
        {},
      ]),
    ).toBe(6);
  });

  it('formats remaining and filled copy for RN / WA / physio-style capacity', () => {
    expect(openPositionsLabel(1)).toBe('1 position open');
    expect(openPositionsLabel(2)).toBe('2 positions open');
    expect(filledPositionsLabel(1, 3)).toBe('1 / 3 positions filled');
    expect(remainingOpenPositions(3, 1)).toBe(2);
    expect(remainingOpenPositions(1, 1)).toBe(0);
  });

  it('formats org availability and compact calendar labels', () => {
    expect(positionsAvailabilityLabel(4, 2)).toBe(
      '4 positions · 2 filled · 2 available',
    );
    expect(positionsAvailabilityLabel(1, 0)).toBe(
      '1 position · 0 filled · 1 available',
    );
    expect(positionsAvailabilityLabel(4, 4)).toBe(
      '4 positions · 4 filled · Fully booked',
    );
    expect(positionsCompactLabel(4, 2)).toBe('2/4');
    expect(positionsCompactLabel(4, 4)).toBe('Full');
  });

  it('matches SQL occupancy: rejected and no_show do not occupy capacity', () => {
    expect(SHIFT_OCCUPYING_ASSIGNMENT_STATUSES).toEqual([
      'accepted',
      'checked_in',
      'checked_out',
      'submitted',
      'approved',
    ]);
    expect(isOccupyingAssignmentStatus('accepted')).toBe(true);
    expect(isOccupyingAssignmentStatus('rejected')).toBe(false);
    expect(isOccupyingAssignmentStatus('no_show')).toBe(false);
    expect(isOccupyingAssignmentStatus('withdrawn')).toBe(false);
    expect(
      countOccupyingAssignments([
        'accepted',
        'rejected',
        'withdrawn',
        'no_show',
        'approved',
      ]),
    ).toBe(2);
  });

  it('treats rate as per-professional; full coverage multiplies by positions', () => {
    const window = {
      rateMinor: 2500,
      startsAtIso: '2026-10-15T08:00:00.000Z',
      endsAtIso: '2026-10-15T16:00:00.000Z',
      breakMinutes: 0,
    };
    // €25/h × 8h = €200 per worker
    expect(estimatedWorkerShiftPayMinor(window)).toBe(20000);
    // 2 positions → €400 org labor when full
    expect(
      estimatedFullCoveragePayMinor({ ...window, requiredPositions: 2 }),
    ).toBe(40000);
  });
});
