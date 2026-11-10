import {
  mergeMessagePage,
  normalizeMessageBody,
  ORG_WORKER_MESSAGE_MAX_LENGTH,
  type OrgWorkerMessageRow,
} from '@bridge-hive/domain';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppScreen } from '@/components/ui/AppScreen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { colors, radii, spacing, typography } from '@/constants/theme';
import { useTranslation } from '@/i18n/locale-provider';
import {
  listConversationMessages,
  listMyMessagingConversations,
  markConversationRead,
  sendConversationMessage,
} from '@/lib/messaging';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';

type LocalMessage = OrgWorkerMessageRow & {
  localStatus?: 'pending' | 'failed' | 'sent';
};

export default function MessageThreadScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const conversationId = typeof id === 'string' ? id : '';
  const { user, isAppReviewDemo, session } = useAuth();
  const [title, setTitle] = useState(t('messages.organization'));
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<FlatList<LocalMessage>>(null);

  const load = useCallback(async () => {
    if (!conversationId || isAppReviewDemo || !session) {
      setLoading(false);
      return;
    }
    const [thread, inbox] = await Promise.all([
      listConversationMessages(conversationId),
      listMyMessagingConversations(),
    ]);
    if (thread.error) setError(thread.error);
    else setError(null);
    setMessages((prev) => {
      const pendingLocal = prev.filter(
        (m) =>
          m.conversationId === conversationId &&
          (m.localStatus === 'pending' || m.localStatus === 'failed'),
      );
      return mergeMessagePage(pendingLocal, thread.data) as LocalMessage[];
    });
    const conv = inbox.data.find((c) => c.id === conversationId);
    if (conv?.organizationName) setTitle(conv.organizationName);
    const latest = thread.data[thread.data.length - 1];
    if (latest) {
      await markConversationRead(conversationId, latest.id);
    }
    setLoading(false);
  }, [conversationId, isAppReviewDemo, session]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
      const sub = AppState.addEventListener('change', (state) => {
        if (state === 'active') void load();
      });
      return () => sub.remove();
    }, [load]),
  );

  useEffect(() => {
    if (!conversationId || isAppReviewDemo) return;
    const channel = supabase
      .channel(`worker-messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'organization_worker_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          void load();
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversationId, isAppReviewDemo, load]);

  const send = async (clientMessageId: string, body: string) => {
    const result = await sendConversationMessage(conversationId, body, clientMessageId);
    if (result.error || !result.data) {
      setMessages((prev) =>
        prev.map((m) =>
          m.clientMessageId === clientMessageId ? { ...m, localStatus: 'failed' } : m,
        ),
      );
      return;
    }
    setMessages((prev) =>
      mergeMessagePage(
        prev.filter((m) => m.clientMessageId !== clientMessageId),
        [{ ...result.data!, localStatus: 'sent' }],
      ) as LocalMessage[],
    );
  };

  const onSend = async () => {
    const normalized = normalizeMessageBody(draft);
    if (!normalized.ok || !user?.id) return;
    const clientMessageId =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `tmp-${Date.now()}`;
    const optimistic: LocalMessage = {
      id: `temp-${clientMessageId}`,
      conversationId,
      senderUserId: user.id,
      senderKind: 'worker',
      body: normalized.body,
      clientMessageId,
      createdAt: new Date().toISOString(),
      senderName: t('messages.you'),
      localStatus: 'pending',
    };
    setMessages((prev) => [...prev, optimistic]);
    setDraft('');
    await send(clientMessageId, normalized.body);
  };

  const data = useMemo(() => messages, [messages]);

  if (isAppReviewDemo) {
    return (
      <AppScreen scroll={false} padded={false}>
        <ScreenHeader title={t('messages.title')} showBack onBack={() => router.back()} />
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>{t('messages.demoBlocked')}</Text>
        </View>
      </AppScreen>
    );
  }

  return (
    <AppScreen scroll={false} padded={false} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <ScreenHeader title={title} showBack onBack={() => router.back()} />
        <Text style={styles.privacy}>{t('messages.privacy')}</Text>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.teal} />
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Text style={styles.emptyBody}>{error}</Text>
            <Pressable
              onPress={() => {
                setLoading(true);
                void load();
              }}
              style={styles.retry}
            >
              <Text style={styles.retryText}>{t('common.retry')}</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={data}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.thread}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
            renderItem={({ item }) => {
              const mine = item.senderUserId === user?.id;
              return (
                <View style={[styles.bubbleRow, mine ? styles.mine : styles.theirs]}>
                  <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                    {!mine ? (
                      <Text style={styles.sender}>{item.senderName || t('messages.organization')}</Text>
                    ) : null}
                    <Text style={[styles.body, mine && styles.bodyMine]}>{item.body}</Text>
                    <View style={styles.meta}>
                      <Text style={[styles.metaText, mine && styles.bodyMine]}>
                        {new Date(item.createdAt).toLocaleTimeString()}
                      </Text>
                      {item.localStatus === 'pending' ? (
                        <Text style={[styles.metaText, mine && styles.bodyMine]}>
                          {t('messages.pending')}
                        </Text>
                      ) : null}
                      {item.localStatus === 'failed' ? (
                        <Pressable onPress={() => void send(item.clientMessageId, item.body)}>
                          <Text style={[styles.metaText, styles.failed]}>{t('common.retry')}</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  </View>
                </View>
              );
            }}
          />
        )}
        <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
          <TextInput
            value={draft}
            onChangeText={(value) => setDraft(value.slice(0, ORG_WORKER_MESSAGE_MAX_LENGTH))}
            placeholder={t('messages.composerPlaceholder')}
            placeholderTextColor={colors.textSecondary}
            style={styles.input}
            multiline
            accessibilityLabel={t('messages.composerPlaceholder')}
          />
          <Pressable
            onPress={() => void onSend()}
            disabled={!draft.trim()}
            style={[styles.send, !draft.trim() && styles.sendDisabled]}
            accessibilityRole="button"
            accessibilityLabel={t('messages.send')}
          >
            <Text style={styles.sendText}>{t('messages.send')}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  privacy: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    padding: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.yellowLight,
    fontFamily: typography.fonts.medium,
    fontSize: 12,
    color: colors.navy,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  empty: { padding: spacing.xl, alignItems: 'center' },
  emptyTitle: {
    fontFamily: typography.fonts.semibold,
    fontSize: 16,
    color: colors.navy,
  },
  emptyBody: {
    fontFamily: typography.fonts.regular,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  retry: {
    marginTop: spacing.md,
    backgroundColor: colors.teal,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  retryText: { fontFamily: typography.fonts.semibold, color: colors.white },
  thread: { paddingHorizontal: spacing.md, paddingBottom: spacing.lg, flexGrow: 1 },
  bubbleRow: { marginBottom: spacing.sm, flexDirection: 'row' },
  mine: { justifyContent: 'flex-end' },
  theirs: { justifyContent: 'flex-start' },
  bubble: {
    maxWidth: '82%',
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  bubbleMine: {
    backgroundColor: colors.navy,
    borderBottomRightRadius: 6,
  },
  bubbleTheirs: {
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderBottomLeftRadius: 6,
  },
  sender: {
    fontFamily: typography.fonts.semibold,
    fontSize: 11,
    color: colors.tealStrong,
    marginBottom: 4,
  },
  body: {
    fontFamily: typography.fonts.regular,
    fontSize: 15,
    color: colors.navy,
  },
  bodyMine: { color: colors.white },
  meta: { marginTop: 4, flexDirection: 'row', gap: 8, justifyContent: 'flex-end' },
  metaText: {
    fontFamily: typography.fonts.regular,
    fontSize: 10,
    color: colors.textSecondary,
  },
  failed: { color: colors.error, fontFamily: typography.fonts.semibold },
  composer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? spacing.sm : spacing.xs,
    fontFamily: typography.fonts.regular,
    fontSize: 15,
    color: colors.navy,
  },
  send: {
    backgroundColor: colors.teal,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 44,
    justifyContent: 'center',
  },
  sendDisabled: { opacity: 0.45 },
  sendText: { fontFamily: typography.fonts.semibold, color: colors.white, fontSize: 14 },
});
