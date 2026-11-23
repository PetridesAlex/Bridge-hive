import {
  applyAcceptedSend,
  applyFailedSend,
  applyOlderMessagePage,
  applyOptimisticReaction,
  beginOutgoingMessage,
  canDeleteMessage,
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
import { Redirect, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThreadView } from '@/components/messages/ThreadView';
import { colors } from '@/constants/theme';
import { useTranslation } from '@/i18n/locale-provider';
import {
  areMessagingDeletesUnavailable,
  areMessagingReactionsUnavailable,
  clearConversationForMe,
  clearMessageReaction,
  deleteConversationMessage,
  listConversationMessages,
  listMessageReactionSummaries,
  listMyMessagingConversations,
  markConversationRead,
  sendConversationMessage,
  setMessageReaction,
} from '@/lib/messaging';
import { navigateBack } from '@/lib/navigation';
import { createSecureClientMessageId } from '@/lib/secure-uuid';
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
  // Load errors (tap = retry load) are kept separate from send errors.
  const [error, setError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [reactionSummaries, setReactionSummaries] = useState<
    Record<string, OrgWorkerMessageReactionSummary>
  >({});
  const [reactionsEnabled, setReactionsEnabled] = useState(true);
  const [deletesEnabled, setDeletesEnabled] = useState(true);
  const activeRef = useRef(true);
  const sendLockRef = useRef(createSendLock());
  // The one logical send awaiting server acknowledgement. A retry (bubble or
  // re-pressing send with the same text) reuses this UUID so the server dedupes.
  const logicalSendRef = useRef<{ clientMessageId: string; body: string } | null>(null);
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
      try {
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
      } catch {
        // Reactions are optional: never surface or throw into plain-text messaging.
      }
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
    try {
      const [thread, inbox] = await Promise.all([
        listConversationMessages(conversationId),
        listMyMessagingConversations(),
      ]);
      if (!guardRef.current.isCurrent(requestId, { conversationId })) return;
      if (thread.error) setError(t('messages.loadError'));
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
    } catch {
      if (guardRef.current.isCurrent(requestId, { conversationId })) {
        setError(t('messages.loadError'));
      }
    } finally {
      if (guardRef.current.isCurrent(requestId, { conversationId })) {
        setLoading(false);
      }
    }
  }, [applyPage, conversationId, isAppReviewDemo, session, t]);

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
    setSendError(null);
    logicalSendRef.current = null;
    setLoading(true);
  }, [conversationId]);

  useEffect(() => {
    if (!isMessagingUuid(conversationId) || isAppReviewDemo || !session) return;
    const messagesSub = subscribeMessagingRealtime({
      client: supabase,
      channelName: messagingChannelName('worker-thread', { conversationId }),
      table: 'organization_worker_messages',
      filter: `conversation_id=eq.${conversationId}`,
      event: '*',
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

  const send = async (clientMessageId: string, body: string, draftAtSend: string) => {
    setSending(true);
    try {
      const result = await sendConversationMessage(conversationId, body, clientMessageId);
      if (result.error || !result.data) {
        setMessages((prev) => applyFailedSend(prev, clientMessageId));
        setSendError(t('messages.sendFailed'));
        return;
      }
      logicalSendRef.current = null;
      setMessages((prev) => applyAcceptedSend(prev, result.data!, conversationId));
      // Only clear the composer if the user has not started typing something new.
      setDraft((current) => (current === draftAtSend ? '' : current));
      setSendError(null);
    } catch {
      setMessages((prev) => applyFailedSend(prev, clientMessageId));
      setSendError(t('messages.sendFailed'));
    } finally {
      sendLockRef.current.release();
      setSending(false);
    }
  };

  const onSend = async () => {
    if (!sendLockRef.current.acquire()) return;
    const normalized = normalizeMessageBody(draft);
    if (!normalized.ok || !user?.id) {
      sendLockRef.current.release();
      if (!normalized.ok && normalized.error === 'too_long') setSendError(t('messages.tooLong'));
      return;
    }
    const draftAtSend = draft;
    const pendingLogical = logicalSendRef.current;
    if (pendingLogical && pendingLogical.body === normalized.body) {
      // Same text as a send that was not acknowledged: retry it, same UUID.
      const { clientMessageId } = pendingLogical;
      setMessages((prev) =>
        prev.map((row) =>
          row.clientMessageId === clientMessageId
            ? { ...row, localStatus: 'pending' }
            : row,
        ),
      );
      setSendError(null);
      await send(clientMessageId, normalized.body, draftAtSend);
      return;
    }
    const outgoing = beginOutgoingMessage({
      conversationId,
      senderUserId: user.id,
      senderKind: 'worker',
      body: normalized.body,
      clientMessageId: newClientMessageId(createSecureClientMessageId),
      senderName: t('messages.you'),
    });
    if ('error' in outgoing) {
      sendLockRef.current.release();
      setSendError(t('messages.sendUnavailable'));
      return;
    }
    logicalSendRef.current = {
      clientMessageId: outgoing.clientMessageId,
      body: normalized.body,
    };
    setMessages((prev) => [...prev, outgoing.optimistic]);
    setSendError(null);
    // Keep the draft until server acknowledgement (cleared in send on success).
    await send(outgoing.clientMessageId, normalized.body, draftAtSend);
  };

  const onRetryMessage = async (message: LocalMessagingMessage) => {
    if (!sendLockRef.current.acquire()) return;
    setSendError(null);
    setMessages((prev) =>
      prev.map((row) =>
        row.clientMessageId === message.clientMessageId
          ? { ...row, localStatus: 'pending' }
          : row,
      ),
    );
    // Same clientMessageId + body: one logical send, deduped server-side.
    await send(message.clientMessageId, message.body, message.body);
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

    let result: { error: string | null; unavailable: boolean };
    try {
      result =
        desired == null
          ? await clearMessageReaction(messageId)
          : await setMessageReaction(messageId, desired);
    } catch {
      result = { error: 'REACTION_FAILED', unavailable: false };
    }

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

  const onDeleteMessage = async (message: LocalMessagingMessage): Promise<'unavailable' | string | null> => {
    if (!canDeleteMessage(message, user?.id)) return 'not_allowed';
    const result = await deleteConversationMessage(message.id);
    if (result.unavailable) {
      setDeletesEnabled(false);
      return 'unavailable';
    }
    if (result.error) return result.error;
    setMessages((prev) =>
      prev.map((row) =>
        row.id === message.id ? { ...row, body: '', deletedAt: new Date().toISOString() } : row,
      ),
    );
    setReactionSummaries((prev) => {
      const next = { ...prev };
      delete next[message.id];
      return next;
    });
    void load();
    return null;
  };

  const onDeleteChat = async (): Promise<'unavailable' | string | null> => {
    const result = await clearConversationForMe(conversationId);
    if (result.unavailable) {
      setDeletesEnabled(false);
      return 'unavailable';
    }
    if (result.error) return result.error;
    setMessages([]);
    logicalSendRef.current = null;
    navigateBack('/messages');
    return null;
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
        sendError={isAppReviewDemo ? null : sendError}
        onRetryLoad={() => {
          setLoading(messages.length === 0);
          void load();
        }}
        hasOlder={isAppReviewDemo ? false : hasOlder}
        loadingOlder={loadingOlder}
        onLoadOlder={() => void loadOlder()}
        onBack={() => navigateBack('/messages')}
        reactionSummaries={reactionSummaries}
        reactionsEnabled={!isAppReviewDemo && reactionsEnabled}
        onToggleReaction={(messageId, key) => void onToggleReaction(messageId, key)}
        deletesEnabled={!isAppReviewDemo && deletesEnabled && !areMessagingDeletesUnavailable()}
        onDeleteMessage={onDeleteMessage}
        onDeleteChat={onDeleteChat}
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
          deleteMessage: t('messages.deleteMessage'),
          deleteMessageTitle: t('messages.deleteMessageTitle'),
          deleteMessageBody: t('messages.deleteMessageBody'),
          messageDeleted: t('messages.messageDeleted'),
          deleteChat: t('messages.deleteChat'),
          deleteChatTitle: t('messages.deleteChatTitle'),
          deleteChatBody: t('messages.deleteChatBody'),
          cancel: t('common.cancel'),
          confirmDelete: t('messages.confirmDelete'),
          deleting: t('messages.deleting'),
          deleteFailed: t('messages.deleteFailed'),
          deleteUnavailable: t('messages.deleteUnavailable'),
        }}
      />
    </SafeAreaView>
  );
}
