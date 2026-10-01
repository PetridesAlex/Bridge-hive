import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { StatusBadge } from '@/components/ui/StatusBadge';
import { WORKER_ROLE_LABELS } from '@/constants/config';
import { colors, spacing, shiftStatusStyles, typography } from '@/constants/theme';
import type { Shift } from '@/lib/queries';
import {
  formatDayLabel,
  formatMoney,
  formatTimeRange,
  isoDateFromTimestamp,
} from '@/utils/format';

type Props = {
  shift: Shift;
  organizationName?: string;
  locationName?: string;
  onPress?: () => void;
};

/** Compact scheduling list row — date tile, hierarchy, trailing rate/chevron. */
export function ShiftCard({
  shift,
  organizationName,
  locationName,
  onPress,
}: Props) {
  const router = useRouter();
  const roleLabel =
    WORKER_ROLE_LABELS[shift.required_role as keyof typeof WORKER_ROLE_LABELS] ??
    shift.required_role;
  const statusStyle = shiftStatusStyles[shift.status] ?? {
    label: shift.status.replace(/_/g, ' '),
    fg: colors.info,
    bg: colors.infoLight,
    icon: 'ellipse',
  };
  const day = formatDayLabel(isoDateFromTimestamp(shift.starts_at));
  const dateObj = new Date(shift.starts_at);
  const dayNum = dateObj.getDate();

  const handlePress = () => {
    if (onPress) onPress();
    else router.push(`/shifts/${shift.id}`);
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`${shift.title?.trim() || roleLabel}, ${day}`}
    >
      <View style={styles.dateTile}>
        <Text style={styles.dayNum}>{dayNum}</Text>
        <Text style={styles.dayLabel} numberOfLines={1}>
          {day.slice(0, 3)}
        </Text>
      </View>
      <View style={styles.main}>
        <Text style={styles.title} numberOfLines={2}>
          {shift.title?.trim() || roleLabel}
        </Text>
        {organizationName ? (
          <Text style={styles.meta} numberOfLines={1}>
            {organizationName}
            {locationName ? ` · ${locationName}` : ''}
          </Text>
        ) : locationName ? (
          <Text style={styles.meta} numberOfLines={1}>
            {locationName}
          </Text>
        ) : null}
        <Text style={styles.time} numberOfLines={1}>
          {formatTimeRange(shift.starts_at, shift.ends_at)} · {roleLabel}
        </Text>
        <View style={styles.footer}>
          <StatusBadge
            label={statusStyle.label}
            tone={shift.status === 'published' ? 'info' : 'neutral'}
            icon={statusStyle.icon as never}
            pulse={shift.status === 'published'}
          />
          <Text style={styles.rate}>{formatMoney(shift.rate_minor, shift.currency)}/hr</Text>
        </View>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.card,
    minHeight: 72,
  },
  pressed: {
    backgroundColor: colors.surfaceSubdued,
  },
  dateTile: {
    width: 44,
    alignItems: 'center',
    paddingTop: 2,
  },
  dayNum: {
    fontFamily: typography.fonts.bold,
    fontSize: 18,
    color: colors.navy,
  },
  dayLabel: {
    fontFamily: typography.fonts.medium,
    fontSize: 11,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  main: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  title: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.size.lg,
    color: colors.text,
  },
  meta: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
  },
  time: {
    fontFamily: typography.fonts.medium,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: 4,
  },
  rate: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.size.sm,
    color: colors.navy,
  },
  chevron: {
    fontSize: 22,
    color: colors.textMuted,
    marginTop: 2,
  },
});
