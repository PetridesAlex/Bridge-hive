import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { colors, spacing, typography } from '@/constants/theme';
import type { AppNotification, NotificationType } from '@/types';
import { formatRelativeDate } from '@/utils/format';

const iconMap: Record<NotificationType, keyof typeof Ionicons.glyphMap> = {
  SHIFT_AVAILABLE: 'briefcase-outline',
  URGENT_SHIFT: 'flash',
  SHIFT_CONFIRMED: 'checkmark-circle-outline',
  SHIFT_REMINDER: 'alarm-outline',
  TRANSFER_REQUEST: 'swap-horizontal-outline',
  TRANSFER_ACCEPTED: 'person-outline',
  TRANSFER_APPROVED: 'shield-checkmark-outline',
  TRANSFER_COMPLETED: 'checkmark-done-outline',
  PAYMENT: 'card-outline',
  DOCUMENT_EXPIRY: 'document-text-outline',
  COMMUNITY: 'people-outline',
  SYSTEM: 'information-circle-outline',
};

type Props = {
  notification: AppNotification;
  onPress: () => void;
};

export function NotificationRow({ notification, onPress }: Props) {
  const urgent = notification.type === 'URGENT_SHIFT' || notification.type === 'DOCUMENT_EXPIRY';
  const icon = iconMap[notification.type] ?? 'notifications-outline';

  return (
    <Pressable onPress={onPress}>
      <Card style={[styles.card, !notification.read && styles.unread]} elevated={false}>
        <View
          style={[
            styles.iconWrap,
            { backgroundColor: urgent ? colors.yellowLight : colors.blueLight },
          ]}
        >
          <Ionicons name={icon} size={18} color={urgent ? colors.navy : colors.blue} />
        </View>
        <View style={styles.content}>
          <View style={styles.top}>
            <Text style={styles.title}>{notification.title}</Text>
            <Text style={styles.time}>{formatRelativeDate(notification.createdAt)}</Text>
          </View>
          <Text style={styles.body}>{notification.body}</Text>
        </View>
        {!notification.read ? <View style={styles.dot} /> : null}
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  unread: {
    borderColor: colors.blue,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  title: {
    flex: 1,
    fontFamily: typography.fonts.semibold,
    fontSize: typography.size.md,
    color: colors.navy,
  },
  time: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.size.xs,
    color: colors.textMuted,
  },
  body: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    marginTop: 4,
    lineHeight: typography.lineHeight.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.yellow,
    marginTop: 6,
  },
});
