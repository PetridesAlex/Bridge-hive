import { router } from 'expo-router';
import React from 'react';
import { StyleSheet } from 'react-native';

import { Banner } from '@/components/ui/Banner';
import { spacing } from '@/constants/theme';
import type { BillingRestrictionSummary } from '@/lib/invoices';
import { formatMoney, formatShortDate } from '@/utils/format';

type Props = {
  summary: BillingRestrictionSummary;
};

/**
 * High-priority billing restriction banner.
 * Existing assignments remain visible — this only pauses new marketplace access.
 */
export function BillingRestrictionBanner({ summary }: Props) {
  const amount = formatMoney(summary.overdue_amount_minor);
  const due = summary.oldest_due_at
    ? ` Oldest due ${formatShortDate(summary.oldest_due_at)}.`
    : '';

  return (
    <Banner
      variant="danger"
      title="New shift access is paused"
      body={`A Bridge Hive commission invoice is overdue. Pay the outstanding invoice to restore marketplace access. Amount due: ${amount}.${due}`}
      actionLabel="View invoices"
      onAction={() => router.push('/(tabs)/invoices')}
      secondaryActionLabel="Pay now"
      onSecondaryAction={() => router.push('/(tabs)/invoices')}
      style={styles.wrap}
    />
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.md,
  },
});
