import { shiftRouteFromPushData } from '@bridge-hive/domain';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';

import { syncGrantedPushDevice } from '@/lib/push/client';
import {
  claimNotificationResponse,
  clearPendingShiftRoute,
  hydratePendingShiftRoute,
  peekPendingShiftRoute,
  setPendingShiftRoute,
} from '@/lib/push/pending-shift';
import { useAuth } from '@/providers/AuthProvider';

function openShiftRoute(
  response: Notifications.NotificationResponse | null,
  sessionPresent: boolean,
  verified: boolean,
) {
  if (!response) return;
  if (response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
  const responseId = response.notification.request.identifier;
  if (!claimNotificationResponse(responseId)) return;
  const route = shiftRouteFromPushData(response.notification.request.content.data);
  Notifications.clearLastNotificationResponse();
  if (!route) return;
  if (!sessionPresent) {
    setPendingShiftRoute(route);
    router.push('/auth/worker/login');
    return;
  }
  if (!verified) {
    setPendingShiftRoute(route);
    return;
  }
  clearPendingShiftRoute();
  router.push(route as never);
}

/** Foreground banners, background taps, and cold-start taps. Never requests permission. */
export function PushNotificationController() {
  const { session, isVerified, loading } = useAuth();
  const sessionRef = useRef(session);
  const verifiedRef = useRef(isVerified);
  sessionRef.current = session;
  verifiedRef.current = isVerified;

  useEffect(() => {
    if (Platform.OS === 'web' || loading) return;
    let cancelled = false;

    const open = (response: Notifications.NotificationResponse | null) => {
      if (cancelled) return;
      openShiftRoute(response, Boolean(sessionRef.current), verifiedRef.current);
    };

    void (async () => {
      await hydratePendingShiftRoute();
      if (cancelled) return;
      open(Notifications.getLastNotificationResponse());
    })();

    const responseSub = Notifications.addNotificationResponseReceivedListener(open);
    const receivedSub = Notifications.addNotificationReceivedListener(() => {
      // Banner, list, and default sound are decided by setNotificationHandler.
    });

    return () => {
      cancelled = true;
      responseSub.remove();
      receivedSub.remove();
    };
  }, [loading]);

  useEffect(() => {
    if (!session || !isVerified) return;
    const pending = peekPendingShiftRoute();
    if (!pending) return;
    clearPendingShiftRoute();
    router.push(pending as never);
  }, [session, isVerified]);

  useEffect(() => {
    if (!session || Platform.OS === 'web') return;
    void syncGrantedPushDevice();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void syncGrantedPushDevice();
    });
    return () => subscription.remove();
  }, [session]);

  return null;
}
