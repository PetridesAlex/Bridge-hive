import { readFileSync } from 'node:fs';
import path from 'node:path';

import {
  buildOrgWorkerMessageNotification,
  buildShiftPublishedNotification,
  openPositionsLabel,
  ORG_WORKER_MESSAGE_PUSH_TYPE,
} from '@bridge-hive/domain';

import {
  buildExpoPushMessage,
  ORG_MESSAGES_CHANNEL_ID,
  outcomeFromExpoTicket,
  outcomesForTransportFailure,
  postExpoPush,
  receiptFromExpo,
  type ClaimedPushDelivery,
} from '../expo-api';
import { isWorkerPushDispatchEnabled } from '../env';

const shiftId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

const claimed: ClaimedPushDelivery = {
  deliveryId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  expoPushToken: 'ExponentPushToken[workerdevice000001]',
  shiftId,
  openPositions: 3,
  status: 'published',
  startsAt: '2026-10-23T16:00:00.000Z',
  endsAt: '2026-10-24T04:30:00.000Z',
  timeZone: 'Europe/Nicosia',
  place: 'ICU',
  requiredRole: 'physiotherapist',
  rateMinor: 2500,
  currency: 'EUR',
};

describe('shift push payload', () => {
  it('uses position or positions from remaining capacity', () => {
    expect(openPositionsLabel(1)).toBe('1 position open');
    expect(openPositionsLabel(3)).toBe('3 positions open');
    const base = {
      shiftId: claimed.shiftId!,
      requiredRole: claimed.requiredRole!,
      startsAt: claimed.startsAt!,
      endsAt: claimed.endsAt!,
      timeZone: claimed.timeZone!,
      place: claimed.place!,
      rateMinor: claimed.rateMinor!,
      currency: claimed.currency,
      status: claimed.status,
    };
    const one = buildShiftPublishedNotification({ ...base, openPositions: 1 });
    const three = buildShiftPublishedNotification({ ...base, openPositions: 3 });
    expect(one?.body).toContain('1 position open');
    expect(one?.body).not.toContain('1 positions');
    expect(three?.body).toContain('3 positions open');
  });

  it('sends only the shift route and no private fields', () => {
    const message = buildExpoPushMessage({
      ...claimed,
      place: 'ICU',
    });
    expect(message).toMatchObject({
      sound: 'default',
      priority: 'high',
      channelId: 'new-shifts',
      title: 'New Physiotherapist shift',
      body: '23 Oct · 19:00–07:30 · ICU · 3 positions open · €25/hour',
      data: {
        type: 'shift_published',
        shiftId,
        url: `bridgehive://shifts/${shiftId}`,
      },
    });
    expect(Object.keys(message?.data ?? {}).sort()).toEqual(['shiftId', 'type', 'url']);
    const serialized = JSON.stringify(message);
    expect(serialized).not.toContain('SECRET-WARD-NOTE');
    expect(serialized).not.toContain('patient');
    expect(serialized).not.toContain('@');
    expect(serialized).not.toContain('service_role');
  });

  it('does not describe a full shift as available', () => {
    expect(buildExpoPushMessage({ ...claimed, openPositions: 0 })).toBeNull();
    expect(buildExpoPushMessage({ ...claimed, status: 'filled', openPositions: 3 })).toBeNull();
  });

  it('marks unregistered devices invalid and retries transport failures without the token', () => {
    expect(
      outcomeFromExpoTicket(claimed.deliveryId, {
        status: 'error',
        details: { error: 'DeviceNotRegistered' },
      }),
    ).toEqual({
      deliveryId: claimed.deliveryId,
      outcome: 'invalid',
      error: 'DeviceNotRegistered',
    });
    const retries = outcomesForTransportFailure([claimed.deliveryId]);
    expect(retries[0]?.error).toBe('expo_unreachable');
    expect(JSON.stringify(retries)).not.toContain('ExponentPushToken');
  });

  it('posts to the Expo push API from the server helper only', async () => {
    const bodies: string[] = [];
    await postExpoPush([buildExpoPushMessage(claimed)!], {
      accessToken: 'server-token',
      fetchImpl: async (url, init) => {
        expect(url).toBe('https://exp.host/--/api/v2/push/send');
        expect(init?.headers).toMatchObject({ Authorization: 'Bearer server-token' });
        bodies.push(String(init?.body));
        return new Response(JSON.stringify({ data: [{ status: 'ok', id: 'ticket-1' }] }), {
          status: 200,
        });
      },
    });
    expect(bodies[0]).toContain('bridgehive://shifts/');
    expect(bodies[0]).not.toContain('SECRET');
  });
});

describe('org_worker_message push payload', () => {
  const conversationId = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';

  it('uses org-messages channel and never includes chat body text', () => {
    const message = buildExpoPushMessage({
      deliveryId: claimed.deliveryId,
      expoPushToken: claimed.expoPushToken,
      eventType: 'org_worker_message',
      conversationId,
      organizationName: 'Acme Care',
      preferredLocale: 'en',
      openPositions: 0,
      payload: { conversationId },
      shiftId: null,
      status: 'n/a',
      startsAt: null,
      endsAt: null,
      timeZone: null,
      place: null,
      requiredRole: null,
      rateMinor: null,
      currency: null,
    });
    expect(message?.channelId).toBe(ORG_MESSAGES_CHANNEL_ID);
    expect(message?.title).toBe('New message from Acme Care');
    expect(message?.body).toBe('Open BridgeHive to read it.');
    expect(message?.data).toEqual({
      type: ORG_WORKER_MESSAGE_PUSH_TYPE,
      conversationId,
      url: `bridgehive://messages/${conversationId}`,
    });
    expect(JSON.stringify(message)).not.toContain('patient');
    expect(JSON.stringify(message)).not.toContain('bank');
  });

  it('keeps shift channel for shift_published events', () => {
    const message = buildExpoPushMessage(claimed);
    expect(message?.channelId).toBe('new-shifts');
    expect(buildOrgWorkerMessageNotification({ conversationId })?.data.type).toBe(
      ORG_WORKER_MESSAGE_PUSH_TYPE,
    );
  });
});

describe('preview isolation', () => {
  const original = process.env.VERCEL_ENV;
  afterEach(() => {
    if (original === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = original;
    delete process.env.WORKER_PUSH_DISABLE;
  });

  it('disables Expo dispatch on Vercel Preview', () => {
    process.env.VERCEL_ENV = 'preview';
    expect(isWorkerPushDispatchEnabled()).toBe(false);
  });

  it('allows dispatch outside preview unless explicitly disabled', () => {
    process.env.VERCEL_ENV = 'production';
    expect(isWorkerPushDispatchEnabled()).toBe(true);
    process.env.WORKER_PUSH_DISABLE = '1';
    expect(isWorkerPushDispatchEnabled()).toBe(false);
  });
});

describe('receipt lag policy', () => {
  it('treats a missing Expo receipt as pending instead of a hard failure', () => {
    expect(receiptFromExpo(claimed.deliveryId, undefined)).toEqual({
      deliveryId: claimed.deliveryId,
      receiptStatus: 'pending',
      receiptError: 'receipt_not_ready',
    });
    expect(receiptFromExpo(claimed.deliveryId, {})).toEqual({
      deliveryId: claimed.deliveryId,
      receiptStatus: 'pending',
      receiptError: 'expo_receipt_missing',
    });
  });
});

describe('publish isolation', () => {
  it('keeps shift publish successful when push dispatch fails', () => {
    const shifts = readFileSync(
      path.join(__dirname, '../../../app/actions/shifts.ts'),
      'utf8',
    );
    const bulk = readFileSync(
      path.join(__dirname, '../../../app/actions/bulk-shifts.ts'),
      'utf8',
    );
    const notify = readFileSync(path.join(__dirname, '../notify.ts'), 'utf8');
    expect(shifts).toContain('await notifyPublishedShiftsSafely()');
    expect(bulk).toContain('await notifyPublishedShiftsSafely()');
    expect(notify).toContain('catch');
    expect(notify).not.toContain('throw');
    const mobileClient = readFileSync(
      path.join(__dirname, '../../../../worker-mobile/lib/push/client.ts'),
      'utf8',
    );
    expect(mobileClient).not.toContain('exp.host');
    expect(mobileClient).not.toContain('SUPABASE_SERVICE_ROLE');
  });
});
