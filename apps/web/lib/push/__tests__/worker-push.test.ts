import { readFileSync } from 'node:fs';
import path from 'node:path';

import { buildShiftPublishedNotification, openPositionsLabel } from '@bridge-hive/domain';

import {
  buildExpoPushMessage,
  outcomeFromExpoTicket,
  outcomesForTransportFailure,
  postExpoPush,
  type ClaimedPushDelivery,
} from '../expo-api';

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
    const one = buildShiftPublishedNotification({ ...claimed, openPositions: 1 });
    const three = buildShiftPublishedNotification({ ...claimed, openPositions: 3 });
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
