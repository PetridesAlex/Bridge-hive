import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
} from 'react-native-reanimated';

import { colors, radii, spacing, typography } from '@/constants/theme';
import type { Payment, PaymentStatus } from '@/types';
import { formatCurrency } from '@/utils/format';

type Props = {
  payment: Payment;
  index?: number;
};

function splitDate(value: string) {
  const date = new Date(value);
  return {
    day: String(date.getDate()).padStart(2, '0'),
    month: date
      .toLocaleDateString('en-GB', { month: 'short' })
      .toUpperCase(),
  };
}

function statusMeta(status: PaymentStatus) {
  switch (status) {
    case 'PAID':
      return {
        label: 'Paid',
        icon: 'checkmark-circle' as const,
        tint: colors.success,
        soft: colors.successLight,
      };
    case 'PROCESSING':
      return {
        label: 'Processing',
        icon: 'time' as const,
        tint: colors.navyLift,
        soft: colors.blueLight,
      };
    case 'FAILED':
      return {
        label: 'Failed',
        icon: 'alert-circle' as const,
        tint: colors.error,
        soft: colors.errorLight,
      };
    default:
      return {
        label: 'Pending',
        icon: 'hourglass' as const,
        tint: colors.navy,
        soft: colors.yellowLight,
      };
  }
}

export function PaymentRow({ payment, index = 0 }: Props) {
  const reveal = useSharedValue(0);
  const { day, month } = useMemo(() => splitDate(payment.paidAt), [payment.paidAt]);
  const status = statusMeta(payment.status);
  const isNight = /night/i.test(payment.shiftLabel);

  useEffect(() => {
    reveal.value = withDelay(
      40 + index * 50,
      withSpring(1, { damping: 16, stiffness: 170 }),
    );
  }, [index, reveal]);

  const motion = useAnimatedStyle(() => ({
    opacity: reveal.value,
    transform: [
      { translateY: interpolate(reveal.value, [0, 1], [10, 0], Extrapolation.CLAMP) },
    ],
  }));

  return (
    <Animated.View style={[styles.card, motion]}>
      <View style={[styles.dateBlock, payment.status === 'PAID' && styles.dateBlockPaid]}>
        <Text style={[styles.day, payment.status === 'PAID' && styles.dayPaid]}>{day}</Text>
        <Text style={[styles.month, payment.status === 'PAID' && styles.monthPaid]}>{month}</Text>
      </View>

      <View style={styles.body}>
        <Text style={styles.org} numberOfLines={1}>
          {payment.organizationName}
        </Text>
        <View style={styles.metaRow}>
          <View style={[styles.shiftChip, isNight && styles.shiftChipNight]}>
            <Ionicons
              name={isNight ? 'moon' : 'sunny'}
              size={11}
              color={isNight ? colors.yellow : colors.navyLift}
            />
            <Text style={[styles.shiftText, isNight && styles.shiftTextNight]} numberOfLines={1}>
              {payment.shiftLabel}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.right}>
        <Text style={styles.amount}>
          {formatCurrency(payment.amount, payment.currency)}
        </Text>
        <View style={[styles.statusPill, { backgroundColor: status.soft }]}>
          <Ionicons name={status.icon} size={12} color={status.tint} />
          <Text style={[styles.statusLabel, { color: status.tint }]}>{status.label}</Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  dateBlock: {
    width: 52,
    borderRadius: radii.lg,
    backgroundColor: colors.navy,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  dateBlockPaid: {
    backgroundColor: colors.navy,
  },
  day: {
    fontFamily: typography.fonts.displayExtra,
    fontSize: 18,
    letterSpacing: -0.4,
    color: colors.white,
  },
  dayPaid: {
    color: colors.yellow,
  },
  month: {
    fontFamily: typography.fonts.semibold,
    fontSize: 10,
    letterSpacing: 0.6,
    color: 'rgba(255,255,255,0.65)',
  },
  monthPaid: {
    color: 'rgba(255,255,255,0.7)',
  },
  body: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  org: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 15,
    letterSpacing: -0.25,
    color: colors.navy,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  shiftChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.blueLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.full,
    maxWidth: '100%',
  },
  shiftChipNight: {
    backgroundColor: colors.navy,
  },
  shiftText: {
    fontFamily: typography.fonts.medium,
    fontSize: 11,
    color: colors.navyLift,
  },
  shiftTextNight: {
    color: colors.yellow,
  },
  right: {
    alignItems: 'flex-end',
    gap: 6,
    flexShrink: 0,
  },
  amount: {
    fontFamily: typography.fonts.displayExtra,
    fontSize: 17,
    letterSpacing: -0.4,
    color: colors.navy,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.full,
  },
  statusLabel: {
    fontFamily: typography.fonts.semibold,
    fontSize: 11,
  },
});
