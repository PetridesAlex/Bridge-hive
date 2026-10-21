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

import { colors, motion, radii, shadows, spacing, typography } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/useReducedMotion';

type Stat = {
  label: string;
  value: string;
};

type Props = {
  eyebrow: string;
  title: string;
  body?: string;
  actionLabel: string;
  onAction: () => void;
  onPressCard?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  variant?: 'light' | 'emphasis';
  /** Live marketplace / workday indicator with subtle pulse. */
  live?: boolean;
  liveLabel?: string;
  /** Compact stats under the body (counts, role, window). */
  stats?: Stat[];
};

/**
 * Home “next action” — notification-style, minimal, with a living background.
 */
export function ContextualActionCard({
  eyebrow,
  title,
  body,
  actionLabel,
  onAction,
  onPressCard,
  icon = 'flash-outline',
  variant = 'light',
  live = false,
  liveLabel = 'Live',
  stats,
}: Props) {
  const emphasis = variant === 'emphasis';
  const reduced = useReducedMotion();
  const enter = useSharedValue(reduced ? 1 : 0);
  const sheen = useSharedValue(0);
  const glow = useSharedValue(0);
  const pulse = useSharedValue(1);
  const press = useSharedValue(1);

  useEffect(() => {
    if (reduced) {
      enter.value = 1;
      return;
    }
    enter.value = withTiming(1, {
      duration: motion.duration.slow,
      easing: Easing.out(Easing.cubic),
    });
  }, [enter, reduced]);

  useEffect(() => {
    if (reduced) {
      sheen.value = 0.45;
      glow.value = 0.5;
      return;
    }
    sheen.value = withRepeat(
      withTiming(1, { duration: 4800, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
    glow.value = withRepeat(
      withTiming(1, { duration: 3600, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [glow, reduced, sheen]);

  useEffect(() => {
    if (!live || reduced) {
      pulse.value = 1;
      return;
    }
    pulse.value = withRepeat(
      withTiming(1.12, {
        duration: motion.duration.slow * 4,
        easing: Easing.inOut(Easing.quad),
      }),
      -1,
      true,
    );
  }, [live, pulse, reduced]);

  const cardAnim = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [
      { translateY: (1 - enter.value) * 8 },
      { scale: press.value },
    ],
  }));

  const sheenStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(sheen.value, [0, 1], [-120, 280]) }],
    opacity: emphasis ? 0.35 : 0.55,
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(glow.value, [0, 1], [0.25, 0.55]),
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: interpolate(pulse.value, [1, 1.12], [0.9, 0.45]),
  }));

  const handlePress = () => {
    (onPressCard ?? onAction)();
  };

  return (
    <Animated.View style={cardAnim}>
      <Pressable
        onPress={handlePress}
        onPressIn={() => {
          if (!reduced) press.value = withSpring(0.985, { damping: 18, stiffness: 380 });
        }}
        onPressOut={() => {
          if (!reduced) press.value = withSpring(1, { damping: 14, stiffness: 260 });
        }}
        accessibilityRole="button"
        accessibilityLabel={`${eyebrow}. ${title}. ${actionLabel}`}
        style={[styles.card, emphasis && styles.cardEmphasis]}
      >
        {emphasis ? (
          <LinearGradient
            colors={['#08253C', '#0B3A4F', '#0E6670']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
        ) : (
          <LinearGradient
            colors={['#F2FBFC', '#FFFFFF', '#EEF6FA']}
            locations={[0, 0.45, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
        )}

        <Animated.View style={[styles.glowBlob, glowStyle]} pointerEvents="none">
          <LinearGradient
            colors={
              emphasis
                ? ['rgba(245, 197, 66, 0.28)', 'transparent']
                : ['rgba(20, 169, 181, 0.22)', 'rgba(11, 42, 67, 0.06)', 'transparent']
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        <Animated.View style={[styles.sheen, sheenStyle]} pointerEvents="none">
          <LinearGradient
            colors={[
              'transparent',
              emphasis ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.9)',
              'transparent',
            ]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        <View style={[styles.rail, emphasis && styles.railEmphasis]} />

        <View style={styles.row}>
          <View style={styles.iconStack}>
            {live ? <Animated.View style={[styles.liveRing, pulseStyle]} /> : null}
            <LinearGradient
              colors={
                emphasis
                  ? ['rgba(255,255,255,0.22)', 'rgba(255,255,255,0.08)']
                  : [colors.navy, colors.tealStrong]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.icon}
            >
              <Ionicons
                name={icon}
                size={18}
                color={emphasis ? colors.yellow : colors.white}
              />
            </LinearGradient>
          </View>

          <View style={styles.copy}>
            <View style={styles.metaRow}>
              <Text
                style={[styles.eyebrow, emphasis && styles.eyebrowOnDark]}
                numberOfLines={1}
              >
                {eyebrow}
              </Text>
              {live ? (
                <View style={[styles.livePill, emphasis && styles.livePillOnDark]}>
                  <View style={[styles.liveDot, emphasis && styles.liveDotOnDark]} />
                  <Text style={[styles.liveText, emphasis && styles.liveTextOnDark]}>
                    {liveLabel}
                  </Text>
                </View>
              ) : null}
            </View>

            <Text style={[styles.title, emphasis && styles.titleOnDark]} numberOfLines={1}>
              {title}
            </Text>

            {body ? (
              <Text style={[styles.body, emphasis && styles.bodyOnDark]} numberOfLines={1}>
                {body}
              </Text>
            ) : null}

            {stats && stats.length > 0 ? (
              <View style={styles.statsRow}>
                {stats.map((stat) => (
                  <View
                    key={stat.label}
                    style={[styles.statChip, emphasis && styles.statChipOnDark]}
                  >
                    <Text style={[styles.statValue, emphasis && styles.statValueOnDark]}>
                      {stat.value}
                    </Text>
                    <Text style={[styles.statLabel, emphasis && styles.statLabelOnDark]}>
                      {stat.label}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>

          <View style={[styles.chevron, emphasis && styles.chevronOnDark]}>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={emphasis ? colors.yellow : colors.navy}
            />
          </View>
        </View>

        <Text style={[styles.actionHint, emphasis && styles.actionHintOnDark]} numberOfLines={1}>
          {actionLabel}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: 'rgba(20, 169, 181, 0.22)',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    paddingLeft: spacing.md + 4,
    gap: spacing.xs,
    overflow: 'hidden',
    position: 'relative',
    ...shadows.sm,
  },
  cardEmphasis: {
    borderColor: 'rgba(245, 197, 66, 0.28)',
  },
  glowBlob: {
    position: 'absolute',
    top: -36,
    right: -20,
    width: 160,
    height: 120,
    borderRadius: 80,
  },
  sheen: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 72,
  },
  rail: {
    position: 'absolute',
    left: 0,
    top: 10,
    bottom: 10,
    width: 3,
    borderRadius: 2,
    backgroundColor: colors.tealStrong,
  },
  railEmphasis: {
    backgroundColor: colors.yellow,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconStack: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveRing: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.tealStrong,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  eyebrow: {
    fontFamily: typography.fonts.semibold,
    fontSize: 10,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    color: colors.tealStrong,
  },
  eyebrowOnDark: {
    color: 'rgba(255,255,255,0.72)',
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radii.full,
    backgroundColor: 'rgba(20, 169, 181, 0.12)',
  },
  livePillOnDark: {
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.tealStrong,
  },
  liveDotOnDark: {
    backgroundColor: colors.yellow,
  },
  liveText: {
    fontFamily: typography.fonts.semibold,
    fontSize: 10,
    color: colors.tealStrong,
  },
  liveTextOnDark: {
    color: colors.white,
  },
  title: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 16,
    lineHeight: 21,
    letterSpacing: -0.2,
    color: colors.navy,
  },
  titleOnDark: {
    color: colors.white,
  },
  body: {
    fontFamily: typography.fonts.regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textSecondary,
  },
  bodyOnDark: {
    color: 'rgba(255,255,255,0.7)',
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.full,
    backgroundColor: 'rgba(11, 42, 67, 0.06)',
  },
  statChipOnDark: {
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  statValue: {
    fontFamily: typography.fonts.semibold,
    fontSize: 11,
    color: colors.navy,
  },
  statValueOnDark: {
    color: colors.white,
  },
  statLabel: {
    fontFamily: typography.fonts.medium,
    fontSize: 10,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  statLabelOnDark: {
    color: 'rgba(255,255,255,0.65)',
  },
  chevron: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(11, 42, 67, 0.06)',
  },
  chevronOnDark: {
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  actionHint: {
    marginLeft: 52,
    fontFamily: typography.fonts.semibold,
    fontSize: 11,
    letterSpacing: 0.2,
    color: colors.tealStrong,
  },
  actionHintOnDark: {
    color: colors.yellow,
  },
});
