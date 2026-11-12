import { appRouteFromPushData } from '@bridge-hive/domain';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';

import { reconcileCalendarAssignments } from '@/lib/calendar/sync';
import { getMyAssignments } from '@/lib/queries';
import { syncGrantedPushDevice } from '@/lib/push/client';
import {
  claimNotificationResponse,
  clearPendingShiftRoute,
  hydratePendingShiftRoute,
  peekPendingShiftRoute,
  setPendingShiftRoute,
} from '@/lib/push/pending-shift';
import { useAppLocale } from '@/i18n/locale-provider';
import { useAuth } from '@/providers/AuthProvider';

function openPushRoute(
  response: Notifications.NotificationResponse | null,
  sessionPresent: boolean,
  verified: boolean,
) {
  if (!response) return;
  if (response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
  const responseId = response.notification.request.identifier;
  if (!claimNotificationResponse(responseId)) return;
  // Messages + shifts share one cold-start / tap path; never drop message deep links.
  const route = appRouteFromPushData(response.notification.request.content.data);
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
  const { session, user, isVerified, loading } = useAuth();
  const { language } = useAppLocale();
  const sessionRef = useRef(session);
  const verifiedRef = useRef(isVerified);
  sessionRef.current = session;
  verifiedRef.current = isVerified;

  useEffect(() => {
    if (Platform.OS === 'web' || loading) return;
    let cancelled = false;

    const open = (response: Notifications.NotificationResponse | null) => {
      if (cancelled) return;
      openPushRoute(response, Boolean(sessionRef.current), verifiedRef.current);
    };

    void (async () => {
      await hydratePendingShiftRoute();
      if (cancelled) return;
      open(Notifications.getLastNotificationResponse());
    })();

    const responseSub = Notifications.addNotificationResponseReceivedListener(open);
    const receivedSub = Notifications.addNotificationReceivedListener(() => {
      // Presentation is decided by setNotificationHandler (no duplicate local push).
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
      if (state === 'active') {
        void syncGrantedPushDevice();
        if (user?.id && isVerified) {
          void (async () => {
            try {
              const assignments = await getMyAssignments(user.id);
              await reconcileCalendarAssignments({
                workerId: user.id,
                locale: language,
                assignments: (assignments.data ?? []).map((row) => ({
                  assignmentId: row.id,
                  status: row.status,
                  startsAt: row.shifts?.starts_at ?? '',
                  endsAt: row.shifts?.ends_at ?? '',
                  organizationName: 'Organization',
                  roleLabel: row.shifts?.required_role ?? null,
                })),
              });
            } catch {
              // Calendar reconcile must never affect push or session.
            }
          })();
        }
      }
    });
    return () => subscription.remove();
  }, [session, user?.id, isVerified, language]);

  return null;
}
