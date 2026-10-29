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
  /** `emphasis` = action required (honey icon), `light` = informational (navy icon). */
  variant?: 'light' | 'emphasis';
  /** Live marketplace / workday indicator with subtle pulse. */
  live?: boolean;
  liveLabel?: string;
  /** Compact stats under the body (counts, role, window). */
  stats?: Stat[];
};

const HONEY_GRADIENT: [string, string] = ['#FFD25A', '#F08C00'];

/**
 * Home “next action” — background-free: no card fill, border or shadow.
 * Icon tile, copy and a navy action pill sit directly on the screen.
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
  const pulse = useSharedValue(1);
  const press = useSharedValue(1);
  const nudge = useSharedValue(0);

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
    if (!live || reduced) {
      pulse.value = 1;
      return;
    }
    pulse.value = withRepeat(
      withTiming(1.18, {
        duration: motion.duration.slow * 4,
        easing: Easing.inOut(Easing.quad),
      }),
      -1,
      true,
    );
  }, [live, pulse, reduced]);

  useEffect(() => {
    if (reduced) {
      nudge.value = 0;
      return;
    }
    nudge.value = withRepeat(
      withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [nudge, reduced]);

  const cardAnim = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [{ translateY: (1 - enter.value) * 8 }, { scale: press.value }],
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: interpolate(pulse.value, [1, 1.18], [0.8, 0]),
  }));

  const arrowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(nudge.value, [0, 1], [0, 3]) }],
  }));

  const handlePress = () => {
    (onPressCard ?? onAction)();
  };

  const ringColor = emphasis ? colors.yellow : colors.tealStrong;

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
        style={styles.card}
      >
        <View style={styles.row}>
          <View style={styles.iconStack}>
            {live ? (
              <Animated.View
                style={[styles.liveRing, { borderColor: ringColor }, pulseStyle]}
              />
            ) : null}
            <LinearGradient
              colors={emphasis ? HONEY_GRADIENT : [colors.navy, colors.tealStrong]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.icon}
            >
              <Ionicons
                name={icon}
                size={22}
                color={emphasis ? colors.navy : colors.white}
              />
            </LinearGradient>
          </View>

          <View style={styles.copy}>
            <View style={styles.metaRow}>
              <Text style={styles.eyebrow} numberOfLines={1}>
                {eyebrow}
              </Text>
              {live ? (
                <View style={[styles.livePill, emphasis && styles.livePillEmphasis]}>
                  <View style={[styles.liveDot, emphasis && styles.liveDotEmphasis]} />
                  <Text style={[styles.liveText, emphasis && styles.liveTextEmphasis]}>
                    {liveLabel}
                  </Text>
                </View>
              ) : null}
            </View>

            <Text style={styles.title} numberOfLines={2}>
              {title}
            </Text>

            {body ? (
              <Text style={styles.body} numberOfLines={2}>
                {body}
              </Text>
            ) : null}

            {stats && stats.length > 0 ? (
              <View style={styles.statsRow}>
                {stats.map((stat) => (
                  <View key={stat.label} style={styles.statChip}>
                    <Text style={styles.statValue}>{stat.value}</Text>
                    <Text style={styles.statLabel}>{stat.label}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            <View style={styles.action}>
              <Text style={styles.actionText} numberOfLines={1}>
                {actionLabel}
              </Text>
              <Animated.View style={[styles.actionArrow, arrowStyle]}>
                <Ionicons name="arrow-forward" size={13} color={colors.navy} />
              </Animated.View>
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingVertical: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  iconStack: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveRing: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  eyebrow: {
    fontFamily: typography.fonts.bold,
    fontSize: 10.5,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.tealStrong,
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.full,
    backgroundColor: colors.tealSoft,
  },
  livePillEmphasis: {
    backgroundColor: '#FFF5D6',
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.tealStrong,
  },
  liveDotEmphasis: {
    backgroundColor: colors.honeyStrong,
  },
  liveText: {
    fontFamily: typography.fonts.semibold,
    fontSize: 10,
    color: colors.tealStrong,
  },
  liveTextEmphasis: {
    color: colors.honeyStrong,
  },
  title: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 18,
    lineHeight: 23,
    letterSpacing: -0.3,
    color: colors.navy,
  },
  body: {
    fontFamily: typography.fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
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
  statValue: {
    fontFamily: typography.fonts.semibold,
    fontSize: 11,
    color: colors.navy,
  },
  statLabel: {
    fontFamily: typography.fonts.medium,
    fontSize: 10,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    marginTop: spacing.sm,
    paddingVertical: 5,
    paddingLeft: 14,
    paddingRight: 5,
    borderRadius: radii.full,
    backgroundColor: colors.navy,
  },
  actionText: {
    fontFamily: typography.fonts.semibold,
    fontSize: 13,
    color: colors.white,
  },
  actionArrow: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.yellow,
  },
});
