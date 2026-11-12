import {
  filterConversationsByQuery,
  messagingInboxTime,
  messagingInitials,
  messagePreview,
  type OrgWorkerConversationSummary,
} from '@bridge-hive/domain';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { colors, motion, radii, shadows, spacing, typography } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/useReducedMotion';

type Copy = {
  title: string;
  subtitle: string;
  searchPlaceholder: string;
  organization: string;
  emptyInbox: string;
  emptyInboxBody: string;
  loadError: string;
  loading: string;
  reconnect: string;
  retry: string;
  back: string;
  noMessagesYet: string;
  newMessages: string;
};

type Props = {
  rows: OrgWorkerConversationSummary[];
  locale: string;
  copy: Copy;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  onBack: () => void;
  onRefresh: () => void;
  onRetry: () => void;
  onOpen: (id: string) => void;
};

function ConversationRow({
  item,
  index,
  locale,
  copy,
  onOpen,
}: {
  item: OrgWorkerConversationSummary;
  index: number;
  locale: string;
  copy: Copy;
  onOpen: (id: string) => void;
}) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  const unreadPulse = useSharedValue(reduced || item.unreadCount === 0 ? 0 : 0.35);

  useEffect(() => {
    if (reduced || item.unreadCount === 0) {
      unreadPulse.value = 0;
      return;
    }
    unreadPulse.value = withRepeat(
      withTiming(1, { duration: 1700, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [item.unreadCount, reduced, unreadPulse]);

  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const pulseStyle = useAnimatedStyle(() => ({
    opacity: interpolate(unreadPulse.value, [0, 1], [0.2, 0.55]),
    transform: [{ scale: interpolate(unreadPulse.value, [0, 1], [1, 1.22]) }],
  }));

  const name = item.organizationName?.trim() || copy.organization;
  const unread = item.unreadCount > 0;
  const preview = messagePreview(item.lastMessagePreview ?? '', 100);
  const when = messagingInboxTime(item.lastMessageAt, locale);

  return (
    <Animated.View
      entering={reduced ? undefined : FadeInDown.delay(Math.min(index * 45, 280)).duration(360)}
      style={pressStyle}
    >
      <Pressable
        onPress={() => onOpen(item.id)}
        onPressIn={() => {
          if (reduced) return;
          scale.value = withSpring(0.985, { damping: 18, stiffness: 420 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 14, stiffness: 260 });
        }}
        style={({ pressed }) => [styles.row, unread && styles.rowUnread, pressed && styles.rowPressed]}
        accessibilityRole="button"
        accessibilityLabel={name}
      >
        {unread ? <View style={styles.unreadRail} /> : null}
        <View style={styles.avatarWrap}>
          {unread ? (
            <Animated.View pointerEvents="none" style={[styles.avatarPulse, pulseStyle]} />
          ) : null}
          <LinearGradient
            colors={unread ? ['#0B2A43', '#0E4A5C'] : ['#123A5C', '#0B2A43']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.avatar, unread && styles.avatarUnread]}
          >
            <Text style={styles.avatarText}>{messagingInitials(name)}</Text>
          </LinearGradient>
        </View>
        <View style={styles.rowBody}>
          <View style={styles.rowTop}>
            <Text style={[styles.name, unread && styles.nameUnread]} numberOfLines={1}>
              {name}
            </Text>
            {when ? (
              <Text style={[styles.time, unread && styles.timeUnread]}>{when}</Text>
            ) : null}
          </View>
          <Text style={styles.orgMeta} numberOfLines={1}>
            {copy.organization}
          </Text>
          {preview || unread ? (
            <View style={styles.rowBottom}>
              <Text style={[styles.preview, unread && styles.previewUnread]} numberOfLines={2}>
                {preview || copy.newMessages}
              </Text>
              {unread ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {item.unreadCount > 99 ? '99+' : item.unreadCount}
                  </Text>
                </View>
              ) : (
                <Ionicons name="chevron-forward" size={14} color="rgba(11,42,67,0.28)" />
              )}
            </View>
          ) : (
            <Text style={styles.previewQuiet}>{copy.noMessagesYet}</Text>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}

export function InboxView({
  rows,
  locale,
  copy,
  loading,
  refreshing,
  error,
  onBack,
  onRefresh,
  onRetry,
  onOpen,
}: Props) {
  const [query, setQuery] = useState('');
  const reduced = useReducedMotion();
  const searchEnter = useSharedValue(reduced ? 1 : 0);
  const visible = useMemo(
    () => filterConversationsByQuery(rows, query),
    [query, rows],
  );
  const showInitialLoading = loading && rows.length === 0 && !error;
  const unreadTotal = useMemo(
    () => rows.reduce((sum, row) => sum + Math.max(0, row.unreadCount), 0),
    [rows],
  );

  useEffect(() => {
    if (reduced) {
      searchEnter.value = 1;
      return;
    }
    searchEnter.value = withTiming(1, {
      duration: motion.duration.normal,
      easing: Easing.out(Easing.cubic),
    });
  }, [reduced, searchEnter]);

  const searchMotion = useAnimatedStyle(() => ({
    opacity: searchEnter.value,
    transform: [{ translateY: interpolate(searchEnter.value, [0, 1], [8, 0]) }],
  }));

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <ScreenHeader
          title={copy.title}
          subtitle={copy.subtitle}
          showBack
          onBack={onBack}
          titleSize="detail"
          right={
            unreadTotal > 0 ? (
              <View style={styles.headerBadge}>
                <Text style={styles.headerBadgeText}>
                  {unreadTotal > 99 ? '99+' : unreadTotal}
                </Text>
              </View>
            ) : undefined
          }
        />
      </View>

      <Animated.View style={[styles.searchShell, searchMotion]}>
        <View style={styles.searchWrap}>
          <View style={styles.searchIcon}>
            <Ionicons name="search" size={15} color={colors.tealStrong} />
          </View>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={copy.searchPlaceholder}
            placeholderTextColor={colors.textMuted}
            style={styles.search}
            accessibilityLabel={copy.searchPlaceholder}
            autoCorrect={false}
            autoCapitalize="none"
          />
          {query.length > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              onPress={() => setQuery('')}
              hitSlop={8}
              style={styles.clearSearch}
            >
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </Pressable>
          ) : null}
        </View>
      </Animated.View>

      {error && rows.length > 0 ? (
        <Pressable onPress={onRetry} style={styles.reconnect} accessibilityRole="button">
          <Ionicons name="refresh" size={14} color={colors.navy} />
          <Text style={styles.reconnectText}>{copy.reconnect}</Text>
        </Pressable>
      ) : null}

      {showInitialLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.teal} />
          <Text style={styles.muted}>{copy.loading}</Text>
        </View>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.teal} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <LinearGradient
                colors={['#0B2A43', '#0E4A5C', '#0F6B6B']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.emptyCard}
              >
                <View style={styles.emptyIcon}>
                  <Ionicons name="chatbubbles-outline" size={22} color={colors.yellow} />
                </View>
                <Text style={styles.emptyTitle}>
                  {error ? copy.loadError : copy.emptyInbox}
                </Text>
                <Text style={styles.emptyBody}>{error ? error : copy.emptyInboxBody}</Text>
                {error ? (
                  <Pressable onPress={onRetry} style={styles.retry} accessibilityRole="button">
                    <Text style={styles.retryText}>{copy.retry}</Text>
                  </Pressable>
                ) : null}
              </LinearGradient>
            </View>
          }
          renderItem={({ item, index }) => (
            <ConversationRow
              item={item}
              index={index}
              locale={locale}
              copy={copy}
              onOpen={onOpen}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    paddingHorizontal: spacing.screen,
    marginBottom: spacing.md,
    gap: 10,
  },
  headerBadge: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.navy,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 210, 90, 0.35)',
  },
  headerBadgeText: {
    fontFamily: typography.fonts.bold,
    fontSize: 12,
    color: colors.yellow,
  },
  searchShell: {
    paddingHorizontal: spacing.screen,
    marginBottom: spacing.md,
  },
  searchWrap: {
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.88)',
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(11, 42, 67, 0.10)',
    ...shadows.sm,
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
  },
  searchIcon: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(20, 169, 181, 0.12)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(20, 169, 181, 0.22)',
  },
  search: {
    flex: 1,
    fontFamily: typography.fonts.regular,
    fontSize: 15,
    color: colors.navy,
    paddingVertical: 11,
  },
  clearSearch: {
    padding: 2,
  },
  reconnect: {
    marginHorizontal: spacing.screen,
    marginBottom: spacing.sm,
    backgroundColor: 'rgba(255, 210, 90, 0.16)',
    borderRadius: 14,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 210, 90, 0.35)',
  },
  reconnectText: {
    flex: 1,
    fontFamily: typography.fonts.medium,
    fontSize: 13,
    color: colors.navy,
  },
  list: {
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.huge,
    flexGrow: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  muted: {
    fontFamily: typography.fonts.regular,
    fontSize: 13,
    color: colors.textSecondary,
  },
  empty: {
    paddingTop: spacing.xl,
  },
  emptyCard: {
    borderRadius: 20,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.14)',
    overflow: 'hidden',
  },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 210, 90, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 210, 90, 0.28)',
    marginBottom: spacing.xs,
  },
  emptyTitle: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 17,
    lineHeight: 22,
    color: colors.white,
    textAlign: 'center',
  },
  emptyBody: {
    fontFamily: typography.fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(255,255,255,0.68)',
    textAlign: 'center',
  },
  retry: {
    marginTop: spacing.sm,
    backgroundColor: colors.yellow,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  retryText: {
    fontFamily: typography.fonts.semibold,
    fontSize: 14,
    color: colors.navy,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 88,
    marginBottom: spacing.sm + 2,
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.md,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(11, 42, 67, 0.10)',
    overflow: 'hidden',
    ...shadows.sm,
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
  },
  rowUnread: {
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderColor: 'rgba(11, 42, 67, 0.14)',
  },
  rowPressed: {
    opacity: 0.96,
  },
  unreadRail: {
    position: 'absolute',
    left: 0,
    top: 14,
    bottom: 14,
    width: 3,
    borderRadius: 2,
    backgroundColor: colors.yellow,
  },
  avatarWrap: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPulse: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 210, 90, 0.35)',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  avatarUnread: {
    borderColor: 'rgba(255, 210, 90, 0.45)',
  },
  avatarText: {
    fontFamily: typography.fonts.semibold,
    fontSize: 15,
    color: colors.white,
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  name: {
    flex: 1,
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 16,
    lineHeight: 21,
    letterSpacing: -0.2,
    color: colors.navy,
  },
  nameUnread: {
    fontFamily: typography.fonts.display,
  },
  time: {
    fontFamily: typography.fonts.medium,
    fontSize: 11.5,
    color: colors.textSecondary,
  },
  timeUnread: {
    color: colors.tealStrong,
  },
  orgMeta: {
    fontFamily: typography.fonts.medium,
    fontSize: 11,
    letterSpacing: 0.2,
    textTransform: 'uppercase',
    color: 'rgba(11, 42, 67, 0.42)',
  },
  rowBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 1,
  },
  preview: {
    flex: 1,
    fontFamily: typography.fonts.regular,
    fontSize: 13.5,
    lineHeight: 19,
    color: colors.textSecondary,
  },
  previewUnread: {
    fontFamily: typography.fonts.medium,
    color: colors.navy,
  },
  previewQuiet: {
    fontFamily: typography.fonts.regular,
    fontSize: 13.5,
    lineHeight: 19,
    color: colors.textMuted,
    marginTop: 1,
  },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 210, 90, 0.35)',
  },
  badgeText: {
    fontFamily: typography.fonts.bold,
    fontSize: 11,
    color: colors.yellow,
  },
});
