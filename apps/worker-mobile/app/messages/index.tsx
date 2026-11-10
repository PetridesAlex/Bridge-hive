import {
  messagePreview,
  type OrgWorkerConversationSummary,
} from '@bridge-hive/domain';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppScreen } from '@/components/ui/AppScreen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { colors, radii, spacing, typography } from '@/constants/theme';
import { useTranslation } from '@/i18n/locale-provider';
import { listMyMessagingConversations } from '@/lib/messaging';
import { useAuth } from '@/providers/AuthProvider';

function formatTime(iso?: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString();
}

export default function MessagesInboxScreen() {
  const { t } = useTranslation();
  const { isAppReviewDemo, session } = useAuth();
  const [rows, setRows] = useState<OrgWorkerConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (isAppReviewDemo || !session) {
      setRows([]);
      setLoading(false);
      return;
    }
    const result = await listMyMessagingConversations();
    if (result.error) setError(result.error);
    else setError(null);
    setRows(result.data);
    setLoading(false);
    setRefreshing(false);
  }, [isAppReviewDemo, session]);

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

  if (isAppReviewDemo) {
    return (
      <AppScreen scroll={false} padded={false}>
        <ScreenHeader title={t('messages.title')} showBack onBack={() => router.back()} />
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>{t('messages.demoBlocked')}</Text>
          <Text style={styles.emptyBody}>{t('messages.demoBlockedBody')}</Text>
        </View>
      </AppScreen>
    );
  }

  return (
    <AppScreen scroll={false} padded={false}>
      <ScreenHeader title={t('messages.title')} showBack onBack={() => router.back()} />
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.teal} />
          <Text style={styles.muted}>{t('messages.loading')}</Text>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                void load();
              }}
              tintColor={colors.teal}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>
                {error ? t('messages.loadError') : t('messages.emptyInbox')}
              </Text>
              <Text style={styles.emptyBody}>
                {error ? error : t('messages.emptyInboxBody')}
              </Text>
              {error ? (
                <Pressable
                  onPress={() => {
                    setLoading(true);
                    void load();
                  }}
                  style={styles.retry}
                  accessibilityRole="button"
                >
                  <Text style={styles.retryText}>{t('common.retry')}</Text>
                </Pressable>
              ) : null}
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              style={styles.row}
              onPress={() => router.push(`/messages/${item.id}`)}
              accessibilityRole="button"
              accessibilityLabel={item.organizationName ?? t('messages.title')}
            >
              <View style={styles.rowTop}>
                <Text style={styles.org} numberOfLines={1}>
                  {item.organizationName?.trim() || t('messages.organization')}
                </Text>
                <Text style={styles.time}>{formatTime(item.lastMessageAt)}</Text>
              </View>
              <View style={styles.rowBottom}>
                <Text style={styles.preview} numberOfLines={2}>
                  {messagePreview(item.lastMessagePreview ?? '', 100) || '—'}
                </Text>
                {item.unreadCount > 0 ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {item.unreadCount > 99 ? '99+' : item.unreadCount}
                    </Text>
                  </View>
                ) : null}
              </View>
            </Pressable>
          )}
        />
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.md, paddingBottom: spacing.huge, flexGrow: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  muted: {
    fontFamily: typography.fonts.regular,
    fontSize: 13,
    color: colors.textSecondary,
  },
  empty: { padding: spacing.xl, alignItems: 'center' },
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
    marginTop: spacing.sm,
  },
  retry: {
    marginTop: spacing.md,
    backgroundColor: colors.teal,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  retryText: {
    fontFamily: typography.fonts.semibold,
    fontSize: 14,
    color: colors.white,
  },
  row: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  org: {
    fontFamily: typography.fonts.semibold,
    fontSize: 15,
    color: colors.navy,
    flex: 1,
  },
  time: {
    fontFamily: typography.fonts.regular,
    fontSize: 11,
    color: colors.textSecondary,
  },
  rowBottom: { marginTop: spacing.xs, flexDirection: 'row', gap: spacing.sm },
  preview: {
    fontFamily: typography.fonts.regular,
    fontSize: 13,
    color: colors.textSecondary,
    flex: 1,
  },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    fontFamily: typography.fonts.bold,
    fontSize: 10,
    color: colors.white,
  },
});
