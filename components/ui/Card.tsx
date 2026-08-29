import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radii, shadows, spacing } from '@/constants/theme';

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
  elevated?: boolean;
  navy?: boolean;
};

export function Card({ children, style, padded = true, elevated = true, navy = false }: Props) {
  return (
    <View
      style={[
        styles.card,
        elevated && shadows.md,
        navy && styles.navy,
        padded && styles.padded,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  navy: {
    backgroundColor: colors.navy,
    borderColor: colors.navySoft,
  },
  padded: {
    padding: spacing.lg,
  },
});
