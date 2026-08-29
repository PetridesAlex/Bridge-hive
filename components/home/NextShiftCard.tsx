import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
} from 'react-native-reanimated';

import { OrganizationBadge } from '@/components/organizations/OrganizationBadge';
import { ShiftStatusBadge, MetaRow } from '@/components/shifts/ShiftStatusBadge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { colors, spacing, typography } from '@/constants/theme';
import type { Shift } from '@/types';
import {
  formatCurrency,
  formatDayLabel,
  formatDuration,
  formatTimeRange,
} from '@/utils/format';

type Props = {
  shift: Shift;
};

export function NextShiftCard({ shift }: Props) {
  const router = useRouter();
  const reveal = useSharedValue(0);

  useEffect(() => {
    reveal.value = withDelay(140, withSpring(1, { damping: 16, stiffness: 170 }));
  }, [reveal]);

  const motion = useAnimatedStyle(() => ({
    opacity: reveal.value,
    transform: [
      { translateY: interpolate(reveal.value, [0, 1], [12, 0], Extrapolation.CLAMP) },
    ],
  }));

  return (
    <Animated.View style={motion}>
      <Card style={styles.card}>
        <View style={styles.accent} />
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Next Shift</Text>
          <ShiftStatusBadge status={shift.status} />
        </View>
        <OrganizationBadge name={shift.organizationName} verified={shift.organizationVerified} />
        <Text style={styles.role}>{shift.professionalRoleName}</Text>
        <Text style={styles.dept}>{shift.departmentName}</Text>

        <View style={styles.meta}>
          <MetaRow
            icon="calendar-outline"
            caption="Date"
            label={formatDayLabel(shift.date)}
          />
          <MetaRow
            icon="time-outline"
            caption="Schedule"
            label={formatTimeRange(shift.startTime, shift.endTime)}
          />
          <MetaRow
            icon="hourglass-outline"
            caption="Duration"
            label={formatDuration(shift.durationHours)}
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.pay}>{formatCurrency(shift.pay, shift.currency)}</Text>
          <Button
            label="View Shift"
            variant="primary"
            size="sm"
            fullWidth={false}
            onPress={() => router.push(`/shifts/${shift.id}`)}
            style={styles.btn}
          />
        </View>
      </Card>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.lg,
    borderColor: colors.blue,
    overflow: 'hidden',
  },
  accent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: colors.blue,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  eyebrow: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.size.xs,
    color: colors.blue,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  role: {
    fontFamily: typography.fonts.medium,
    fontSize: typography.size.sm,
    color: colors.blue,
    marginTop: spacing.sm,
  },
  dept: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  meta: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  pay: {
    fontFamily: typography.fonts.bold,
    fontSize: typography.size.xxl,
    color: colors.navy,
    flexShrink: 1,
  },
  btn: {
    minWidth: 100,
    flexGrow: 0,
  },
});
