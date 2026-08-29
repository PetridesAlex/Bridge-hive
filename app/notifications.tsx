import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { NotificationRow } from '@/components/notifications/NotificationRow';
import { AppScreen } from '@/components/ui/AppScreen';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { colors, radii, spacing, typography } from '@/constants/theme';
import { useNotificationStore } from '@/store/notificationStore';

export default function NotificationsScreen() {
  const router = useRouter();
  const notifications = useNotificationStore((s) => s.notifications);
  const markRead = useNotificationStore((s) => s.markRead);
  const markAllRead = useNotificationStore((s) => s.markAllRead);

  return (
    <AppScreen>
      <ScreenHeader
        title="Notifications"
        showBack
        subtitle="Inbox"
        right={
          <Pressable
            onPress={markAllRead}
            hitSlop={8}
            accessibilityRole="button"
            style={styles.markAllBtn}
          >
            <Text style={styles.markAll}>Mark all read</Text>
          </Pressable>
        }
      />

      {notifications.length === 0 ? (
        <EmptyState title="No notifications" icon="notifications-outline" />
      ) : (
        notifications.map((notification) => (
          <NotificationRow
            key={notification.id}
            notification={notification}
            onPress={() => {
              markRead(notification.id);
              if (notification.relatedId?.startsWith('shift_')) {
                router.push(`/shifts/${notification.relatedId}`);
              } else if (notification.relatedId?.startsWith('doc_')) {
                router.push('/documents');
              }
            }}
          />
        ))
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  markAllBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    backgroundColor: colors.blueLight,
  },
  markAll: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.size.sm,
    color: colors.blue,
  },
});
