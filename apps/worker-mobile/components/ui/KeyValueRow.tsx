import React from 'react';
import { Platform, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, spacing, typography } from '@/constants/theme';

type Props = {
  label: string;
  value: string;
  emphasize?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** Aligned label/value row for financial and detail breakdowns. */
export function KeyValueRow({ label, value, emphasize = false, style }: Props) {
  return (
    <View style={[styles.row, style]}>
      <Text style={[styles.label, emphasize && styles.labelEmphasize]}>{label}</Text>
      <Text
        style={[styles.value, emphasize && styles.valueEmphasize]}
        numberOfLines={3}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  label: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
    color: colors.textSecondary,
    flex: 1,
  },
  labelEmphasize: {
    fontFamily: typography.fonts.semibold,
    color: colors.navy,
  },
  value: {
    fontFamily: typography.fonts.medium,
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
    color: colors.text,
    textAlign: 'right',
    flexShrink: 1,
    maxWidth: '55%',
    fontVariant: Platform.OS === 'ios' ? ['tabular-nums'] : undefined,
  },
  valueEmphasize: {
    fontFamily: typography.fonts.bold,
    color: colors.navy,
  },
});
