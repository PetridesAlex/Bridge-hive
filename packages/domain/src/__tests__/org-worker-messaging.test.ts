import {
  canOrgStaffMessage,
  filterConversationsByQuery,
  isMessagingEligible,
  mergeMessagePage,
  messagePreview,
  normalizeMessageBody,
  ORG_WORKER_MESSAGE_MAX_LENGTH,
  sortMessagesAscending,
  type OrgWorkerConversationSummary,
  type OrgWorkerMessageRow,
} from '../org-worker-messaging';
import {
  appRouteFromPushData,
  buildOrgWorkerMessageNotification,
  messageNotificationUrl,
  messageRouteFromPushData,
  ORG_WORKER_MESSAGE_PUSH_TYPE,
  shiftRouteFromPushData,
} from '../push-notifications';

const eligibleBase = {
  organizationActive: true,
  workerAccountActive: true,
  workerVerified: true,
  workerRole: 'registered_nurse',
  isAppReviewDemo: false,
  hasApprovedCompletedWork: true,
};

describe('isMessagingEligible', () => {
  it('requires verified active non-demo worker with approved work', () => {
    expect(isMessagingEligible(eligibleBase)).toBe(true);
  });

  it('rejects demo, unverified, inactive org/worker, and missing approval', () => {
    expect(isMessagingEligible({ ...eligibleBase, isAppReviewDemo: true })).toBe(false);
    expect(isMessagingEligible({ ...eligibleBase, workerVerified: false })).toBe(false);
    expect(isMessagingEligible({ ...eligibleBase, workerAccountActive: false })).toBe(false);
    expect(isMessagingEligible({ ...eligibleBase, organizationActive: false })).toBe(false);
    expect(
      isMessagingEligible({ ...eligibleBase, hasApprovedCompletedWork: false }),
    ).toBe(false);
    expect(isMessagingEligible({ ...eligibleBase, workerRole: 'doctor' })).toBe(false);
  });
});

describe('canOrgStaffMessage', () => {
  it('allows operate + shifts or timesheets; denies billing-only', () => {
    expect(
      canOrgStaffMessage({
        canOperate: true,
        canManageShifts: true,
        canReviewTimesheets: false,
      }),
    ).toBe(true);
    expect(
      canOrgStaffMessage({
        canOperate: true,
        canManageShifts: false,
        canReviewTimesheets: true,
      }),
    ).toBe(true);
    expect(
      canOrgStaffMessage({
        canOperate: true,
        canManageShifts: false,
        canReviewTimesheets: false,
      }),
    ).toBe(false);
    expect(
      canOrgStaffMessage({
        canOperate: false,
        canManageShifts: true,
        canReviewTimesheets: true,
      }),
    ).toBe(false);
  });
});

describe('normalizeMessageBody / preview / merge', () => {
  it('trims body and enforces max length', () => {
    expect(normalizeMessageBody('  hello  ')).toEqual({ ok: true, body: 'hello' });
    expect(normalizeMessageBody('   ')).toEqual({ ok: false, error: 'empty' });
    expect(
      normalizeMessageBody('x'.repeat(ORG_WORKER_MESSAGE_MAX_LENGTH + 1)),
    ).toEqual({ ok: false, error: 'too_long' });
  });

  it('previews without reordering pages', () => {
    expect(messagePreview('a'.repeat(130)).endsWith('…')).toBe(true);
    const older: OrgWorkerMessageRow = {
      id: '11111111-1111-4111-8111-111111111111',
      conversationId: 'c',
      senderUserId: 'u',
      senderKind: 'worker',
      body: 'a',
      clientMessageId: 'client-a',
      createdAt: '2026-01-01T10:00:00.000Z',
    };
    const newer: OrgWorkerMessageRow = {
      ...older,
      id: '22222222-2222-4222-8222-222222222222',
      clientMessageId: 'client-b',
      body: 'b',
      createdAt: '2026-01-01T11:00:00.000Z',
    };
    expect(sortMessagesAscending([newer, older]).map((m) => m.body)).toEqual([
      'a',
      'b',
    ]);
    const optimistic: OrgWorkerMessageRow = {
      ...newer,
      id: 'temp-client-b',
      body: 'pending',
    };
    const merged = mergeMessagePage([optimistic], [newer]);
    expect(merged).toHaveLength(1);
    expect(merged[0].id).toBe(newer.id);
    expect(merged[0].body).toBe('b');
  });
});

describe('filterConversationsByQuery', () => {
  it('matches worker name and role labels', () => {
    const rows: OrgWorkerConversationSummary[] = [
      {
        id: '1',
        organizationId: 'o',
        workerId: 'w',
        workerName: 'Alex Nurse',
        workerRole: 'registered_nurse',
        unreadCount: 0,
      },
    ];
    expect(filterConversationsByQuery(rows, 'alex')).toHaveLength(1);
    expect(filterConversationsByQuery(rows, 'νοσηλευ')).toHaveLength(1);
    expect(filterConversationsByQuery(rows, 'zzz')).toHaveLength(0);
  });
});

describe('org worker message push', () => {
  const conversationId = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';

  it('builds localized title without chat body on the lock screen', () => {
    const en = buildOrgWorkerMessageNotification({
      conversationId,
      organizationName: 'Acme Care',
      locale: 'en',
    });
    expect(en?.title).toBe('New message from Acme Care');
    expect(en?.body).toBe('Open BridgeHive to read it.');
    expect(en?.body.toLowerCase()).not.toContain('patient');
    expect(en?.data).toEqual({
      type: ORG_WORKER_MESSAGE_PUSH_TYPE,
      conversationId,
      url: messageNotificationUrl(conversationId),
    });

    const el = buildOrgWorkerMessageNotification({
      conversationId,
      organizationName: 'Acme Care',
      locale: 'el',
    });
    expect(el?.title).toBe('Νέο μήνυμα από Acme Care');
    expect(el?.body).toContain('BridgeHive');
  });

  it('parses message deep links and keeps shift parser shift-only', () => {
    const url = messageNotificationUrl(conversationId)!;
    const data = {
      type: ORG_WORKER_MESSAGE_PUSH_TYPE,
      conversationId,
      url,
    };
    expect(messageRouteFromPushData(data)).toBe(`/messages/${conversationId}`);
    expect(appRouteFromPushData(data)).toBe(`/messages/${conversationId}`);
    expect(shiftRouteFromPushData(data)).toBeNull();
    expect(
      messageRouteFromPushData({
        type: ORG_WORKER_MESSAGE_PUSH_TYPE,
        conversationId,
        url: 'https://evil.example/messages',
      }),
    ).toBeNull();
  });
});
