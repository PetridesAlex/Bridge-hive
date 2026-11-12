import {
  isMessagingUuid,
  messagingChannelName,
  subscribeMessagingRealtime,
  type OrgWorkerConversationSummary,
} from '@bridge-hive/domain';
import { Redirect, router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { InboxView } from '@/components/messages/InboxView';
import { AppScreen } from '@/components/ui/AppScreen';
import { useTranslation } from '@/i18n/locale-provider';
import { listMyMessagingConversations } from '@/lib/messaging';
import { navigateBack } from '@/lib/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';

export default function MessagesInboxScreen() {
  const { t, language } = useTranslation();
  const { isAppReviewDemo, session, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<OrgWorkerConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const loadedOnceRef = useRef(false);
  const requestRef = useRef(0);

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

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId || !isMessagingUuid(userId) || isAppReviewDemo) return;
    const subscription = subscribeMessagingRealtime({
      client: supabase,
      channelName: messagingChannelName('worker-inbox', { userId }),
      table: 'organization_worker_conversations',
      filter: `worker_id=eq.${userId}`,
      onChange: () => void load(),
      onSubscribed: () => void load(),
    });
    return () => subscription.unsubscribe();
  }, [isAppReviewDemo, load, session?.user?.id]);

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
        }}
      />
    </AppScreen>
  );
}
