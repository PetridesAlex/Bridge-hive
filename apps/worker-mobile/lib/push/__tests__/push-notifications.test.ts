import { readFileSync } from 'node:fs';
import path from 'node:path';

import {
  SHIFT_UNAVAILABLE_TITLE,
  buildShiftPublishedNotification,
  notificationEnableAction,
  shiftRouteFromPushData,
  shouldRequestNotificationPermissionOnMount,
  shouldShowNotificationExplainer,
} from '@bridge-hive/domain';

import { NEW_SHIFTS_CHANNEL } from '../channel';

const root = path.join(__dirname, '../../..');

function source(relativePath: string): string {
  return readFileSync(path.join(root, relativePath), 'utf8');
}

describe('shift notification permission policy', () => {
  it('does not request OS permission on mount', () => {
    expect(shouldRequestNotificationPermissionOnMount()).toBe(false);
  });

  it('shows the explainer only once permission is still undecided', () => {
    expect(
      shouldShowNotificationExplainer({
        verified: true,
        permission: 'undetermined',
        dismissed: false,
      }),
    ).toBe(true);
    expect(
      shouldShowNotificationExplainer({
        verified: true,
        permission: 'undetermined',
        dismissed: true,
      }),
    ).toBe(false);
    expect(
      shouldShowNotificationExplainer({
        verified: true,
        permission: 'denied',
        dismissed: false,
      }),
    ).toBe(false);
    expect(
      shouldShowNotificationExplainer({
        verified: false,
        permission: 'undetermined',
        dismissed: false,
      }),
    ).toBe(false);
  });

  it('does not throw when device settings cannot be opened', () => {
    const preferences = source('app/profile/notification-preferences.tsx');
    const client = source('lib/push/client.ts');
    const opener = client.slice(client.indexOf('export async function openDeviceNotificationSettings'));
    expect(preferences).not.toContain('Linking.openSettings');
    expect(preferences).toContain('openDeviceNotificationSettings');
    expect(opener.indexOf("Platform.OS === 'web'")).toBeGreaterThan(-1);
    expect(opener.indexOf("Platform.OS === 'web'")).toBeLessThan(opener.indexOf('openSettings'));
  });

  it('does not request again after an OS decline', () => {
    expect(notificationEnableAction('denied')).toBe('settings');
    expect(notificationEnableAction('undetermined')).toBe('request');
    expect(notificationEnableAction('granted')).toBe('none');
  });

  it('keeps the permission dialog out of the dashboard effect', () => {
    const prompt = source('components/push/ShiftNotificationPrompt.tsx');
    const effectStart = prompt.indexOf('useEffect(() =>');
    const effect = prompt.slice(effectStart, prompt.indexOf('if (!ready'));
    expect(effect).toContain('probeNotificationPermission');
    expect(effect).not.toContain('requestPermissionsAsync');
    expect(effect).not.toContain('enableShiftNotifications');
    expect(prompt).not.toContain('requestPermissionsAsync');
  });
});

describe('new-shifts Android channel', () => {
  it('uses the platform default sound with high importance', () => {
    expect(NEW_SHIFTS_CHANNEL).toMatchObject({
      id: 'new-shifts',
      name: 'New shifts',
      importance: 'high',
      sound: 'default',
      vibration: true,
      lightColor: '#E0AA18',
      color: '#0B2A43',
    });
    const client = source('lib/push/client.ts');
    expect(client).toContain('AndroidImportance.HIGH');
    expect(client).toContain('sound: null');
    expect(client).not.toContain('exp.host');
  });
});

describe('notification navigation', () => {
  const shiftId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

  it('opens only an internal shift route from a tap payload', () => {
    expect(
      shiftRouteFromPushData({
        type: 'shift_published',
        shiftId,
        url: `bridgehive://shifts/${shiftId}`,
      }),
    ).toBe(`/shifts/${shiftId}`);
    expect(
      shiftRouteFromPushData({
        type: 'shift_published',
        shiftId,
        url: `bridgehive://shifts/${shiftId}?token=recovery`,
      }),
    ).toBeNull();
    expect(
      shiftRouteFromPushData({
        type: 'shift_published',
        shiftId,
        url: 'https://example.com/shifts/' + shiftId,
      }),
    ).toBeNull();
  });

  it('handles cold start and background taps through the same listeners', () => {
    const controller = source('components/push/PushNotificationController.tsx');
    expect(controller).toContain('getLastNotificationResponse');
    expect(controller).toContain('addNotificationResponseReceivedListener');
    expect(controller).toContain('addNotificationReceivedListener');
    expect(controller).not.toContain('requestPermissionsAsync');
    expect(controller).not.toContain('console.log');
    expect(controller).not.toContain('console.debug');
  });

  it('uses the friendly unavailable title when the shift cannot be opened', () => {
    expect(SHIFT_UNAVAILABLE_TITLE).toBe('This shift is no longer available.');
    const screen = source('app/shifts/[id].tsx');
    expect(screen).toContain('SHIFT_UNAVAILABLE_TITLE');
  });
});

describe('push client logging', () => {
  it('does not log raw notification payloads', () => {
    const client = source('lib/push/client.ts');
    const enable = client.slice(
      client.indexOf('export async function enableShiftNotifications'),
      client.indexOf('export async function syncGrantedPushDevice'),
    );
    expect(enable).toContain('requestPermissionsAsync');
    expect(client).not.toContain('console.log');
    expect(client).toContain('sanitizePushLogFields');
    const probe = client.slice(
      client.indexOf('export async function probeNotificationPermission'),
      client.indexOf('export async function enableShiftNotifications'),
    );
    expect(probe).toContain('getPermissionsAsync');
    expect(probe).not.toContain('requestPermissionsAsync');
  });
});

describe('message copy stays free of private fields', () => {
  it('builds the lock-screen example without notes or contact data', () => {
    const message = buildShiftPublishedNotification({
      shiftId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      requiredRole: 'physiotherapist',
      startsAt: '2026-10-23T16:00:00.000Z',
      endsAt: '2026-10-24T04:30:00.000Z',
      timeZone: 'Europe/Nicosia',
      place: 'ICU',
      openPositions: 3,
      rateMinor: 2500,
      currency: 'EUR',
      status: 'published',
    });
    expect(message?.title).toBe('New Physiotherapist shift');
    expect(message?.body).toBe(
      '23 Oct · 19:00–07:30 · ICU · 3 positions open · €25/hour',
    );
    expect(JSON.stringify(message)).not.toContain('SECRET');
    expect(JSON.stringify(message)).not.toContain('@');
  });
});
