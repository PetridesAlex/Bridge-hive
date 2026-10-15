import {
  estimatedFullCoveragePayMinor,
  estimatedWorkerShiftPayMinor,
  filledPositionsLabel,
  openPositionsLabel,
  parseShiftPositions,
  remainingOpenPositions,
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
    expect(openPositionsLabel(0)).toBe('All positions filled');
    expect(openPositionsLabel(1)).toBe('1 position open');
    expect(openPositionsLabel(2)).toBe('2 positions open');
    expect(filledPositionsLabel(1, 3)).toBe('1 / 3 positions filled');
    expect(remainingOpenPositions(3, 1)).toBe(2);
    expect(remainingOpenPositions(1, 1)).toBe(0);
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
