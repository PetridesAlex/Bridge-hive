import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTabBarScrollInset } from '@/components/navigation/AnimatedTabBar';
import { spacing } from '@/constants/theme';

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Lift above the floating tab bar when this screen lives inside `(tabs)`. */
  clearTabBar?: boolean;
};

/** Safe-area sticky bottom actions — transparent shell; CTA floats on its own. */
export function StickyActionBar({ children, style, clearTabBar = false }: Props) {
  const insets = useSafeAreaInsets();
  // Clear the absolute tab strip plus the raised honeycomb FAB cradle.
  const tabInset = useTabBarScrollInset(spacing.xxl + spacing.md);
  const paddingBottom = clearTabBar
    ? tabInset
    : Math.max(insets.bottom, spacing.md);

  return (
    <View style={[styles.bar, { paddingBottom }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    backgroundColor: 'transparent',
    gap: spacing.sm,
  },
});
