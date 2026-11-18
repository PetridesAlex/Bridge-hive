import {
  createAlertDeduper,
  detectIncomingUnreadAlerts,
  orgMessageAlertDedupKey,
  parseOrgConversationSummaries,
  shouldMarkConversationRead,
  shouldSuppressIncomingToast,
  unreadSnapshotBadge,
  unreadSnapshotTotal,
} from '../org-messaging-alerts';
import type { OrgWorkerConversationSummary } from '@bridge-hive/domain';

function row(
  partial: Partial<OrgWorkerConversationSummary> &
    Pick<OrgWorkerConversationSummary, 'id' | 'workerId' | 'unreadCount'>,
): OrgWorkerConversationSummary {
  return {
    organizationId: '11111111-1111-4111-8111-111111111111',
    lastSenderKind: 'worker',
    workerName: 'Alex Worker',
    lastMessageAt: '2026-11-16T12:00:00.000Z',
    ...partial,
  };
}

describe('org messaging alerts helpers (mocked / unit)', () => {
  it('parses authorized conversation summaries and sums unread without fabricating counts', () => {
    const parsed = parseOrgConversationSummaries([
      row({
        id: '22222222-2222-4222-8222-222222222222',
        workerId: '33333333-3333-4333-8333-333333333333',
        unreadCount: 2,
      }),
      row({
        id: '44444444-4444-4444-8444-444444444444',
        workerId: '55555555-5555-4555-8555-555555555555',
        unreadCount: 0,
      }),
      { id: 'bad' },
    ]);
    expect(parsed).toHaveLength(2);
    expect(unreadSnapshotTotal(parsed)).toBe(2);
    expect(unreadSnapshotBadge(parsed)).toBe('2');
    expect(unreadSnapshotBadge([])).toBeNull();
    expect(
      unreadSnapshotBadge([
        row({
          id: '22222222-2222-4222-8222-222222222222',
          workerId: '33333333-3333-4333-8333-333333333333',
          unreadCount: 120,
        }),
      ]),
    ).toBe('99+');
  });

  it('baseline ready=false never replays old unread as toasts', () => {
    const next = [
      row({
        id: '22222222-2222-4222-8222-222222222222',
        workerId: '33333333-3333-4333-8333-333333333333',
        unreadCount: 3,
      }),
    ];
    expect(
      detectIncomingUnreadAlerts({ previous: [], next, baselineReady: false }),
    ).toEqual([]);
  });

  it('detects a new worker unread bump for toast while ignoring staff/outgoing and flat unread', () => {
    const conversationId = '22222222-2222-4222-8222-222222222222';
    const workerId = '33333333-3333-4333-8333-333333333333';
    const previous = [
      row({ id: conversationId, workerId, unreadCount: 0, lastSenderKind: 'worker' }),
    ];
    const workerBump = detectIncomingUnreadAlerts({
      previous,
      next: [
        row({
          id: conversationId,
          workerId,
          unreadCount: 1,
          lastSenderKind: 'worker',
          lastMessageAt: '2026-11-16T13:00:00.000Z',
          workerName: 'Maria',
        }),
      ],
      baselineReady: true,
    });
    expect(workerBump).toEqual([
      {
        conversationId,
        workerName: 'Maria',
        alertKey: `${conversationId}:2026-11-16T13:00:00.000Z`,
      },
    ]);

    expect(
      detectIncomingUnreadAlerts({
        previous,
        next: [
          row({
            id: conversationId,
            workerId,
            unreadCount: 1,
            lastSenderKind: 'organization_staff',
          }),
        ],
        baselineReady: true,
      }),
    ).toEqual([]);

    expect(
      detectIncomingUnreadAlerts({
        previous: [
          row({ id: conversationId, workerId, unreadCount: 2 }),
        ],
        next: [row({ id: conversationId, workerId, unreadCount: 2 })],
        baselineReady: true,
      }),
    ).toEqual([]);
  });

  it('suppresses toast for the focused visible thread and allows mark-read only then', () => {
    const conversationId = '22222222-2222-4222-8222-222222222222';
    expect(
      shouldSuppressIncomingToast({
        conversationId,
        focusedConversationId: conversationId,
        tabVisible: true,
      }),
    ).toBe(true);
    expect(
      shouldSuppressIncomingToast({
        conversationId,
        focusedConversationId: conversationId,
        tabVisible: false,
      }),
    ).toBe(false);
    expect(
      shouldMarkConversationRead({
        conversationId,
        selectedConversationId: conversationId,
        tabVisible: true,
      }),
    ).toBe(true);
    expect(
      shouldMarkConversationRead({
        conversationId,
        selectedConversationId: conversationId,
        tabVisible: false,
      }),
    ).toBe(false);
    expect(
      shouldMarkConversationRead({
        conversationId,
        selectedConversationId: '66666666-6666-4666-8666-666666666666',
        tabVisible: true,
      }),
    ).toBe(false);
  });

  it('dedupes repeated alert keys within one tab', () => {
    const deduper = createAlertDeduper();
    const key = orgMessageAlertDedupKey({
      userId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      organizationId: '11111111-1111-4111-8111-111111111111',
      alertKey: 'conv:msg',
    });
    expect(deduper.claim(key)).toBe(true);
    expect(deduper.claim(key)).toBe(false);
    deduper.clear();
    expect(deduper.claim(key)).toBe(true);
  });
});
