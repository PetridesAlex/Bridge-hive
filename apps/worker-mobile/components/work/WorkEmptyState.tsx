import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import type { WorkSegmentTheme } from '@/constants/workSegments';
import { colors, radii, spacing, typography } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/useReducedMotion';

type Props = {
  theme: WorkSegmentTheme;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
};

/**
 * Segment-aware empty panel for My shifts — soft card, tone rail, idle motion.
 */
export function WorkEmptyState({
  theme,
  title,
  description,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
}: Props) {
  const reduced = useReducedMotion();
  const breath = useSharedValue(reduced ? 0.5 : 0);
  const press = useSharedValue(1);
  const nudge = useSharedValue(0);

  useEffect(() => {
    if (reduced) {
      breath.value = 0.5;
      return;
    }
    breath.value = withDelay(
      280,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 1600, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        false,
      ),
    );
  }, [breath, reduced]);

  useEffect(() => {
    if (reduced || !actionLabel) {
      nudge.value = 0;
      return;
    }
    nudge.value = withDelay(
      600,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: 900, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: 1400 }),
        ),
        -1,
        false,
      ),
    );
  }, [actionLabel, nudge, reduced]);

  const iconMotion = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(breath.value, [0, 1], [1, 1.05]) },
    ],
    opacity: interpolate(breath.value, [0, 1], [0.9, 1]),
  }));

  const haloMotion = useAnimatedStyle(() => ({
    opacity: interpolate(breath.value, [0, 1], [0.18, 0.42]),
    transform: [{ scale: interpolate(breath.value, [0, 1], [0.92, 1.08]) }],
  }));

  const ctaMotion = useAnimatedStyle(() => ({
    transform: [{ scale: press.value }],
  }));

  const chevronMotion = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(nudge.value, [0, 1], [0, 4]) }],
  }));

  const entering = reduced
    ? undefined
    : FadeInDown.delay(60).duration(420).springify().damping(17);

  return (
    <Animated.View
      entering={entering}
      accessibilityRole="summary"
      style={styles.root}
    >
      <LinearGradient
        colors={[theme.accentSoft, colors.card]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.rail, { backgroundColor: theme.accent }]} />

      <View style={styles.body}>
        <View style={styles.iconStage}>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.halo,
              { backgroundColor: theme.accent },
              haloMotion,
            ]}
          />
          <Animated.View style={[styles.iconWrap, iconMotion]}>
            <LinearGradient
              colors={theme.gradient}
              start={{ x: 0.15, y: 0 }}
              end={{ x: 0.9, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Ionicons name={theme.iconFocused} size={22} color={colors.white} />
          </Animated.View>
        </View>

        <Text style={styles.eyebrow}>{theme.shortLabel}</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>

        {actionLabel && onAction ? (
          <Animated.View style={[styles.ctaWrap, ctaMotion]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={actionLabel}
              onPress={onAction}
              onPressIn={() => {
                if (reduced) return;
                press.value = withSpring(0.97, { damping: 18, stiffness: 420 });
              }}
              onPressOut={() => {
                press.value = withSpring(1, { damping: 14, stiffness: 260 });
              }}
              style={styles.cta}
            >
              <LinearGradient
                pointerEvents="none"
                colors={[colors.navy, '#0C3E56', colors.tealStrong]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <Text style={styles.ctaLabel}>{actionLabel}</Text>
              <Animated.View style={[styles.ctaIcon, chevronMotion]}>
                <Ionicons name="arrow-forward" size={14} color={colors.navy} />
              </Animated.View>
            </Pressable>
          </Animated.View>
        ) : null}

        {secondaryLabel && onSecondary ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={secondaryLabel}
            onPress={onSecondary}
            style={styles.secondary}
          >
            <Text style={[styles.secondaryLabel, { color: theme.accent }]}>
              {secondaryLabel}
            </Text>
            <Ionicons name="chevron-forward" size={14} color={theme.accent} />
          </Pressable>
        ) : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    overflow: 'hidden',
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(11, 42, 67, 0.10)',
    minHeight: 168,
    paddingVertical: spacing.lg + 2,
    paddingHorizontal: spacing.lg,
    shadowColor: '#0B2A43',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 2,
  },
  rail: {
    position: 'absolute',
    left: 0,
    top: 14,
    bottom: 14,
    width: 4,
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3,
  },
  body: {
    alignItems: 'center',
    gap: 6,
  },
  iconStage: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  halo: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#0B2A43',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 3,
  },
  eyebrow: {
    fontFamily: typography.fonts.semibold,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.textSecondary,
  },
  title: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.3,
    color: colors.navy,
    textAlign: 'center',
  },
  description: {
    fontFamily: typography.fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 300,
    marginBottom: spacing.xs,
  },
  ctaWrap: {
    marginTop: spacing.sm,
    alignSelf: 'stretch',
    maxWidth: 320,
  },
  cta: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingLeft: 18,
    paddingRight: 12,
    borderRadius: radii.full,
    overflow: 'hidden',
  },
  ctaLabel: {
    fontFamily: typography.fonts.semibold,
    fontSize: 15,
    letterSpacing: -0.1,
    color: colors.white,
  },
  ctaIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.yellow,
  },
  secondary: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 36,
    paddingHorizontal: spacing.sm,
  },
  secondaryLabel: {
    fontFamily: typography.fonts.semibold,
    fontSize: 13,
    letterSpacing: -0.1,
  },
});
