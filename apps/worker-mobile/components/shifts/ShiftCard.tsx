import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { WORKER_ROLE_LABELS } from '@/constants/config';
import { colors, spacing, typography } from '@/constants/theme';
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
  ctaLabel?: string;
  onPress?: () => void;
};

export function ShiftCard({
  shift,
  organizationName = 'Organization',
  locationName = 'Location',
  ctaLabel = 'View Shift',
  onPress,
}: Props) {
  const router = useRouter();
  const roleLabel =
    WORKER_ROLE_LABELS[shift.required_role as keyof typeof WORKER_ROLE_LABELS] ??
    shift.required_role;

  const handlePress = () => {
    if (onPress) onPress();
    else router.push(`/shifts/${shift.id}`);
  };

  return (
    <Card style={styles.card} elevated>
      <View style={styles.accentRail} />
      <View style={styles.body}>
        <View style={styles.top}>
          <View style={styles.topLeft}>
            <Text style={styles.org}>{organizationName}</Text>
            <Text style={styles.role}>{shift.title || roleLabel}</Text>
            <Text style={styles.dept}>{locationName}</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{shift.status}</Text>
          </View>
        </View>

        <Text style={styles.meta}>
          {formatDayLabel(isoDateFromTimestamp(shift.starts_at))} ·{' '}
          {formatTimeRange(shift.starts_at, shift.ends_at)}
        </Text>

        <View style={styles.divider} />

        <View style={styles.footer}>
          <View>
            <Text style={styles.payLabel}>Hourly rate</Text>
            <Text style={styles.pay}>{formatMoney(shift.rate_minor, shift.currency)}</Text>
          </View>
          <Button
            label={ctaLabel}
            variant="dark"
            size="sm"
            fullWidth={false}
            onPress={handlePress}
          />
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { overflow: 'hidden', padding: 0 },
  accentRail: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: colors.yellow,
  },
  body: { padding: spacing.lg, gap: spacing.md },
  top: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  topLeft: { flex: 1, gap: 4 },
  org: {
    fontFamily: typography.fonts.semibold,
    fontSize: 12,
    color: colors.navyLift,
  },
  role: {
    fontFamily: typography.fonts.display,
    fontSize: 18,
    color: colors.text,
  },
  dept: {
    fontFamily: typography.fonts.regular,
    fontSize: 13,
    color: colors.textSecondary,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.blueLight,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontFamily: typography.fonts.semibold,
    fontSize: 11,
    color: colors.navyLift,
    textTransform: 'capitalize',
  },
  meta: {
    fontFamily: typography.fonts.medium,
    fontSize: 14,
    color: colors.textSecondary,
  },
  divider: { height: 1, backgroundColor: colors.border },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  payLabel: {
    fontFamily: typography.fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
  },
  pay: {
    fontFamily: typography.fonts.display,
    fontSize: 20,
    color: colors.navy,
  },
});
