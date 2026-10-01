import { Ionicons } from '@expo/vector-icons';
import React, { useEffect } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { colors, motion, radii, spacing, typography } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/useReducedMotion';

export type StatusTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'accent';

type Props = {
  label: string;
  tone?: StatusTone;
  icon?: keyof typeof Ionicons.glyphMap;
  /** Soft live pulse — for marketplace “Open” and similar live states only. */
  pulse?: boolean;
  style?: StyleProp<ViewStyle>;
};

const TONE: Record<StatusTone, { fg: string; bg: string }> = {
  neutral: { fg: colors.textSecondary, bg: colors.surfaceSubdued },
  info: { fg: colors.info, bg: colors.infoLight },
  success: { fg: colors.success, bg: colors.successLight },
  warning: { fg: colors.warning, bg: colors.warningLight },
  danger: { fg: colors.error, bg: colors.errorLight },
  accent: { fg: colors.tealStrong, bg: colors.tealSoft },
};

/**
 * Status meaning uses icon/label plus color — never color alone.
 */
export function StatusBadge({ label, tone = 'neutral', icon, pulse = false, style }: Props) {
  const palette = TONE[tone];
  const reduced = useReducedMotion();
  const pulseProgress = useSharedValue(1);

  useEffect(() => {
    if (!pulse || reduced) {
      pulseProgress.value = 1;
      return;
    }
    pulseProgress.value = withRepeat(
      withTiming(0.35, {
        duration: motion.duration.slow * 6,
        easing: Easing.inOut(Easing.quad),
      }),
      -1,
      true,
    );
  }, [pulse, pulseProgress, reduced]);

  const dotStyle = useAnimatedStyle(() => ({
    opacity: pulse && !reduced ? pulseProgress.value : 1,
    transform: [{ scale: pulse && !reduced ? 0.85 + pulseProgress.value * 0.15 : 1 }],
  }));

  return (
    <View
      style={[styles.badge, { backgroundColor: palette.bg }, style]}
      accessibilityRole="text"
      accessibilityLabel={label}
    >
      {pulse ? (
        <Animated.View style={[styles.dot, { backgroundColor: palette.fg }, dotStyle]} />
      ) : icon ? (
        <Ionicons name={icon} size={12} color={palette.fg} />
      ) : null}
      <Text style={[styles.text, { color: palette.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.full,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.size.xs,
    letterSpacing: 0.2,
  },
});
