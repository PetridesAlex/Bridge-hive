import {
  canDismissWorkspacePreparation,
  hasWorkspacePreparationBeenConsumed,
  markWorkspacePreparationConsumed,
  resetWorkspacePreparationConsumedForTests,
  WORKSPACE_PREPARATION_MINIMUM_MS,
  workspacePreparationMinMs,
} from '../workspace-preparation';

describe('workspace preparation gate', () => {
  beforeEach(() => {
    resetWorkspacePreparationConsumedForTests();
  });

  it('uses a 5 second minimum', () => {
    expect(WORKSPACE_PREPARATION_MINIMUM_MS).toBe(5000);
  });

  it('does not dismiss while auth/profile is still loading', () => {
    expect(
      canDismissWorkspacePreparation({ ready: false, minElapsed: true }),
    ).toBe(false);
  });

  it('does not dismiss before the minimum elapses even when ready', () => {
    expect(
      canDismissWorkspacePreparation({ ready: true, minElapsed: false }),
    ).toBe(false);
  });

  it('dismisses only when ready and minimum elapsed', () => {
    expect(
      canDismissWorkspacePreparation({ ready: true, minElapsed: true }),
    ).toBe(true);
  });

  it('keeps the cover longer than 5s conceptually when still not ready', () => {
    // After the timer would have fired, incomplete loading still blocks dismiss.
    expect(
      canDismissWorkspacePreparation({ ready: false, minElapsed: true }),
    ).toBe(false);
  });

  it('skips the artificial minimum after preparation was consumed in-session', () => {
    expect(workspacePreparationMinMs(false)).toBe(5000);
    expect(workspacePreparationMinMs(true)).toBe(0);
    expect(hasWorkspacePreparationBeenConsumed()).toBe(false);
    markWorkspacePreparationConsumed();
    expect(hasWorkspacePreparationBeenConsumed()).toBe(true);
    expect(workspacePreparationMinMs(true)).toBe(0);
  });
});
