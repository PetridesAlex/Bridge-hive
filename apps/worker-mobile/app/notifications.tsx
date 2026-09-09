import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppScreen } from '@/components/ui/AppScreen';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { colors, spacing, typography } from '@/constants/theme';
import {
  getMyNotifications,
  markNotificationRead,
  type Notification,
} from '@/lib/queries';
import { useAuth } from '@/providers/AuthProvider';
import { formatRelativeDate } from '@/utils/format';

export default function NotificationsScreen() {
  const { user } = useAuth();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const refresh = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(undefined);
    const result = await getMyNotifications(user.id);
    if (result.error) setError(result.error);
    else setItems(result.data);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const onOpen = async (item: Notification) => {
    if (!item.read_at) {
      await markNotificationRead(item.id);
      void refresh();
    }
  };

  return (
    <AppScreen scroll={false} edges={['top']}>
      <ScreenHeader title="Notifications" showBack />
      {loading && items.length === 0 ? (
        <ActivityIndicator color={colors.navy} style={{ marginTop: spacing.xxxl }} />
      ) : error && items.length === 0 ? (
        <EmptyState
          title="Could not load notifications"
          description={error}
          actionLabel="Retry"
          onAction={refresh}
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
          ListEmptyComponent={
            <EmptyState
              title="No notifications"
              description="Shift and payout alerts will appear here."
            />
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => void onOpen(item)}
              style={[styles.row, !item.read_at && styles.unread]}
            >
              <View style={styles.body}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.text}>{item.body}</Text>
              </View>
              <Text style={styles.time}>{formatRelativeDate(item.created_at)}</Text>
            </Pressable>
          )}
        />
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.huge,
    gap: spacing.sm,
  },
  row: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    gap: spacing.md,
  },
  unread: {
    borderColor: colors.yellow,
    backgroundColor: colors.yellowLight,
  },
  body: { flex: 1, gap: 4 },
  title: {
    fontFamily: typography.fonts.semibold,
    fontSize: 15,
    color: colors.text,
  },
  text: {
    fontFamily: typography.fonts.regular,
    fontSize: 13,
    color: colors.textSecondary,
  },
  time: {
    fontFamily: typography.fonts.regular,
    fontSize: 11,
    color: colors.textMuted,
  },
});
