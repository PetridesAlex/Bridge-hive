import {
  notificationEnableAction,
  sanitizePushLogFields,
  type OsNotificationPermission,
} from '@bridge-hive/domain';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { NEW_SHIFTS_CHANNEL } from '@/lib/push/channel';
import { supabase } from '@/lib/supabase';

let currentToken: string | null = null;

function logPush(event: string, fields: Record<string, unknown> = {}) {
  if (!__DEV__) return;
  console.info(JSON.stringify({ scope: 'worker_push', event, ...sanitizePushLogFields(fields) }));
}

function normalizePermission(
  settings: Notifications.NotificationPermissionsStatus,
): OsNotificationPermission {
  if (settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus.AUTHORIZED) {
    return 'granted';
  }
  if (
    settings.status === 'denied' ||
    settings.ios?.status === Notifications.IosAuthorizationStatus.DENIED
  ) {
    return 'denied';
  }
  return 'undetermined';
}

async function ensureNewShiftsChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(NEW_SHIFTS_CHANNEL.id, {
    name: NEW_SHIFTS_CHANNEL.name,
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    enableVibrate: NEW_SHIFTS_CHANNEL.vibration,
    lightColor: NEW_SHIFTS_CHANNEL.lightColor,
    sound: null,
  });
}

async function registerCurrentToken(): Promise<void> {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return;
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) {
    logPush('token_unavailable');
    return;
  }
  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  if (!token) return;
  currentToken = token;
  const { error } = await supabase.rpc(
    'register_worker_push_device' as never,
    {
      p_expo_push_token: token,
      p_platform: Platform.OS,
      p_app_version: Constants.expoConfig?.version ?? null,
    } as never,
  );
  if (error) logPush('token_register_failed');
}

/** Reads OS permission. Does not present the system prompt. */
export async function probeNotificationPermission(): Promise<OsNotificationPermission> {
  if (Platform.OS === 'web') return 'denied';
  const settings = await Notifications.getPermissionsAsync();
  return normalizePermission(settings);
}

/** Presents the OS prompt only after the worker taps Enable notifications. */
export async function enableShiftNotifications(): Promise<OsNotificationPermission> {
  if (Platform.OS === 'web') return 'denied';
  await ensureNewShiftsChannel();
  const settings = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: false,
      allowSound: true,
    },
  });
  const status = normalizePermission(settings);
  if (status !== 'granted') return status;
  try {
    await registerCurrentToken();
  } catch {
    logPush('token_register_failed');
  }
  return 'granted';
}

/** Refresh an already-granted token when the app becomes active. */
export async function syncGrantedPushDevice(): Promise<void> {
  if (Platform.OS === 'web') return;
  const status = await probeNotificationPermission();
  if (notificationEnableAction(status) !== 'none') return;
  try {
    await ensureNewShiftsChannel();
    await registerCurrentToken();
    if (!currentToken) return;
    await supabase.rpc(
      'touch_worker_push_device' as never,
      { p_expo_push_token: currentToken } as never,
    );
  } catch {
    logPush('token_touch_failed');
  }
}

export async function deactivateCurrentPushDevice(): Promise<void> {
  if (!currentToken) return;
  const token = currentToken;
  currentToken = null;
  await supabase.rpc(
    'deactivate_worker_push_device' as never,
    { p_expo_push_token: token } as never,
  );
}

export async function setShiftPushPreference(enabled: boolean): Promise<void> {
  await supabase.rpc(
    'set_worker_push_preference' as never,
    { p_enabled: enabled } as never,
  );
}

export async function readShiftPushPreference(): Promise<boolean | null> {
  const { data, error } = await supabase.rpc('get_worker_push_preference' as never);
  if (error || data == null) return null;
  return Boolean(data);
}

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}
