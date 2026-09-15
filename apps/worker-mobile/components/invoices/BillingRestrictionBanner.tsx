import { BILLING_RESTRICTED_BANNER } from '@bridge-hive/domain';
import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { colors, spacing, typography } from '@/constants/theme';
import type { BillingRestrictionSummary } from '@/lib/invoices';
import { formatMoney, formatShortDate } from '@/utils/format';

type Props = {
  summary: BillingRestrictionSummary;
};

export function BillingRestrictionBanner({ summary }: Props) {
  return (
    <View style={styles.banner} accessibilityRole="alert">
      <Text style={styles.title}>{BILLING_RESTRICTED_BANNER}</Text>
      <Text style={styles.body}>
        Amount due: {formatMoney(summary.overdue_amount_minor)}
        {summary.oldest_due_at
          ? ` · Oldest due ${formatShortDate(summary.oldest_due_at)}`
          : ''}
      </Text>
      <View style={styles.actions}>
        <Button
          label="View invoices"
          variant="secondary"
          size="sm"
          onPress={() => router.push('/(tabs)/invoices')}
        />
        <Button
          label="Pay now"
          variant="brand"
          size="sm"
          onPress={() => router.push('/(tabs)/invoices')}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.warningLight,
    borderRadius: 12,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  title: {
    fontFamily: typography.fonts.semibold,
    fontSize: 14,
    color: colors.navy,
  },
  body: {
    fontFamily: typography.fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
  },
  actions: {
    gap: spacing.sm,
  },
});
