import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radii, shadows, spacing } from '@/constants/theme';

type CardVariant = 'default' | 'subtle' | 'inverse' | 'accent' | 'emphasis';

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
  elevated?: boolean;
  /** @deprecated Prefer variant="inverse" */
  navy?: boolean;
  variant?: CardVariant;
};

/**
 * Surfaces: default page content rarely needs a card.
 * Use emphasis sparingly (next shift, urgent, money summary).
 */
export function Card({
  children,
  style,
  padded = true,
  elevated = false,
  navy = false,
  variant = 'default',
}: Props) {
  const resolved = navy ? 'inverse' : variant;
  return (
    <View
      style={[
        styles.card,
        resolved === 'subtle' && styles.subtle,
        resolved === 'inverse' && styles.inverse,
        resolved === 'accent' && styles.accent,
        resolved === 'emphasis' && styles.emphasis,
        elevated && shadows.sm,
        padded && styles.padded,
        style,
      ]}
    >
      {children}
    </View>
  );
}

/** White group with fine separators — preferred over nested cards. */
export function ListGroup({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.group, style]}>{children}</View>;
}

export function ListGroupSeparator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  subtle: {
    backgroundColor: colors.surfaceSubdued,
    borderColor: colors.border,
  },
  inverse: {
    backgroundColor: colors.navy,
    borderColor: colors.navySoft,
  },
  accent: {
    backgroundColor: colors.yellowLight,
    borderColor: colors.yellow,
  },
  emphasis: {
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  padded: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  group: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    // Align under row title: horizontal pad + icon + gap
    marginLeft: spacing.lg + 40 + spacing.md,
  },
});
