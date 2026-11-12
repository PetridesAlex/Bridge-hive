import {
  canReactToMessage,
  clampMessageDraft,
  composerSendsOnEnter,
  insertTextAtSelection,
  isOwnMessagingMessage,
  messagingClockLabel,
  messagingDayLabel,
  messagingInitials,
  ORG_WORKER_COMPOSER_COMMON_EMOJIS,
  ORG_WORKER_MESSAGE_MAX_LENGTH,
  ORG_WORKER_REACTION_EMOJI,
  ORG_WORKER_REACTION_KEYS,
  shouldFollowMessageTail,
  shouldSeparateMessagingDay,
  shouldShowMessagingSender,
  splitMessageBody,
  type LocalMessagingMessage,
  type OrgWorkerMessageReactionSummary,
  type OrgWorkerReactionKey,
} from '@bridge-hive/domain';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type NativeSyntheticEvent,
  type TextInputSelectionChangeEventData,
} from 'react-native';
import Animated, {
  Easing,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconButton } from '@/components/ui/IconButton';
import { colors, radii, shadows, spacing, typography } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/useReducedMotion';

type Copy = {
  organization: string;
  conversationSubtitle: string;
  privacy: string;
  loading: string;
  loadEarlier: string;
  startConversation: string;
  startConversationBody: string;
  composerPlaceholder: string;
  sendMessage: string;
  pending: string;
  sent: string;
  failed: string;
  retry: string;
  newMessages: string;
  back: string;
  loadError: string;
  insertEmoji: string;
  emojiPickerTitle: string;
  react: string;
  reactionPickerTitle: string;
  clearReaction: string;
};

type Props = {
  title: string;
  locale: string;
  copy: Copy;
  messages: LocalMessagingMessage[];
  currentUserId?: string | null;
  draft: string;
  onDraft: (value: string) => void;
  onSend: () => void;
  onRetryMessage: (message: LocalMessagingMessage) => void;
  sending: boolean;
  loading: boolean;
  error: string | null;
  onRetryLoad: () => void;
  hasOlder: boolean;
  loadingOlder: boolean;
  onLoadOlder: () => void;
  onBack: () => void;
  reactionSummaries: Record<string, OrgWorkerMessageReactionSummary>;
  reactionsEnabled: boolean;
  onToggleReaction: (messageId: string, key: OrgWorkerReactionKey) => void;
};

export function ThreadView({
  title,
  locale,
  copy,
  messages,
  currentUserId,
  draft,
  onDraft,
  onSend,
  onRetryMessage,
  sending,
  loading,
  error,
  onRetryLoad,
  hasOlder,
  loadingOlder,
  onLoadOlder,
  onBack,
  reactionSummaries,
  reactionsEnabled,
  onToggleReaction,
}: Props) {
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<LocalMessagingMessage>>(null);
  const inputRef = useRef<TextInput>(null);
  const nearBottomRef = useRef(true);
  const ownSendRef = useRef(false);
  const tailIdRef = useRef<string | null>(null);
  const preserveRef = useRef(false);
  const selectionRef = useRef({ start: draft.length, end: draft.length });
  const [selection, setSelection] = useState({ start: draft.length, end: draft.length });
  const [showJump, setShowJump] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [reactTarget, setReactTarget] = useState<LocalMessagingMessage | null>(null);
  const [composerFocused, setComposerFocused] = useState(false);
  const reducedMotion = useReducedMotion();
  const canSend = draft.trim().length > 0 && !sending;
  const hasDraft = draft.trim().length > 0;
  const name = title.trim() || copy.organization;
  const focusProgress = useSharedValue(0);
  const readyProgress = useSharedValue(0);
  const sendPress = useSharedValue(1);
  const emojiPress = useSharedValue(1);

  useEffect(() => {
    focusProgress.value = withTiming(composerFocused ? 1 : 0, {
      duration: reducedMotion ? 0 : 180,
      easing: Easing.out(Easing.cubic),
    });
  }, [composerFocused, focusProgress, reducedMotion]);

  useEffect(() => {
    readyProgress.value = reducedMotion
      ? withTiming(canSend ? 1 : 0, { duration: 0 })
      : withSpring(canSend ? 1 : 0, { damping: 18, stiffness: 240, mass: 0.7 });
  }, [canSend, readyProgress, reducedMotion]);

  const composerShellStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      focusProgress.value,
      [0, 1],
      [colors.border, colors.tealStrong],
    ),
    backgroundColor: interpolateColor(
      focusProgress.value,
      [0, 1],
      [colors.surfaceSubdued, colors.white],
    ),
    shadowOpacity: interpolate(focusProgress.value, [0, 1], [0, 0.08]),
    shadowRadius: interpolate(focusProgress.value, [0, 1], [0, 10]),
    elevation: interpolate(focusProgress.value, [0, 1], [0, 3]),
  }));

  const sendButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: sendPress.value * interpolate(readyProgress.value, [0, 1], [0.94, 1]) }],
    backgroundColor: interpolateColor(
      readyProgress.value,
      [0, 1],
      ['transparent', colors.navy],
    ),
    borderColor: interpolateColor(
      readyProgress.value,
      [0, 1],
      [colors.border, colors.navy],
    ),
  }));

  const emojiButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: emojiPress.value }],
    opacity: interpolate(focusProgress.value, [0, 1], [0.72, 1]),
  }));

  useEffect(() => {
    selectionRef.current = selection;
  }, [selection]);

  const followTail = () => {
    listRef.current?.scrollToEnd({ animated: false });
    setShowJump(false);
    nearBottomRef.current = true;
  };

  const insertEmoji = (emoji: string) => {
    const next = insertTextAtSelection(draft, emoji, selectionRef.current, ORG_WORKER_MESSAGE_MAX_LENGTH);
    onDraft(next.value);
    setSelection(next.selection);
    selectionRef.current = next.selection;
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.setNativeProps?.({ selection: next.selection });
    });
  };

  const openReactFor = (message: LocalMessagingMessage) => {
    if (!reactionsEnabled || !canReactToMessage(message)) return;
    setReactTarget(message);
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
    >
      <View style={styles.header}>
        <IconButton
          icon="chevron-back"
          accessibilityLabel={copy.back}
          onPress={onBack}
          size={20}
          backgroundColor={colors.surfaceSubdued}
        />
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{messagingInitials(name)}</Text>
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title} numberOfLines={1}>
            {name}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {copy.conversationSubtitle}
          </Text>
        </View>
      </View>
      <View style={styles.privacy} accessibilityRole="text">
        <Ionicons name="shield-checkmark" size={15} color={colors.tealStrong} />
        <Text style={styles.privacyText}>{copy.privacy}</Text>
      </View>
      {loading && messages.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.teal} />
          <Text style={styles.muted}>{copy.loading}</Text>
        </View>
      ) : (
        <View style={styles.flex}>
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item.clientMessageId || item.id}
            contentContainerStyle={styles.thread}
            keyboardShouldPersistTaps="handled"
            onScroll={(event) => {
              const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
              const distance = contentSize.height - contentOffset.y - layoutMeasurement.height;
              nearBottomRef.current = distance < 96;
              if (nearBottomRef.current) setShowJump(false);
            }}
            scrollEventThrottle={32}
            onContentSizeChange={() => {
              if (preserveRef.current) {
                preserveRef.current = false;
                return;
              }
              const tail = messages[messages.length - 1]?.id ?? null;
              if (!tail || tail === tailIdRef.current) return;
              tailIdRef.current = tail;
              const follow = shouldFollowMessageTail({
                nearBottom: nearBottomRef.current,
                ownSend: ownSendRef.current,
              });
              ownSendRef.current = false;
              if (follow) followTail();
              else setShowJump(true);
            }}
            ListHeaderComponent={
              <View>
                {error ? (
                  <Pressable onPress={onRetryLoad} style={styles.inlineNote} accessibilityRole="button">
                    <Text style={styles.inlineNoteText}>{copy.loadError}</Text>
                  </Pressable>
                ) : null}
                {hasOlder ? (
                  <Pressable
                    onPress={() => {
                      preserveRef.current = true;
                      onLoadOlder();
                    }}
                    disabled={loadingOlder}
                    style={styles.earlier}
                    accessibilityRole="button"
                  >
                    <Text style={styles.earlierText}>
                      {loadingOlder ? copy.loading : copy.loadEarlier}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            }
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons name="chatbubble-ellipses-outline" size={28} color={colors.tealStrong} />
                <Text style={styles.emptyTitle}>{copy.startConversation}</Text>
                <Text style={styles.emptyBody}>{copy.startConversationBody}</Text>
              </View>
            }
            renderItem={({ item, index }) => {
              const previous = messages[index - 1];
              const mine = isOwnMessagingMessage(item, currentUserId);
              const dayChanged = shouldSeparateMessagingDay(previous?.createdAt, item.createdAt);
              const showSender = shouldShowMessagingSender({
                mine,
                senderUserId: item.senderUserId,
                previousSenderUserId: previous?.senderUserId,
                dayChanged,
              });
              const day = dayChanged ? messagingDayLabel(item.createdAt, locale) : null;
              const summary = reactionSummaries[item.id];
              const canReact = reactionsEnabled && canReactToMessage(item);
              return (
                <View>
                  {day ? <Text style={styles.day}>{day}</Text> : null}
                  <View style={[styles.bubbleRow, mine ? styles.mine : styles.theirs]}>
                    <Pressable
                      onLongPress={() => openReactFor(item)}
                      delayLongPress={280}
                      accessibilityRole="button"
                      accessibilityLabel={canReact ? copy.react : undefined}
                      disabled={!canReact}
                      style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}
                    >
                      {showSender ? (
                        <Text style={styles.sender}>
                          {item.senderName?.trim() || copy.organization}
                        </Text>
                      ) : null}
                      <Text style={[styles.body, mine && styles.bodyMine]}>
                        {splitMessageBody(item.body).map((part, partIndex) =>
                          part.type === 'link' ? (
                            <Text
                              key={`${item.id}-link-${partIndex}`}
                              style={[styles.link, mine && styles.linkMine]}
                              onPress={() => void Linking.openURL(part.value)}
                            >
                              {part.value}
                            </Text>
                          ) : (
                            <Text key={`${item.id}-text-${partIndex}`}>{part.value}</Text>
                          ),
                        )}
                      </Text>
                      <View style={styles.meta}>
                        <Text style={[styles.metaText, mine && styles.metaMine]}>
                          {messagingClockLabel(item.createdAt, locale)}
                        </Text>
                        {mine && item.localStatus === 'pending' ? (
                          <Text style={[styles.metaText, styles.metaMine]}>{copy.pending}</Text>
                        ) : null}
                        {mine && item.localStatus === 'sent' ? (
                          <Text style={[styles.metaText, styles.metaMine]}>{copy.sent}</Text>
                        ) : null}
                        {item.localStatus === 'failed' ? (
                          <Pressable
                            onPress={() => onRetryMessage(item)}
                            accessibilityRole="button"
                            accessibilityLabel={copy.retry}
                          >
                            <Text style={styles.failed}>
                              {copy.failed} · {copy.retry}
                            </Text>
                          </Pressable>
                        ) : null}
                      </View>
                    </Pressable>
                    {canReact ? (
                      <Pressable
                        onPress={() => openReactFor(item)}
                        style={[styles.reactBtn, mine ? styles.reactBtnMine : styles.reactBtnTheirs]}
                        accessibilityRole="button"
                        accessibilityLabel={copy.react}
                      >
                        <Ionicons name="happy-outline" size={16} color={colors.tealStrong} />
                      </Pressable>
                    ) : null}
                  </View>
                  {summary && summary.reactions.length > 0 ? (
                    <View
                      style={[
                        styles.chipRow,
                        mine ? styles.chipRowMine : styles.chipRowTheirs,
                      ]}
                    >
                      {summary.reactions.map((chip) => (
                        <Pressable
                          key={`${item.id}-${chip.key}`}
                          onPress={() => onToggleReaction(item.id, chip.key)}
                          style={[styles.chip, chip.reactedByMe && styles.chipMine]}
                          accessibilityRole="button"
                          accessibilityLabel={`${chip.emoji} ${chip.count}`}
                          accessibilityState={{ selected: chip.reactedByMe }}
                        >
                          <Text style={styles.chipText}>
                            {chip.emoji} {chip.count}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  ) : null}
                </View>
              );
            }}
          />
          {showJump ? (
            <Pressable onPress={followTail} style={styles.jump} accessibilityRole="button">
              <Text style={styles.jumpText}>{copy.newMessages}</Text>
            </Pressable>
          ) : null}
        </View>
      )}
      <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        <Animated.View
          style={[
            styles.composerShell,
            composerShellStyle,
            { shadowColor: colors.navy, shadowOffset: { width: 0, height: 4 } },
          ]}
        >
          <Animated.View style={emojiButtonStyle}>
            <Pressable
              onPress={() => setEmojiOpen(true)}
              onPressIn={() => {
                emojiPress.value = withTiming(0.92, { duration: reducedMotion ? 0 : 90 });
              }}
              onPressOut={() => {
                emojiPress.value = withSpring(1, { damping: 16, stiffness: 320 });
              }}
              style={styles.emojiBtn}
              accessibilityRole="button"
              accessibilityLabel={copy.insertEmoji}
            >
              <Ionicons
                name="happy-outline"
                size={20}
                color={composerFocused || hasDraft ? colors.tealStrong : colors.textMuted}
              />
            </Pressable>
          </Animated.View>
          <TextInput
            ref={inputRef}
            value={draft}
            onChangeText={(value) => onDraft(clampMessageDraft(value))}
            onFocus={() => setComposerFocused(true)}
            onBlur={() => setComposerFocused(false)}
            onSelectionChange={(
              event: NativeSyntheticEvent<TextInputSelectionChangeEventData>,
            ) => {
              const next = event.nativeEvent.selection;
              setSelection(next);
              selectionRef.current = next;
            }}
            selection={selection}
            placeholder={copy.composerPlaceholder}
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            multiline
            scrollEnabled
            textAlignVertical="center"
            accessibilityLabel={copy.composerPlaceholder}
            onKeyPress={(event) => {
              if (Platform.OS !== 'web') return;
              const native = event.nativeEvent as {
                key: string;
                shiftKey?: boolean;
                isComposing?: boolean;
              };
              if (
                !composerSendsOnEnter({
                  key: native.key,
                  shiftKey: Boolean(native.shiftKey),
                  composing: Boolean(native.isComposing),
                })
              ) {
                return;
              }
              const maybePrevent = event as { preventDefault?: () => void };
              maybePrevent.preventDefault?.();
              if (canSend) {
                ownSendRef.current = true;
                onSend();
              }
            }}
          />
          <Animated.View style={[styles.send, sendButtonStyle]}>
            <Pressable
              onPress={() => {
                if (!canSend) return;
                ownSendRef.current = true;
                onSend();
              }}
              onPressIn={() => {
                if (!canSend) return;
                sendPress.value = withTiming(0.9, { duration: reducedMotion ? 0 : 80 });
              }}
              onPressOut={() => {
                sendPress.value = withSpring(1, { damping: 14, stiffness: 320 });
              }}
              disabled={!canSend}
              style={styles.sendHit}
              accessibilityRole="button"
              accessibilityLabel={copy.sendMessage}
              accessibilityState={{ disabled: !canSend, busy: sending }}
            >
              {sending ? (
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <Ionicons
                  name="arrow-up"
                  size={18}
                  color={canSend ? colors.white : colors.textMuted}
                />
              )}
            </Pressable>
          </Animated.View>
        </Animated.View>
      </View>

      <Modal
        visible={emojiOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setEmojiOpen(false)}
      >
        <Pressable style={styles.sheetBackdrop} onPress={() => setEmojiOpen(false)}>
          <Pressable
            style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={styles.sheetTitle}>{copy.emojiPickerTitle}</Text>
            <View style={styles.emojiGrid}>
              {ORG_WORKER_COMPOSER_COMMON_EMOJIS.map((emoji) => (
                <Pressable
                  key={emoji}
                  onPress={() => {
                    insertEmoji(emoji);
                    setEmojiOpen(false);
                  }}
                  style={styles.emojiCell}
                  accessibilityRole="button"
                  accessibilityLabel={emoji}
                >
                  <Text style={styles.emojiGlyph}>{emoji}</Text>
                </Pressable>
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={Boolean(reactTarget)}
        animationType="fade"
        transparent
        onRequestClose={() => setReactTarget(null)}
      >
        <Pressable style={styles.sheetBackdrop} onPress={() => setReactTarget(null)}>
          <Pressable
            style={[styles.reactionBar, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={styles.sheetTitle}>{copy.reactionPickerTitle}</Text>
            <View style={styles.reactionKeys}>
              {ORG_WORKER_REACTION_KEYS.map((key) => {
                const mine =
                  reactTarget &&
                  reactionSummaries[reactTarget.id]?.reactions.some(
                    (chip) => chip.key === key && chip.reactedByMe,
                  );
                return (
                  <Pressable
                    key={key}
                    onPress={() => {
                      if (!reactTarget) return;
                      onToggleReaction(reactTarget.id, key);
                      setReactTarget(null);
                    }}
                    style={[styles.reactionKey, mine && styles.chipMine]}
                    accessibilityRole="button"
                    accessibilityLabel={
                      mine
                        ? copy.clearReaction
                        : `${ORG_WORKER_REACTION_EMOJI[key]}`
                    }
                    accessibilityState={{ selected: Boolean(mine) }}
                  >
                    <Text style={styles.emojiGlyph}>{ORG_WORKER_REACTION_EMOJI[key]}</Text>
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1, position: 'relative' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    ...shadows.sm,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 15,
    color: colors.white,
  },
  headerText: { flex: 1, minWidth: 0, gap: 2 },
  title: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 18,
    lineHeight: 23,
    letterSpacing: -0.3,
    color: colors.navy,
  },
  subtitle: {
    fontFamily: typography.fonts.medium,
    fontSize: 13,
    lineHeight: 17,
    color: colors.tealStrong,
  },
  privacy: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginHorizontal: spacing.screen,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  privacyText: {
    flex: 1,
    fontFamily: typography.fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  muted: { fontFamily: typography.fonts.regular, fontSize: 13, color: colors.textSecondary },
  thread: { paddingHorizontal: spacing.md, paddingVertical: spacing.md, flexGrow: 1 },
  inlineNote: {
    alignSelf: 'center',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.errorLight,
  },
  inlineNoteText: { fontFamily: typography.fonts.medium, fontSize: 13, color: colors.error },
  earlier: { alignSelf: 'center', paddingVertical: spacing.sm },
  earlierText: { fontFamily: typography.fonts.semibold, fontSize: 13, color: colors.tealStrong },
  empty: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.huge,
    gap: spacing.xs,
  },
  emptyTitle: {
    fontFamily: typography.fonts.semibold,
    fontSize: 16,
    color: colors.navy,
    textAlign: 'center',
  },
  emptyBody: {
    fontFamily: typography.fonts.regular,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  day: {
    alignSelf: 'center',
    marginVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.full,
    overflow: 'hidden',
    backgroundColor: 'rgba(11, 42, 67, 0.08)',
    fontFamily: typography.fonts.medium,
    fontSize: 11,
    color: colors.textSecondary,
  },
  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 4,
    gap: 6,
  },
  mine: { justifyContent: 'flex-end' },
  theirs: { justifyContent: 'flex-start' },
  bubble: {
    maxWidth: '78%',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bubbleMine: { backgroundColor: colors.navy, borderBottomRightRadius: 6 },
  bubbleTheirs: { backgroundColor: colors.white, borderBottomLeftRadius: 6 },
  sender: {
    fontFamily: typography.fonts.semibold,
    fontSize: 12,
    color: colors.tealStrong,
    marginBottom: 2,
  },
  body: {
    fontFamily: typography.fonts.regular,
    fontSize: 16,
    lineHeight: 21,
    color: colors.navy,
  },
  bodyMine: { color: colors.white },
  link: { textDecorationLine: 'underline', color: colors.tealStrong },
  linkMine: { color: colors.yellow },
  meta: { marginTop: 3, flexDirection: 'row', justifyContent: 'flex-end', gap: 6, flexWrap: 'wrap' },
  metaText: { fontFamily: typography.fonts.regular, fontSize: 11, color: colors.textSecondary },
  metaMine: { color: 'rgba(255,255,255,0.78)' },
  failed: { fontFamily: typography.fonts.semibold, fontSize: 11, color: colors.error },
  reactBtn: {
    width: 28,
    height: 28,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  reactBtnMine: {},
  reactBtnTheirs: {},
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: spacing.sm,
    marginTop: 2,
  },
  chipRowMine: { justifyContent: 'flex-end', paddingRight: 36 },
  chipRowTheirs: { justifyContent: 'flex-start', paddingLeft: 4 },
  chip: {
    borderRadius: radii.full,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  chipMine: {
    borderColor: colors.tealStrong,
    backgroundColor: colors.tealSoft,
  },
  chipText: { fontSize: 13, color: colors.navy },
  jump: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: spacing.sm,
    backgroundColor: colors.navy,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  jumpText: { fontFamily: typography.fonts.semibold, fontSize: 13, color: colors.white },
  composer: {
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.sm,
    backgroundColor: colors.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    ...shadows.sticky,
  },
  composerShell: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    minHeight: 48,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 22,
    paddingLeft: 4,
    paddingRight: 4,
    paddingVertical: 4,
  },
  emojiBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    paddingHorizontal: spacing.sm,
    paddingTop: Platform.OS === 'ios' ? 10 : 8,
    paddingBottom: Platform.OS === 'ios' ? 10 : 8,
    fontFamily: typography.fonts.regular,
    fontSize: 15,
    lineHeight: 21,
    color: colors.navy,
    backgroundColor: 'transparent',
  },
  send: {
    width: 36,
    height: 36,
    marginBottom: 2,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  sendHit: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(7,29,48,0.35)',
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  reactionBar: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  sheetTitle: {
    fontFamily: typography.fonts.semibold,
    fontSize: 16,
    color: colors.navy,
    marginBottom: spacing.md,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  emojiCell: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceSubdued,
  },
  emojiGlyph: { fontSize: 24 },
  reactionKeys: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  reactionKey: {
    flex: 1,
    height: 48,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceSubdued,
  },
});
