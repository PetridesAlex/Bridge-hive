import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
} from 'react-native-reanimated';

import { colors, radii, spacing, typography } from '@/constants/theme';
import type { Invoice, InvoiceStatus } from '@/types';
import { formatCurrency } from '@/utils/format';

type Props = {
  invoice: Invoice;
  index?: number;
};

function statusMeta(status: InvoiceStatus) {
  switch (status) {
    case 'PAID':
      return { label: 'Paid', icon: 'checkmark-circle' as const, tint: colors.success, soft: colors.successLight };
    case 'OVERDUE':
      return { label: 'Overdue', icon: 'alert-circle' as const, tint: colors.error, soft: colors.errorLight };
    case 'DRAFT':
      return { label: 'Draft', icon: 'document-outline' as const, tint: colors.textMuted, soft: colors.background };
    default:
      return { label: 'Issued', icon: 'document-text' as const, tint: colors.navyLift, soft: colors.blueLight };
  }
}

export function InvoiceCard({ invoice, index = 0 }: Props) {
  const router = useRouter();
  const status = statusMeta(invoice.status);
  const reveal = useSharedValue(0);

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
    <Animated.View style={motion}>
      <Pressable
        onPress={() => router.push(`/invoices/${invoice.id}`)}
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
        accessibilityRole="button"
      >
        <View style={styles.iconWrap}>
          <Ionicons name="receipt" size={18} color={colors.yellow} />
        </View>
        <View style={styles.info}>
          <Text style={styles.number}>{invoice.invoiceNumber}</Text>
          <Text style={styles.period}>{invoice.periodLabel}</Text>
        </View>
        <View style={styles.right}>
          <Text style={styles.amount}>
            {formatCurrency(invoice.totalAmount, invoice.currency)}
          </Text>
          <View style={[styles.statusPill, { backgroundColor: status.soft }]}>
            <Ionicons name={status.icon} size={12} color={status.tint} />
            <Text style={[styles.statusLabel, { color: status.tint }]}>{status.label}</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      </Pressable>
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
  },
  pressed: {
    opacity: 0.92,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: radii.md,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  number: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 15,
    letterSpacing: -0.25,
    color: colors.navy,
  },
  period: {
    fontFamily: typography.fonts.regular,
    fontSize: 12,
    color: colors.textSecondary,
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
