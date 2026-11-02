import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { colors, motion, radii, spacing, typography } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/useReducedMotion';

type Props = {
  title: string;
  description?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  actionLabel?: string;
  onAction?: () => void;
  /** Trailing/leading action icon — use `refresh` for reload CTAs. */
  actionIcon?: keyof typeof Ionicons.glyphMap;
  /** Shows busy state and spins refresh icons. */
  actionLoading?: boolean;
};

export function EmptyState({
  title,
  description,
  icon = 'file-tray-outline',
  actionLabel,
  onAction,
  actionIcon,
  actionLoading = false,
}: Props) {
  return (
    <View style={styles.wrap} accessibilityRole="summary">
      <View style={styles.iconWrap}>
        <LinearGradient
          colors={['rgba(11,42,67,0.08)', 'rgba(22,166,182,0.12)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Ionicons name={icon} size={22} color={colors.navy} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
      {actionLabel && onAction ? (
        <EmptyActionButton
          label={actionLabel}
          onPress={onAction}
          icon={actionIcon}
          loading={actionLoading}
        />
      ) : null}
    </View>
  );
}

function EmptyActionButton({
  label,
  onPress,
  icon,
  loading,
}: {
  label: string;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  loading: boolean;
}) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  const nudge = useSharedValue(0);
  const spin = useSharedValue(0);
  const sheen = useSharedValue(reduced ? 1 : 0);
  const isRefresh = icon === 'refresh' || icon === 'refresh-outline';
  const isDisabled = loading;

  useEffect(() => {
    if (reduced) {
      sheen.value = 1;
      return;
    }
    sheen.value = withTiming(1, {
      duration: motion.duration.slow,
      easing: Easing.out(Easing.cubic),
    });
  }, [reduced, sheen]);

  useEffect(() => {
    if (!loading || !isRefresh || reduced) {
      spin.value = 0;
      return;
    }
    spin.value = 0;
    spin.value = withRepeat(
      withTiming(1, { duration: 900, easing: Easing.linear }),
      -1,
      false,
    );
  }, [isRefresh, loading, reduced, spin]);

  const motionStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const iconStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: isRefresh ? 0 : nudge.value },
      { rotate: `${interpolate(spin.value, [0, 1], [0, 360])}deg` },
    ],
  }));

  const sheenStyle = useAnimatedStyle(() => ({
    opacity: interpolate(sheen.value, [0, 1], [0, 1]),
  }));

  return (
    <Animated.View style={[styles.actionWrap, motionStyle]}>
      <Pressable
        onPress={onPress}
        disabled={isDisabled}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: isDisabled, busy: loading }}
        onPressIn={() => {
          if (reduced || isDisabled) return;
          scale.value = withSpring(0.97, { damping: 18, stiffness: 420 });
          if (!isRefresh) nudge.value = withSpring(4, { damping: 14, stiffness: 320 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 14, stiffness: 260 });
          nudge.value = withSpring(0, { damping: 14, stiffness: 260 });
        }}
        style={[styles.action, isDisabled && styles.actionDisabled]}
      >
        <LinearGradient
          pointerEvents="none"
          colors={[colors.navy, '#0C3E56', colors.tealStrong]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Animated.View pointerEvents="none" style={[styles.actionSheen, sheenStyle]} />

        {icon ? (
          <Animated.View style={[styles.actionIcon, iconStyle]}>
            <Ionicons name={icon} size={15} color={colors.navy} />
          </Animated.View>
        ) : null}

        <Text style={styles.actionLabel}>{label}</Text>

        {!icon ? (
          <Animated.View style={[styles.actionIcon, iconStyle]}>
            <Ionicons name="arrow-forward" size={14} color={colors.navy} />
          </Animated.View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: colors.surfaceSubdued,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
    overflow: 'hidden',
  },
  title: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: -0.2,
    color: colors.navy,
    textAlign: 'center',
  },
  description: {
    fontFamily: typography.fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 360,
  },
  actionWrap: {
    marginTop: spacing.md,
  },
  action: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingLeft: 12,
    paddingRight: 18,
    borderRadius: radii.full,
    overflow: 'hidden',
  },
  actionDisabled: {
    opacity: 0.72,
  },
  actionSheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '48%',
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
  },
  actionIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.yellow,
  },
  actionLabel: {
    fontFamily: typography.fonts.semibold,
    fontSize: 14,
    letterSpacing: -0.1,
    color: colors.white,
  },
});
