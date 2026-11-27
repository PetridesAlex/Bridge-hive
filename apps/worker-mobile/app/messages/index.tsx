import {
  isMessagingRealtimeCatchUpStatus,
  isMessagingUuid,
  messagingChannelName,
  subscribeMessagingRealtime,
  type OrgWorkerConversationSummary,
} from '@bridge-hive/domain';
import { Redirect, router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';

import { InboxView } from '@/components/messages/InboxView';
import { AppScreen } from '@/components/ui/AppScreen';
import { useTranslation } from '@/i18n/locale-provider';
import {
  areMessagingDeletesUnavailable,
  clearConversationForMe,
  listMyMessagingConversations,
} from '@/lib/messaging';
import { navigateBack } from '@/lib/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';

/** Coalesce realtime conversation-row bursts; matches org / thread (~180ms). */
const REALTIME_LOAD_DEBOUNCE_MS = 180;

export default function MessagesInboxScreen() {
  const { t, language } = useTranslation();
  const { isAppReviewDemo, session, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<OrgWorkerConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const loadedOnceRef = useRef(false);
  const requestRef = useRef(0);
  const [realtimeEpoch, setRealtimeEpoch] = useState(0);
  const realtimeResubscribedRef = useRef(false);
  const priorInboxUserRef = useRef<string | null>(null);

  const load = useCallback(async () => {
    if (isAppReviewDemo || !session) {
      setRows([]);
      setLoading(false);
      return;
    }
    const requestId = ++requestRef.current;
    const result = await listMyMessagingConversations();
    if (requestId !== requestRef.current) return;
    if (result.error) setError(result.error);
    else {
      setError(null);
      setRows(result.data);
    }
    loadedOnceRef.current = true;
    setLoading(false);
    setRefreshing(false);
  }, [isAppReviewDemo, session]);

  useFocusEffect(
    useCallback(() => {
      if (!loadedOnceRef.current) setLoading(true);
      void load();
      const sub = AppState.addEventListener('change', (state) => {
        if (state === 'active') void load();
      });
      return () => sub.remove();
    }, [load]),
  );

  // Expo web: AppState is unreliable while the tab stays focused/hidden.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    if (isAppReviewDemo || !session) return;
    const quietCatchUp = () => {
      if (document.visibilityState !== 'visible') return;
      void load();
    };
    const onFocus = () => void load();
    document.addEventListener('visibilitychange', quietCatchUp);
    window.addEventListener('focus', onFocus);
    return () => {
      document.removeEventListener('visibilitychange', quietCatchUp);
      window.removeEventListener('focus', onFocus);
    };
  }, [isAppReviewDemo, load, session]);

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId || !isMessagingUuid(userId) || isAppReviewDemo) return;
    if (priorInboxUserRef.current !== userId) {
      priorInboxUserRef.current = userId;
      // userId dependency already remounts this effect; only reset the one-shot flag.
      realtimeResubscribedRef.current = false;
    }
    let cancelled = false;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const scheduleDebouncedLoad = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (!cancelled) void load();
      }, REALTIME_LOAD_DEBOUNCE_MS);
    };
    const subscription = subscribeMessagingRealtime({
      client: supabase,
      channelName: messagingChannelName('worker-inbox', { userId }),
      table: 'organization_worker_conversations',
      filter: `worker_id=eq.${userId}`,
      onChange: scheduleDebouncedLoad,
      onSubscribed: () => {
        if (!cancelled) void load();
      },
      onStatus: (status) => {
        if (cancelled) return;
        if (__DEV__) {
          console.debug('[worker-inbox-realtime]', { status, userId });
        }
        if (!isMessagingRealtimeCatchUpStatus(status)) return;
        void load();
        if (!realtimeResubscribedRef.current) {
          realtimeResubscribedRef.current = true;
          setRealtimeEpoch((n) => n + 1);
        }
      },
    });
    return () => {
      cancelled = true;
      if (debounceTimer) clearTimeout(debounceTimer);
      subscription.unsubscribe();
    };
  }, [isAppReviewDemo, load, realtimeEpoch, session?.user?.id]);

  if (!authLoading && !session) {
    return <Redirect href="/auth/worker/login" />;
  }

  return (
    <AppScreen scroll={false} padded={false} edges={['top', 'left', 'right']}>
      <InboxView
        rows={isAppReviewDemo ? [] : rows}
        locale={language}
        loading={isAppReviewDemo ? false : loading}
        refreshing={refreshing}
        error={isAppReviewDemo ? null : error}
        onBack={() => navigateBack('/(tabs)')}
        onRefresh={() => {
          setRefreshing(true);
          void load();
        }}
        onRetry={() => {
          setLoading(rows.length === 0);
          void load();
        }}
        onOpen={(id) => router.push(`/messages/${id}`)}
        copy={{
          title: t('messages.title'),
          subtitle: t('messages.subtitle'),
          searchPlaceholder: t('messages.searchPlaceholder'),
          organization: t('messages.organization'),
          emptyInbox: isAppReviewDemo ? t('messages.demoBlocked') : t('messages.emptyInbox'),
          emptyInboxBody: isAppReviewDemo
            ? t('messages.demoBlockedBody')
            : t('messages.emptyInboxBody'),
          loadError: t('messages.loadError'),
          loading: t('messages.loading'),
          reconnect: t('messages.reconnect'),
          retry: t('common.retry'),
          back: t('common.back'),
          noMessagesYet: t('messages.noMessagesYet'),
          newMessages: t('messages.newMessages'),
          deleteChat: t('messages.deleteChat'),
          deleteChatTitle: t('messages.deleteChatTitle'),
          deleteChatBody: t('messages.deleteChatBody'),
          cancel: t('common.cancel'),
          confirmDelete: t('messages.confirmDelete'),
          deleting: t('messages.deleting'),
          deleteFailed: t('messages.deleteFailed'),
          deleteUnavailable: t('messages.deleteUnavailable'),
        }}
        onDeleteChat={
          isAppReviewDemo || areMessagingDeletesUnavailable()
            ? undefined
            : async (id) => {
                const result = await clearConversationForMe(id);
                if (result.unavailable) return 'unavailable';
                if (result.error) return result.error;
                setRows((prev) => prev.filter((row) => row.id !== id));
                void load();
                return null;
              }
        }
      />
    </AppScreen>
  );
}
