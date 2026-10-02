import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppScreen } from '@/components/ui/AppScreen';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { colors, radii, spacing, typography } from '@/constants/theme';
import {
  getMyNotifications,
  markNotificationRead,
  type Notification,
} from '@/lib/queries';
import { useAuth } from '@/providers/AuthProvider';
import { formatRelativeDate } from '@/utils/format';

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

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

  const sections = useMemo(() => {
    const today = startOfToday().getTime();
    const todays: Notification[] = [];
    const earlier: Notification[] = [];
    for (const item of items) {
      if (new Date(item.created_at).getTime() >= today) todays.push(item);
      else earlier.push(item);
    }
    return [
      { title: 'Today', data: todays },
      { title: 'Earlier', data: earlier },
    ].filter((s) => s.data.length > 0);
  }, [items]);

  const flat = useMemo(() => {
    const rows: ({ type: 'header'; title: string } | { type: 'item'; item: Notification })[] =
      [];
    for (const section of sections) {
      rows.push({ type: 'header', title: section.title });
      for (const item of section.data) rows.push({ type: 'item', item });
    }
    return rows;
  }, [sections]);

  return (
    <AppScreen scroll={false} edges={['top']}>
      <ScreenHeader title="Notifications" showBack />
      {loading && items.length === 0 ? (
        <View style={styles.list}>
          <SkeletonCard lines={2} />
          <SkeletonCard lines={2} />
        </View>
      ) : error && items.length === 0 ? (
        <ErrorState title="Could not load notifications" onRetry={refresh} />
      ) : (
        <FlatList
          data={flat}
          keyExtractor={(row, index) =>
            row.type === 'header' ? `h-${row.title}` : row.item.id + String(index)
          }
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
          ListEmptyComponent={
            <EmptyState
              title="No notifications"
              description="Shift, verification, and payout alerts will appear here when available."
            />
          }
          renderItem={({ item: row }) => {
            if (row.type === 'header') {
              return <Text style={styles.section}>{row.title}</Text>;
            }
            const item = row.item;
            const unread = !item.read_at;
            return (
              <Pressable
                onPress={() => void onOpen(item)}
                style={[styles.row, unread && styles.unread]}
                accessibilityRole="button"
                accessibilityLabel={`${item.title}${unread ? ', unread' : ''}`}
              >
                <View style={styles.indicatorCol}>
                  <View style={[styles.dot, unread ? styles.dotUnread : styles.dotRead]} />
                </View>
                <View style={styles.body}>
                  <Text style={[styles.title, unread && styles.titleUnread]}>{item.title}</Text>
                  <Text style={styles.text} numberOfLines={3}>
                    {item.body}
                  </Text>
                </View>
                <Text style={styles.time}>{formatRelativeDate(item.created_at)}</Text>
              </Pressable>
            );
          }}
        />
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingBottom: spacing.huge,
    gap: spacing.sm,
  },
  section: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  row: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
    minHeight: 64,
  },
  unread: {
    borderLeftWidth: 3,
    borderLeftColor: colors.teal,
    backgroundColor: colors.tealSoft,
  },
  indicatorCol: {
    paddingTop: 6,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dotUnread: {
    backgroundColor: colors.navy,
  },
  dotRead: {
    backgroundColor: colors.borderStrong,
  },
  body: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  title: {
    fontFamily: typography.fonts.medium,
    fontSize: 15,
    color: colors.text,
  },
  titleUnread: {
    fontFamily: typography.fonts.semibold,
  },
  text: {
    fontFamily: typography.fonts.regular,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  time: {
    fontFamily: typography.fonts.regular,
    fontSize: 11,
    color: colors.textMuted,
  },
});
