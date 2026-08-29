import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { colors, spacing, typography } from '@/constants/theme';
import type { Announcement } from '@/types';
import { formatShortDate } from '@/utils/format';

const categoryLabels: Record<string, string> = {
  WEEKEND_SHIFTS: 'Weekend Shifts',
  TRAINING: 'Training',
  HOSPITAL: 'Hospital',
  PLATFORM: 'Platform',
  PROFESSIONAL: 'Professional',
  DOCUMENT: 'Documents',
};

type Props = {
  announcement: Announcement;
};

export function AnnouncementCard({ announcement }: Props) {
  return (
    <Card style={styles.card}>
      <View style={styles.top}>
        <Badge
          label={categoryLabels[announcement.category] ?? announcement.category}
          color={colors.blue}
          backgroundColor={colors.blueLight}
        />
        <Text style={styles.date}>{formatShortDate(announcement.createdAt)}</Text>
      </View>
      <Text style={styles.title}>{announcement.title}</Text>
      <Text style={styles.body}>{announcement.body}</Text>
      {announcement.organizationName ? (
        <Text style={styles.org}>{announcement.organizationName}</Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  date: {
    fontFamily: typography.fonts.medium,
    fontSize: typography.size.xs,
    color: colors.textMuted,
  },
  title: {
    fontFamily: typography.fonts.bold,
    fontSize: typography.size.lg,
    color: colors.navy,
    marginBottom: spacing.xs,
  },
  body: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    lineHeight: typography.lineHeight.sm,
  },
  org: {
    marginTop: spacing.sm,
    fontFamily: typography.fonts.medium,
    fontSize: typography.size.xs,
    color: colors.blue,
  },
});
