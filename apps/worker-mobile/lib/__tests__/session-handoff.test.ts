import {
  beginSessionHandoff,
  claimSessionHandoffFinish,
  completeSessionHandoff,
  isSessionHandoffActive,
  resetSessionHandoffForTests,
  subscribeSessionHandoff,
} from '../session-handoff';

describe('session handoff flag', () => {
  beforeEach(() => {
    resetSessionHandoffForTests();
  });

  it('stays active across begin until complete', () => {
    expect(isSessionHandoffActive()).toBe(false);
    beginSessionHandoff();
    expect(isSessionHandoffActive()).toBe(true);
    completeSessionHandoff();
    expect(isSessionHandoffActive()).toBe(false);
  });

  it('notifies subscribers when handoff begins and completes', () => {
    const seen: boolean[] = [];
    const unsub = subscribeSessionHandoff((active) => {
      seen.push(active);
    });
    beginSessionHandoff();
    completeSessionHandoff();
    unsub();
    expect(seen[0]).toBe(false);
    expect(seen).toContain(true);
    expect(seen[seen.length - 1]).toBe(false);
  });

  it('allows only one finish claim across login + overlay', () => {
    beginSessionHandoff();
    expect(claimSessionHandoffFinish()).toBe(true);
    expect(claimSessionHandoffFinish()).toBe(false);
    expect(isSessionHandoffActive()).toBe(false);
  });
});
