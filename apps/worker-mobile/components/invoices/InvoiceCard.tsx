import {
  dueDateCopy,
  workerInvoiceStatusLabel,
  type WorkerInvoiceStatus,
} from '@bridge-hive/domain';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MoneyAmount } from '@/components/ui/MoneyAmount';
import { StatusBadge, type StatusTone } from '@/components/ui/StatusBadge';
import { colors, radii, spacing, typography } from '@/constants/theme';
import type { WorkerInvoiceListItem } from '@/lib/invoices';
import { formatShortDate } from '@/utils/format';

type Props = {
  invoice: WorkerInvoiceListItem;
  onPress: () => void;
};

function toneForStatus(status: WorkerInvoiceStatus): StatusTone {
  if (status === 'past_due') return 'danger';
  if (status === 'paid') return 'success';
  if (status === 'payment_processing') return 'warning';
  if (status === 'void' || status === 'uncollectible') return 'neutral';
  return 'info';
}

function iconForStatus(status: WorkerInvoiceStatus) {
  if (status === 'past_due') return 'alert-circle' as const;
  if (status === 'paid') return 'checkmark-circle' as const;
  if (status === 'payment_processing') return 'time' as const;
  return 'document-text' as const;
}

export function InvoiceCard({ invoice, onPress }: Props) {
  const orgName =
    invoice.organizations?.display_name ??
    invoice.organizations?.legal_name ??
    'Organization';
  const shift = invoice.shift_assignments?.shifts;
  const title = shift?.title?.trim() || 'Shift';
  const status = invoice.status as WorkerInvoiceStatus;
  const pastDue = status === 'past_due';

  return (
    <Pressable
      onPress={onPress}
      style={[styles.card, pastDue && styles.cardPastDue]}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${workerInvoiceStatusLabel(status)}`}
    >
      <View style={styles.row}>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        <MoneyAmount
          amountMinor={invoice.commission_amount_minor}
          currency={invoice.currency}
          emphasize
        />
      </View>
      <Text style={styles.meta} numberOfLines={2}>
        {orgName}
      </Text>
      {shift?.starts_at ? (
        <Text style={styles.meta}>Shift · {formatShortDate(shift.starts_at)}</Text>
      ) : null}
      <View style={styles.footer}>
        <StatusBadge
          label={workerInvoiceStatusLabel(status)}
          tone={toneForStatus(status)}
          icon={iconForStatus(status)}
        />
        <Text style={[styles.due, pastDue ? styles.dueOverdue : null]}>
          {dueDateCopy(invoice.due_at)}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    gap: 4,
  },
  cardPastDue: {
    borderColor: colors.error,
    backgroundColor: colors.errorLight,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  title: {
    fontFamily: typography.fonts.semibold,
    fontSize: 15,
    color: colors.text,
    flex: 1,
  },
  meta: {
    fontFamily: typography.fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
  },
  footer: {
    marginTop: spacing.xs,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  due: {
    fontFamily: typography.fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
    flexShrink: 1,
    textAlign: 'right',
  },
  dueOverdue: {
    color: colors.error,
    fontFamily: typography.fonts.semibold,
  },
});
