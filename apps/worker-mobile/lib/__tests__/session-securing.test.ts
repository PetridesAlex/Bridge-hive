import {
  SESSION_SECURING_MAX_MS,
  SESSION_SECURING_MIN_MS,
  SESSION_SECURING_STEPS,
  sessionSecuringStepIndex,
  shouldFinishSessionSecuring,
} from '@/lib/session-securing';

describe('session securing handoff', () => {
  it('holds 4s minimum and caps at 5s', () => {
    expect(SESSION_SECURING_MIN_MS).toBe(4000);
    expect(SESSION_SECURING_MAX_MS).toBe(5000);
  });

  it('maps progress across four staged steps', () => {
    expect(SESSION_SECURING_STEPS).toEqual(['verify', 'encrypt', 'sync', 'open']);
    expect(sessionSecuringStepIndex(0)).toBe(0);
    expect(sessionSecuringStepIndex(0.24)).toBe(0);
    expect(sessionSecuringStepIndex(0.26)).toBe(1);
    expect(sessionSecuringStepIndex(0.51)).toBe(2);
    expect(sessionSecuringStepIndex(0.76)).toBe(3);
    expect(sessionSecuringStepIndex(1)).toBe(3);
  });

  it('finishes after min when ready, or at the hard cap', () => {
    expect(
      shouldFinishSessionSecuring({ ready: true, minElapsed: true, maxElapsed: false }),
    ).toBe(true);
    expect(
      shouldFinishSessionSecuring({ ready: false, minElapsed: true, maxElapsed: false }),
    ).toBe(false);
    expect(
      shouldFinishSessionSecuring({ ready: false, minElapsed: false, maxElapsed: true }),
    ).toBe(true);
  });
});
