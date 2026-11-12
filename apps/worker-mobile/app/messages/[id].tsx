import {
  applyAcceptedSend,
  applyFailedSend,
  applyOlderMessagePage,
  applyOptimisticReaction,
  beginOutgoingMessage,
  canReactToMessage,
  createSendLock,
  createThreadRequestGuard,
  isMessagingUuid,
  mergeReactionSummaries,
  messagingChannelName,
  newClientMessageId,
  normalizeMessageBody,
  oldestServerCursor,
  subscribeMessagingRealtime,
  subscribeReactionBroadcast,
  type LocalMessagingMessage,
  type OrgWorkerMessageReactionSummary,
  type OrgWorkerMessageRow,
  type OrgWorkerReactionKey,
} from '@bridge-hive/domain';
import { Redirect, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThreadView } from '@/components/messages/ThreadView';
import { colors } from '@/constants/theme';
import { useTranslation } from '@/i18n/locale-provider';
import {
  areMessagingReactionsUnavailable,
  clearMessageReaction,
  listConversationMessages,
  listMessageReactionSummaries,
  listMyMessagingConversations,
  markConversationRead,
  sendConversationMessage,
  setMessageReaction,
} from '@/lib/messaging';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';

function summariesToMap(
  rows: OrgWorkerMessageReactionSummary[],
): Record<string, OrgWorkerMessageReactionSummary> {
  const map: Record<string, OrgWorkerMessageReactionSummary> = {};
  for (const row of rows) map[row.messageId] = row;
  return map;
}

export default function MessageThreadScreen() {
  const { t, language } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const conversationId = typeof id === 'string' ? id : '';
  const { user, isAppReviewDemo, session, loading: authLoading } = useAuth();
  const [title, setTitle] = useState('');
  const [messages, setMessages] = useState<LocalMessagingMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reactionSummaries, setReactionSummaries] = useState<
    Record<string, OrgWorkerMessageReactionSummary>
  >({});
  const [reactionsEnabled, setReactionsEnabled] = useState(true);
  const activeRef = useRef(true);
  const sendLockRef = useRef(createSendLock());
  const guardRef = useRef(createThreadRequestGuard());
  const [hasOlder, setHasOlder] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const loadedOnceRef = useRef(false);
  const reactionGenRef = useRef<Record<string, number>>({});
  const reactionSnapshotRef = useRef<Record<string, OrgWorkerMessageReactionSummary | undefined>>(
    {},
  );
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const refreshReactions = useCallback(
    async (rows: OrgWorkerMessageRow[]) => {
      if (!reactionsEnabled || areMessagingReactionsUnavailable()) {
        if (areMessagingReactionsUnavailable()) setReactionsEnabled(false);
        return;
      }
      const ids = rows
        .filter((row) => canReactToMessage(row))
        .map((row) => row.id);
      if (!ids.length) return;
      const result = await listMessageReactionSummaries(ids);
      if (result.unavailable) {
        setReactionsEnabled(false);
        return;
      }
      if (result.error) return;
      setReactionSummaries((prev) => ({
        ...prev,
        ...summariesToMap(mergeReactionSummaries(Object.values(prev), result.data)),
      }));
    },
    [reactionsEnabled],
  );

  const applyPage = useCallback(
    (incoming: OrgWorkerMessageRow[]) => {
      setHasOlder(applyOlderMessagePage([], incoming, conversationId).hasOlder);
      setMessages(
        (prev) => applyOlderMessagePage(prev, incoming, conversationId).messages as LocalMessagingMessage[],
      );
      void refreshReactions(incoming);
    },
    [conversationId, refreshReactions],
  );

  const load = useCallback(async () => {
    if (!conversationId || isAppReviewDemo || !session) {
      setLoading(false);
      return;
    }
    guardRef.current.setScope({ conversationId, organizationId: null });
    guardRef.current.setActive(activeRef.current);
    const requestId = guardRef.current.start();
    const [thread, inbox] = await Promise.all([
      listConversationMessages(conversationId),
      listMyMessagingConversations(),
    ]);
    if (!guardRef.current.isCurrent(requestId, { conversationId })) return;
    if (thread.error) setError(thread.error);
    else setError(null);
    applyPage(thread.data);
    const conv = inbox.data.find((c) => c.id === conversationId);
    if (conv?.organizationName) setTitle(conv.organizationName);
    const latest = thread.data[thread.data.length - 1];
    if (
      latest &&
      !thread.error &&
      guardRef.current.shouldMarkRead(requestId, { conversationId })
    ) {
      await markConversationRead(conversationId, latest.id);
    }
    loadedOnceRef.current = true;
    setLoading(false);
  }, [applyPage, conversationId, isAppReviewDemo, session]);

  const loadOlder = useCallback(async () => {
    if (!conversationId || loadingOlder) return;
    const cursor = oldestServerCursor(messages);
    if (!cursor) return;
    setLoadingOlder(true);
    const requestAtStart = guardRef.current.snapshot();
    const thread = await listConversationMessages(conversationId, cursor);
    if (!guardRef.current.isCurrent(requestAtStart, { conversationId }) && !thread.data.length) {
      setLoadingOlder(false);
      return;
    }
    if (!thread.error && guardRef.current.isCurrent(requestAtStart, { conversationId })) {
      setHasOlder(applyOlderMessagePage([], thread.data, conversationId).hasOlder);
      setMessages(
        (prev) =>
          applyOlderMessagePage(prev, thread.data, conversationId).messages as LocalMessagingMessage[],
      );
      void refreshReactions(thread.data);
    }
    setLoadingOlder(false);
  }, [conversationId, loadingOlder, messages, refreshReactions]);

  useFocusEffect(
    useCallback(() => {
      activeRef.current = true;
      guardRef.current.setActive(true);
      if (!loadedOnceRef.current) setLoading(true);
      void load();
      const sub = AppState.addEventListener('change', (state) => {
        activeRef.current = state === 'active';
        guardRef.current.setActive(state === 'active');
        if (state === 'active') void load();
      });
      return () => {
        activeRef.current = false;
        guardRef.current.setActive(false);
        sub.remove();
      };
    }, [load]),
  );

  const priorConversationRef = useRef(conversationId);

  useEffect(() => {
    if (priorConversationRef.current === conversationId) return;
    priorConversationRef.current = conversationId;
    loadedOnceRef.current = false;
    setMessages([]);
    setReactionSummaries({});
    setHasOlder(false);
    setError(null);
    setLoading(true);
  }, [conversationId]);

  useEffect(() => {
    if (!isMessagingUuid(conversationId) || isAppReviewDemo || !session) return;
    const messagesSub = subscribeMessagingRealtime({
      client: supabase,
      channelName: messagingChannelName('worker-thread', { conversationId }),
      table: 'organization_worker_messages',
      filter: `conversation_id=eq.${conversationId}`,
      event: 'INSERT',
      onChange: () => void load(),
      onSubscribed: () => void load(),
    });
    const reactionsSub = subscribeReactionBroadcast({
      client: supabase,
      conversationId,
      onChange: () => {
        void refreshReactions(messagesRef.current);
      },
      onSubscribed: () => {
        void refreshReactions(messagesRef.current);
      },
    });
    return () => {
      messagesSub.unsubscribe();
      reactionsSub.unsubscribe();
    };
  }, [conversationId, isAppReviewDemo, load, refreshReactions, session]);

  const send = async (clientMessageId: string, body: string) => {
    if (!sendLockRef.current.acquire()) return;
    setSending(true);
    const result = await sendConversationMessage(conversationId, body, clientMessageId);
    sendLockRef.current.release();
    setSending(false);
    if (result.error || !result.data) {
      setMessages((prev) => applyFailedSend(prev, clientMessageId));
      return;
    }
    setMessages((prev) => applyAcceptedSend(prev, result.data!, conversationId));
  };

  const onSend = async () => {
    if (sendLockRef.current.held) return;
    const normalized = normalizeMessageBody(draft);
    if (!normalized.ok || !user?.id) {
      if (!normalized.ok && normalized.error === 'too_long') setError(t('messages.tooLong'));
      return;
    }
    const outgoing = beginOutgoingMessage({
      conversationId,
      senderUserId: user.id,
      senderKind: 'worker',
      body: normalized.body,
      clientMessageId: newClientMessageId(),
      senderName: t('messages.you'),
    });
    if ('error' in outgoing) {
      setError(t('messages.loadError'));
      return;
    }
    setMessages((prev) => [...prev, outgoing.optimistic]);
    setDraft('');
    setError(null);
    await send(outgoing.clientMessageId, normalized.body);
  };

  const onRetryMessage = async (message: LocalMessagingMessage) => {
    if (sendLockRef.current.held) return;
    setMessages((prev) =>
      prev.map((row) =>
        row.clientMessageId === message.clientMessageId
          ? { ...row, localStatus: 'pending' }
          : row,
      ),
    );
    await send(message.clientMessageId, message.body);
  };

  const onToggleReaction = async (messageId: string, key: OrgWorkerReactionKey) => {
    if (!reactionsEnabled) return;
    const message = messages.find((row) => row.id === messageId);
    if (!message || !canReactToMessage(message)) return;

    const current = reactionSummaries[messageId];
    const mine = current?.reactions.find((chip) => chip.reactedByMe);
    const desired: OrgWorkerReactionKey | null =
      mine?.key === key ? null : key;

    const generation = (reactionGenRef.current[messageId] ?? 0) + 1;
    reactionGenRef.current[messageId] = generation;
    reactionSnapshotRef.current[messageId] = current;

    setReactionSummaries((prev) => ({
      ...prev,
      [messageId]: applyOptimisticReaction(prev[messageId], messageId, desired),
    }));

    const result =
      desired == null
        ? await clearMessageReaction(messageId)
        : await setMessageReaction(messageId, desired);

    if (reactionGenRef.current[messageId] !== generation) return;

    if (result.unavailable) {
      setReactionsEnabled(false);
      setReactionSummaries((prev) => {
        const next = { ...prev };
        const snapshot = reactionSnapshotRef.current[messageId];
        if (snapshot) next[messageId] = snapshot;
        else delete next[messageId];
        return next;
      });
      return;
    }

    if (result.error) {
      setReactionSummaries((prev) => {
        const next = { ...prev };
        const snapshot = reactionSnapshotRef.current[messageId];
        if (snapshot) next[messageId] = snapshot;
        else delete next[messageId];
        return next;
      });
      return;
    }

    void refreshReactions(messages.filter((row) => row.id === messageId));
  };

  if (!authLoading && !session) {
    return <Redirect href="/auth/worker/login" />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'left', 'right']}>
      <ThreadView
        title={isAppReviewDemo ? t('messages.demoBlocked') : title || t('messages.organization')}
        locale={language}
        messages={isAppReviewDemo ? [] : messages}
        currentUserId={user?.id}
        draft={draft}
        onDraft={setDraft}
        onSend={() => void onSend()}
        onRetryMessage={(message) => void onRetryMessage(message)}
        sending={sending}
        loading={isAppReviewDemo ? false : loading}
        error={isAppReviewDemo ? null : error}
        onRetryLoad={() => {
          setLoading(messages.length === 0);
          void load();
        }}
        hasOlder={isAppReviewDemo ? false : hasOlder}
        loadingOlder={loadingOlder}
        onLoadOlder={() => void loadOlder()}
        onBack={() => {
          if (router.canGoBack()) router.back();
          else router.replace('/messages');
        }}
        reactionSummaries={reactionSummaries}
        reactionsEnabled={!isAppReviewDemo && reactionsEnabled}
        onToggleReaction={(messageId, key) => void onToggleReaction(messageId, key)}
        copy={{
          organization: t('messages.organization'),
          conversationSubtitle: t('messages.conversationSubtitle'),
          privacy: t('messages.privacy'),
          loading: t('messages.loading'),
          loadEarlier: t('messages.loadEarlier'),
          startConversation: isAppReviewDemo
            ? t('messages.demoBlocked')
            : t('messages.startConversation'),
          startConversationBody: isAppReviewDemo
            ? t('messages.demoBlockedBody')
            : t('messages.startConversationBody'),
          composerPlaceholder: t('messages.composerPlaceholder'),
          sendMessage: t('messages.sendMessage'),
          pending: t('messages.pending'),
          sent: t('messages.sent'),
          failed: t('messages.failed'),
          retry: t('common.retry'),
          newMessages: t('messages.newMessages'),
          back: t('common.back'),
          loadError: t('messages.loadError'),
          insertEmoji: t('messages.insertEmoji'),
          emojiPickerTitle: t('messages.emojiPickerTitle'),
          react: t('messages.react'),
          reactionPickerTitle: t('messages.reactionPickerTitle'),
          clearReaction: t('messages.clearReaction'),
        }}
      />
    </SafeAreaView>
  );
}
