import React from 'react';
import { StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';

import { colors, typography } from '@/constants/theme';
import { formatMoney } from '@/utils/format';

type Props = {
  amountMinor: number;
  currency?: string;
  emphasize?: boolean;
  muted?: boolean;
  style?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
};

/** Strong hierarchy for monetary amounts. */
export function MoneyAmount({
  amountMinor,
  currency,
  emphasize = false,
  muted = false,
  style,
  accessibilityLabel,
}: Props) {
  const value = formatMoney(amountMinor, currency);
  return (
    <Text
      style={[
        styles.base,
        emphasize && styles.emphasize,
        muted && styles.muted,
        style,
      ]}
      accessibilityLabel={accessibilityLabel ?? value}
    >
      {value}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.size.md,
    color: colors.text,
  },
  emphasize: {
    fontFamily: typography.fonts.bold,
    fontSize: typography.size.lg,
  },
  muted: {
    fontFamily: typography.fonts.regular,
    color: colors.textSecondary,
  },
});
