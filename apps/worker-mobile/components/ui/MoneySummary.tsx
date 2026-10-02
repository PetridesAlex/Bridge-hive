import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { MoneyAmount } from '@/components/ui/MoneyAmount';
import { StatusBadge, type StatusTone } from '@/components/ui/StatusBadge';
import { Surface } from '@/components/ui/Surface';
import { colors, spacing, typography } from '@/constants/theme';

type Props = {
  label: string;
  amountMinor: number;
  currency?: string;
  statusLabel?: string;
  statusTone?: StatusTone;
  statusIcon?: React.ComponentProps<typeof StatusBadge>['icon'];
  context?: string;
  stateLine?: string;
  style?: StyleProp<ViewStyle>;
};

/** Emphasis block for invoice/money heroes. */
export function MoneySummary({
  label,
  amountMinor,
  currency,
  statusLabel,
  statusTone = 'info',
  statusIcon,
  context,
  stateLine,
  style,
}: Props) {
  return (
    <Surface variant="emphasis" style={[styles.wrap, style]}>
      <View style={styles.top}>
        <Text style={styles.label}>{label}</Text>
        {statusLabel ? (
          <StatusBadge label={statusLabel} tone={statusTone} icon={statusIcon} />
        ) : null}
      </View>
      <MoneyAmount
        amountMinor={amountMinor}
        currency={currency}
        emphasize
        style={styles.amount}
      />
      {context ? <Text style={styles.context}>{context}</Text> : null}
      {stateLine ? <Text style={styles.state}>{stateLine}</Text> : null}
    </Surface>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.xs,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  label: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.size.sm,
    color: colors.tealStrong,
    flex: 1,
  },
  amount: {
    fontFamily: typography.fonts.display,
    fontSize: 30,
    lineHeight: 36,
    color: colors.navy,
    marginTop: spacing.xs,
  },
  context: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  state: {
    fontFamily: typography.fonts.medium,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.navy,
    marginTop: spacing.xs,
  },
});
