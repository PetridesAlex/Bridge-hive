import { readFileSync } from 'node:fs';
import path from 'node:path';

import {
  appRouteFromPushData,
  buildOrgWorkerMessageNotification,
  isMessagingEligible,
  ORG_WORKER_MESSAGE_PUSH_TYPE,
} from '@bridge-hive/domain';

import { ORG_MESSAGES_CHANNEL } from '../push/channel';

const root = path.join(__dirname, '../..');

function source(relativePath: string): string {
  return readFileSync(path.join(root, relativePath), 'utf8');
}

describe('worker messaging gating', () => {
  it('hides Messages entry for demo accounts in More and drawer', () => {
    const profile = source('app/(tabs)/profile/index.tsx');
    const drawer = source('components/navigation/AppMenuDrawer.tsx');
    expect(profile).toContain("router.push('/messages')");
    expect(profile).toContain('!isAppReviewDemo');
    expect(drawer).toContain('showMessages: !isAppReviewDemo');
    expect(drawer).toContain("href: '/messages'");
  });

  it('keeps Message organization CTA on approved assignments only', () => {
    const shiftDetail = source('app/(tabs)/shifts/[id].tsx');
    const card = source('components/work/AssignmentCard.tsx');
    expect(shiftDetail).toContain("assignment?.status === 'approved'");
    expect(shiftDetail).toContain('getOrCreateConversation');
    expect(shiftDetail).toContain("t('messages.messageOrganization')");
    expect(card).toContain("assignment.status === 'approved'");
    expect(card).toContain('getOrCreateConversation');
  });

  it('uses a separate Android channel from new-shifts', () => {
    expect(ORG_MESSAGES_CHANNEL.id).toBe('org-messages');
    expect(ORG_MESSAGES_CHANNEL.id).not.toBe('new-shifts');
    const client = source('lib/push/client.ts');
    expect(client).toContain('ORG_MESSAGES_CHANNEL');
  });

  it('routes org_worker_message pushes to /messages/:id', () => {
    const conversationId = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
    const built = buildOrgWorkerMessageNotification({
      conversationId,
      organizationName: 'Clinic',
      locale: 'en',
    });
    expect(built?.data.type).toBe(ORG_WORKER_MESSAGE_PUSH_TYPE);
    expect(appRouteFromPushData(built!.data)).toBe(`/messages/${conversationId}`);
    const controller = source('components/push/PushNotificationController.tsx');
    expect(controller).toContain('appRouteFromPushData');
  });

  it('denies demo eligibility in domain helper', () => {
    expect(
      isMessagingEligible({
        organizationActive: true,
        workerAccountActive: true,
        workerVerified: true,
        workerRole: 'ward_assistant',
        isAppReviewDemo: true,
        hasApprovedCompletedWork: true,
      }),
    ).toBe(false);
  });

  it('subscribes to private reaction Broadcast instead of reactions postgres_changes', () => {
    const thread = source('app/messages/[id].tsx');
    expect(thread).toContain('subscribeReactionBroadcast');
    expect(thread).not.toContain("table: 'organization_worker_message_reactions'");
    expect(thread).toContain('subscribeMessagingRealtime');
    expect(thread).toContain("table: 'organization_worker_messages'");
  });
});

describe('messages i18n', () => {
  it('includes en/el messages keys', () => {
    const en = source('i18n/translations/en.ts');
    const el = source('i18n/translations/el.ts');
    for (const src of [en, el]) {
      expect(src).toContain('messageOrganization:');
      expect(src).toContain('privacy:');
      expect(src).toContain('demoBlocked:');
    }
  });
});
