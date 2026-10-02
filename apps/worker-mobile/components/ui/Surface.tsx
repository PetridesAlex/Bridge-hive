import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radii, shadows, spacing } from '@/constants/theme';

export type SurfaceVariant = 'group' | 'emphasis' | 'tinted' | 'subtle';

type Props = {
  children: React.ReactNode;
  variant?: SurfaceVariant;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
};

/**
 * Semantic surfaces — prefer group for related rows; emphasis sparingly;
 * tinted for explainers/status; avoid stacking many bordered cards.
 */
export function Surface({
  children,
  variant = 'group',
  style,
  padded = true,
}: Props) {
  return (
    <View
      style={[
        styles.base,
        variant === 'group' && styles.group,
        variant === 'emphasis' && styles.emphasis,
        variant === 'tinted' && styles.tinted,
        variant === 'subtle' && styles.subtle,
        padded && styles.padded,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  group: {
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radii.md,
  },
  emphasis: {
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 18,
    ...shadows.sm,
  },
  tinted: {
    backgroundColor: colors.tealSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  subtle: {
    backgroundColor: colors.surfaceSubdued,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  padded: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
});
