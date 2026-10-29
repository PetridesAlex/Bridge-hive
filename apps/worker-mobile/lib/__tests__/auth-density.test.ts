import {
  authShellMetrics,
  resolveAuthDensity,
  welcomeMetrics,
} from '../auth-density';

const device = (height: number, insetTop: number, insetBottom: number, fontScale = 1) =>
  resolveAuthDensity({ height, insetTop, insetBottom, fontScale });

describe('resolveAuthDensity', () => {
  it('classifies common iPhone heights', () => {
    expect(device(667, 20, 0)).toBe('compact'); // iPhone SE
    expect(device(812, 50, 34)).toBe('regular'); // iPhone 13 mini
    expect(device(852, 59, 34)).toBe('roomy'); // iPhone 15 / 16
    expect(device(932, 59, 34)).toBe('roomy'); // Pro Max class
  });

  it('drops a tier when Dynamic Type is large', () => {
    expect(device(852, 59, 34, 1.4)).toBe('compact');
    expect(device(852, 59, 34, 1.15)).toBe('regular');
  });

  it('never treats fontScale below 1 as extra room', () => {
    expect(device(667, 20, 0, 0.8)).toBe('compact');
  });
});

describe('density metrics', () => {
  it('shrinks artwork and spacing monotonically as height tightens', () => {
    const roomy = authShellMetrics('roomy');
    const regular = authShellMetrics('regular');
    const compact = authShellMetrics('compact');
    expect(roomy.landingMark).toBeGreaterThan(regular.landingMark);
    expect(regular.landingMark).toBeGreaterThan(compact.landingMark);
    expect(roomy.cardPad).toBeGreaterThan(compact.cardPad);
  });

  it('keeps readable body text and cue labels at every density', () => {
    for (const d of ['roomy', 'regular', 'compact'] as const) {
      expect(authShellMetrics(d).subtitle.size).toBeGreaterThanOrEqual(14);
      expect(welcomeMetrics(d).subtitle.size).toBeGreaterThanOrEqual(15);
      expect(welcomeMetrics(d).cueLabel.size).toBeGreaterThanOrEqual(14);
    }
  });
});
