import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { StatusBadge, type StatusTone } from '@/components/ui/StatusBadge';
import { colors, radii, spacing, typography } from '@/constants/theme';
import type { Payout } from '@/lib/queries';
import { formatMoney, formatShortDate, payoutDisplayStatus } from '@/utils/format';

type Props = {
  payout: Payout;
};

function toneFor(display: string): StatusTone {
  if (display === 'paid') return 'success';
  if (display === 'issue') return 'danger';
  return 'warning';
}

export function PayoutCard({ payout }: Props) {
  const display = payoutDisplayStatus(payout.status);

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.left}>
          <Text style={styles.title}>Shift payout</Text>
          <Text style={styles.date}>{formatShortDate(payout.created_at)}</Text>
        </View>
        <StatusBadge
          label={display === 'issue' ? 'Issue' : display === 'paid' ? 'Paid' : 'Processing'}
          tone={toneFor(display)}
        />
      </View>

      <View style={styles.amounts}>
        <Amount label="Gross" value={formatMoney(payout.gross_amount_minor, payout.currency)} />
        <Amount
          label="You receive"
          value={formatMoney(payout.worker_transfer_amount_minor, payout.currency)}
          emphasize
        />
      </View>

      {display === 'issue' ? (
        <Text style={styles.note}>There is an issue with this payment. Contact support.</Text>
      ) : null}
      {payout.status === 'reported_paid' || payout.status === 'reconciliation_pending' ? (
        <Text style={styles.note}>
          Payment reported by the organization — awaiting Bridge Hive reconciliation.
        </Text>
      ) : null}
    </View>
  );
}

function Amount({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <View>
      <Text style={styles.amountLabel}>{label}</Text>
      <Text style={[styles.amountValue, emphasize && styles.amountEmphasize]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  left: { gap: 2 },
  title: {
    fontFamily: typography.fonts.semibold,
    fontSize: 15,
    color: colors.text,
  },
  date: {
    fontFamily: typography.fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
  },
  amounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  amountLabel: {
    fontFamily: typography.fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
  },
  amountValue: {
    fontFamily: typography.fonts.semibold,
    fontSize: 15,
    color: colors.text,
  },
  amountEmphasize: {
    fontFamily: typography.fonts.semibold,
    fontSize: 17,
    color: colors.navy,
  },
  note: {
    fontFamily: typography.fonts.regular,
    fontSize: 13,
    color: colors.textSecondary,
  },
});
