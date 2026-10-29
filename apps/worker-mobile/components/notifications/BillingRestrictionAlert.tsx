import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, shadows, spacing, typography } from '@/constants/theme';
import type { BillingRestrictionSummary } from '@/lib/invoices';
import { formatMoney, formatShortDate } from '@/utils/format';

type Props = {
  summary: BillingRestrictionSummary;
};

/**
 * "Marketplace access paused" alert for the notifications inbox.
 * Clean white card, one red accent, one primary action — no borders or gradients.
 * Only pauses new claims; existing assignments are unaffected.
 */
export function BillingRestrictionAlert({ summary }: Props) {
  const amount = formatMoney(summary.overdue_amount_minor);
  const due = summary.oldest_due_at ? `Due ${formatShortDate(summary.oldest_due_at)}` : null;

  return (
    <View
      accessibilityRole="alert"
      accessibilityLabel={`Marketplace access paused. ${amount} overdue${due ? `. ${due}` : ''}`}
      style={styles.card}
    >
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <Ionicons name="alert-circle" size={22} color={colors.error} />
        </View>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>Billing</Text>
          <Text style={styles.title}>Marketplace access paused</Text>
          <Text style={styles.amountLine}>
            <Text style={styles.amount}>{amount}</Text> overdue{due ? ` · ${due}` : ''}
          </Text>
        </View>
      </View>

      <Text style={styles.body}>
        New shift claims are paused until past-due commission is paid. Your current
        assignments are unaffected.
      </Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="View invoices"
        onPress={() => router.push('/(tabs)/invoices')}
        style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
      >
        <Text style={styles.ctaText}>View invoices</Text>
        <Ionicons name="arrow-forward" size={16} color={colors.white} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.errorLight,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  eyebrow: {
    fontFamily: typography.fonts.bold,
    fontSize: 11,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    color: colors.error,
  },
  title: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 17,
    lineHeight: 23,
    letterSpacing: -0.2,
    color: colors.navy,
  },
  amountLine: {
    fontFamily: typography.fonts.medium,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  amount: {
    fontFamily: typography.fonts.bold,
    color: colors.navy,
  },
  body: {
    fontFamily: typography.fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  cta: {
    minHeight: 46,
    borderRadius: radii.full,
    backgroundColor: colors.navy,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: spacing.lg,
  },
  ctaPressed: {
    opacity: 0.9,
  },
  ctaText: {
    fontFamily: typography.fonts.semibold,
    fontSize: 15,
    color: colors.white,
  },
});
