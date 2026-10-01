import React, { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { colors, motion, radii, spacing } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/useReducedMotion';

type SkeletonProps = {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
};

export function Skeleton({
  width = '100%',
  height = 16,
  borderRadius = radii.sm,
  style,
}: SkeletonProps) {
  const reduced = useReducedMotion();
  const opacity = useSharedValue(0.55);

  useEffect(() => {
    if (reduced) {
      opacity.value = 0.7;
      return;
    }
    opacity.value = withRepeat(
      withTiming(1, { duration: motion.duration.slow * 5, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [opacity, reduced]);

  const anim = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[styles.base, { width, height, borderRadius }, anim, style]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}

type SkeletonCardProps = {
  lines?: number;
  style?: StyleProp<ViewStyle>;
};

/** Content-shaped loading placeholder for list cards. */
export function SkeletonCard({ lines = 3, style }: SkeletonCardProps) {
  return (
    <View style={[styles.card, style]} accessibilityLabel="Loading">
      <Skeleton width="40%" height={12} />
      <Skeleton width="75%" height={18} style={{ marginTop: spacing.sm }} />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          width={i === lines - 1 ? '55%' : '90%'}
          height={12}
          style={{ marginTop: spacing.sm }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.surfaceSubdued,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
});
