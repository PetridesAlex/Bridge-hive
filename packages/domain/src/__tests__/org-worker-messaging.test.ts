import {
  advanceReadCursor,
  applyOptimisticReaction,
  canOrgStaffMessage,
  canReactToMessage,
  clampMessageDraft,
  filterConversationsByQuery,
  insertTextAtSelection,
  isMessageAfter,
  isMessagingEligible,
  isMessagingReactionsUnavailableError,
  isOrgWorkerReactionKey,
  mergeMessagePage,
  mergeReactionSummaries,
  messagePreview,
  messagingChannelName,
  normalizeMessageBody,
  ORG_WORKER_MESSAGE_MAX_LENGTH,
  ORG_WORKER_REACTIONS_BROADCAST_EVENT,
  orgWorkerReactionsBroadcastTopic,
  sortMessagesAscending,
  subscribeMessagingRealtime,
  subscribeReactionBroadcast,
  unicodeCharLength,
  unicodeSlice,
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

describe('subscribeMessagingRealtime', () => {
  it('uses a unique channel topic per subscribe so callbacks are never added after subscribe', () => {
    const topics: string[] = [];
    const client = {
      channel(name: string) {
        topics.push(name);
        const channel = {
          on() {
            return channel;
          },
          subscribe(cb?: (status: string) => void) {
            cb?.('SUBSCRIBED');
            return channel;
          },
        };
        return channel;
      },
      removeChannel() {},
    };
    const base = messagingChannelName('worker-inbox', {
      userId: 'b87a079e-8742-4a37-a17f-4205d858266c',
    });
    expect(base).toBe('worker-inbox:b87a079e-8742-4a37-a17f-4205d858266c');
    const first = subscribeMessagingRealtime({
      client,
      channelName: base,
      table: 'organization_worker_conversations',
      filter: 'worker_id=eq.b87a079e-8742-4a37-a17f-4205d858266c',
      onChange() {},
      onSubscribed() {},
    });
    const second = subscribeMessagingRealtime({
      client,
      channelName: base,
      table: 'organization_worker_conversations',
      filter: 'worker_id=eq.b87a079e-8742-4a37-a17f-4205d858266c',
      onChange() {},
      onSubscribed() {},
    });
    expect(topics).toHaveLength(2);
    expect(topics[0]).not.toBe(topics[1]);
    expect(topics[0]?.startsWith(`${base}:`)).toBe(true);
    expect(topics[1]?.startsWith(`${base}:`)).toBe(true);
    first.unsubscribe();
    second.unsubscribe();
  });
});

describe('subscribeReactionBroadcast', () => {
  const conversationId = 'b87a079e-8742-4a37-a17f-4205d858266c';

  it('opens the exact conversation topic as a private Broadcast channel', () => {
    const calls: Array<{
      name: string;
      opts?: { config: { private?: boolean } };
    }> = [];
    const events: Array<{ type: string; filter: object }> = [];
    const client = {
      channel(name: string, opts?: { config: { private?: boolean } }) {
        calls.push({ name, opts });
        const channel = {
          on(type: string, filter: object) {
            events.push({ type, filter });
            return channel;
          },
          subscribe(cb?: (status: string) => void) {
            cb?.('SUBSCRIBED');
            return channel;
          },
        };
        return channel;
      },
      removeChannel() {},
    };

    let changed = 0;
    let subscribed = 0;
    const sub = subscribeReactionBroadcast({
      client,
      conversationId,
      onChange() {
        changed += 1;
      },
      onSubscribed() {
        subscribed += 1;
      },
    });

    expect(orgWorkerReactionsBroadcastTopic(conversationId)).toBe(
      `org-worker-reactions:${conversationId}`,
    );
    expect(calls).toEqual([
      {
        name: `org-worker-reactions:${conversationId}`,
        opts: { config: { private: true } },
      },
    ]);
    expect(events).toEqual([
      {
        type: 'broadcast',
        filter: { event: ORG_WORKER_REACTIONS_BROADCAST_EVENT },
      },
    ]);
    expect(events[0]?.type).not.toBe('postgres_changes');
    expect(subscribed).toBe(1);
    expect(changed).toBe(0);
    sub.unsubscribe();
  });

  it('does not open a channel for invalid conversation ids (unrelated/malformed)', () => {
    const calls: string[] = [];
    const client = {
      channel(name: string) {
        calls.push(name);
        throw new Error(`unexpected channel ${name}`);
      },
      removeChannel() {},
    };
    const sub = subscribeReactionBroadcast({
      client,
      conversationId: 'not-a-uuid',
      onChange() {},
      onSubscribed() {},
    });
    expect(calls).toEqual([]);
    expect(orgWorkerReactionsBroadcastTopic('not-a-uuid')).toBeNull();
    sub.unsubscribe();
  });

  it('documents that unrelated orgs cannot share a participant topic string', () => {
    const a = orgWorkerReactionsBroadcastTopic('11111111-1111-4111-8111-111111111111');
    const b = orgWorkerReactionsBroadcastTopic('22222222-2222-4222-8222-222222222222');
    expect(a).not.toBe(b);
    expect(a).toMatch(/^org-worker-reactions:[0-9a-f-]{36}$/);
    // Authorization is enforced by realtime.messages RLS + org_worker_can_access_conversation
    // on the exact topic; a foreign org JWT fails that check at channel join (source contract).
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

describe('unicode length / normalizeMessageBody', () => {
  it('counts Unicode code points like PostgreSQL char_length', () => {
    expect(unicodeCharLength('hi')).toBe(2);
    expect(unicodeCharLength('👍')).toBe(1);
    expect(unicodeCharLength('🇬🇷')).toBe(2); // regional indicators
    expect(unicodeCharLength('👨‍👩‍👧‍👦')).toBe(7); // ZWJ family
    expect(unicodeCharLength('👍🏽')).toBe(2); // base + skin tone
    expect(unicodeCharLength('Γεια 👍')).toBe(6);
  });

  it('enforces the 2000 code-point cap (not UTF-16 length)', () => {
    expect(normalizeMessageBody('  hello  ')).toEqual({ ok: true, body: 'hello' });
    expect(normalizeMessageBody('   ')).toEqual({ ok: false, error: 'empty' });
    expect(
      normalizeMessageBody('x'.repeat(ORG_WORKER_MESSAGE_MAX_LENGTH + 1)),
    ).toEqual({ ok: false, error: 'too_long' });
    const emojiBody = '👍'.repeat(ORG_WORKER_MESSAGE_MAX_LENGTH);
    expect(normalizeMessageBody(emojiBody)).toEqual({ ok: true, body: emojiBody });
    expect(
      normalizeMessageBody(`${emojiBody}👍`),
    ).toEqual({ ok: false, error: 'too_long' });
    // UTF-16 length of 2000 astral symbols exceeds 2000; code points do not.
    expect(emojiBody.length).toBeGreaterThan(ORG_WORKER_MESSAGE_MAX_LENGTH);
    expect(unicodeCharLength(emojiBody)).toBe(ORG_WORKER_MESSAGE_MAX_LENGTH);
  });

  it('clamps drafts and inserts without splitting code points', () => {
    expect(clampMessageDraft('👍'.repeat(5), 3)).toBe('👍👍👍');
    expect(unicodeSlice('🇬🇷ab', 0, 2)).toBe('🇬🇷');
    const inserted = insertTextAtSelection('ab', '🇬🇷', { start: 1, end: 1 }, 10);
    expect(inserted.value).toBe('a🇬🇷b');
    expect(inserted.selection).toEqual({ start: 3, end: 3 });
  });
});

describe('reactions helpers', () => {
  it('validates keys and soft-degrade errors', () => {
    expect(isOrgWorkerReactionKey('heart')).toBe(true);
    expect(isOrgWorkerReactionKey('fire')).toBe(false);
    expect(
      isMessagingReactionsUnavailableError(
        'Could not find the function public.set_org_worker_message_reaction',
      ),
    ).toBe(true);
    expect(isMessagingReactionsUnavailableError('network down')).toBe(false);
  });

  it('applies optimistic set/replace/clear and merges summaries', () => {
    const messageId = '11111111-1111-4111-8111-111111111111';
    const afterHeart = applyOptimisticReaction(undefined, messageId, 'heart');
    expect(afterHeart.reactions).toEqual([
      { key: 'heart', emoji: '❤️', count: 1, reactedByMe: true },
    ]);
    const afterReplace = applyOptimisticReaction(afterHeart, messageId, 'joy');
    expect(afterReplace.reactions.find((r) => r.key === 'heart')).toBeUndefined();
    expect(afterReplace.reactions.find((r) => r.key === 'joy')?.reactedByMe).toBe(
      true,
    );
    const cleared = applyOptimisticReaction(afterReplace, messageId, null);
    expect(cleared.reactions).toEqual([]);
    expect(
      mergeReactionSummaries(
        [afterHeart],
        [{ messageId, reactions: [{ key: 'tada', emoji: '🎉', count: 2, reactedByMe: false }] }],
      )[0]?.reactions[0]?.key,
    ).toBe('tada');
  });

  it('blocks reactions on temp/pending/failed messages', () => {
    expect(
      canReactToMessage({
        id: '11111111-1111-4111-8111-111111111111',
        localStatus: 'sent',
      }),
    ).toBe(true);
    expect(canReactToMessage({ id: 'temp-abc' })).toBe(false);
    expect(
      canReactToMessage({
        id: '11111111-1111-4111-8111-111111111111',
        localStatus: 'pending',
      }),
    ).toBe(false);
  });
});

describe('normalizeMessageBody / preview / merge', () => {
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

describe('read cursor ordering', () => {
  it('orders by (createdAt, id) and ignores larger UUID alone', () => {
    const earlier = {
      createdAt: '2026-01-02T10:00:00.000Z',
      id: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
    };
    const later = {
      createdAt: '2026-01-02T10:00:01.000Z',
      id: '00000000-0000-4000-8000-000000000001',
    };
    expect(isMessageAfter(later, earlier)).toBe(true);
    expect(isMessageAfter(earlier, later)).toBe(false);

    const sameTimeLowerId = {
      createdAt: '2026-01-02T10:00:00.000Z',
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    };
    const sameTimeHigherId = {
      createdAt: '2026-01-02T10:00:00.000Z',
      id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    };
    expect(isMessageAfter(sameTimeHigherId, sameTimeLowerId)).toBe(true);

    const ignored = advanceReadCursor({
      previousAt: later.createdAt,
      previousMessageId: later.id,
      candidateAt: earlier.createdAt,
      candidateMessageId: earlier.id,
    });
    expect(ignored.advanced).toBe(false);
    expect(ignored.lastReadMessageId).toBe(later.id);
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
