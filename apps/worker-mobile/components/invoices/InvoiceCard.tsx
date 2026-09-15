import {
  dueDateCopy,
  workerInvoiceStatusLabel,
  type WorkerInvoiceStatus,
} from '@bridge-hive/domain';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '@/constants/theme';
import type { WorkerInvoiceListItem } from '@/lib/invoices';
import { formatMoney, formatShortDate } from '@/utils/format';

type Props = {
  invoice: WorkerInvoiceListItem;
  onPress: () => void;
};

export function InvoiceCard({ invoice, onPress }: Props) {
  const orgName =
    invoice.organizations?.display_name ??
    invoice.organizations?.legal_name ??
    'Organization';
  const shift = invoice.shift_assignments?.shifts;
  const title = shift?.title?.trim() || 'Shift';
  const status = invoice.status as WorkerInvoiceStatus;

  return (
    <Pressable onPress={onPress} style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.amount}>
          {formatMoney(invoice.commission_amount_minor, invoice.currency)}
        </Text>
      </View>
      <Text style={styles.meta}>{orgName}</Text>
      {shift?.starts_at ? (
        <Text style={styles.meta}>Shift · {formatShortDate(shift.starts_at)}</Text>
      ) : null}
      <View style={styles.footer}>
        <Text style={styles.status}>{workerInvoiceStatusLabel(status)}</Text>
        <Text style={[styles.due, status === 'past_due' ? styles.dueOverdue : null]}>
          {dueDateCopy(invoice.due_at)}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  title: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 16,
    color: colors.navy,
    flex: 1,
  },
  amount: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 16,
    color: colors.navy,
  },
  meta: {
    fontFamily: typography.fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
  },
  footer: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  status: {
    fontFamily: typography.fonts.semibold,
    fontSize: 12,
    color: colors.navy,
  },
  due: {
    fontFamily: typography.fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
  },
  dueOverdue: {
    color: colors.error,
    fontFamily: typography.fonts.semibold,
  },
});
