import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, spacing, typography } from '@/constants/theme';
import { formatDate, formatTimeRange } from '@/utils/format';

type Props = {
  startsAt: string;
  endsAt?: string;
  showIcon?: boolean;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** Consistent date/time block for shift and invoice surfaces. */
export function DateTimeBlock({
  startsAt,
  endsAt,
  showIcon = true,
  compact = false,
  style,
}: Props) {
  const dateLabel = formatDate(startsAt, compact
    ? { weekday: 'short', day: 'numeric', month: 'short' }
    : undefined);
  const timeLabel = endsAt ? formatTimeRange(startsAt, endsAt) : undefined;

  return (
    <View style={[styles.wrap, style]} accessibilityRole="text">
      <View style={styles.row}>
        {showIcon ? (
          <Ionicons name="calendar-outline" size={16} color={colors.navyLift} />
        ) : null}
        <Text style={[styles.date, compact && styles.compact]}>{dateLabel}</Text>
      </View>
      {timeLabel ? (
        <View style={styles.row}>
          {showIcon ? (
            <Ionicons name="time-outline" size={16} color={colors.navyLift} />
          ) : null}
          <Text style={[styles.time, compact && styles.compact]}>{timeLabel}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  date: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.size.md,
    color: colors.text,
    flexShrink: 1,
  },
  time: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    flexShrink: 1,
  },
  compact: {
    fontSize: typography.size.sm,
  },
});
