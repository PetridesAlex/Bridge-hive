import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Button } from '@/components/ui/Button';
import { actionGradient, colors, motion, radii, spacing, typography } from '@/constants/theme';
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
 * Single most-important next action on Home.
 * Prefer one of these over duplicated Browse CTAs.
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
  const iconPulse = useSharedValue(1);

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
      iconPulse.value = 1;
      return;
    }
    iconPulse.value = withRepeat(
      withTiming(1.08, {
        duration: motion.duration.slow * 5,
        easing: Easing.inOut(Easing.quad),
      }),
      -1,
      true,
    );
  }, [iconPulse, live, reduced]);

  const cardAnim = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [{ translateY: (1 - enter.value) * 10 }],
  }));

  const iconAnim = useAnimatedStyle(() => ({
    transform: [{ scale: iconPulse.value }],
  }));

  const content = (
    <>
      <View style={[styles.accent, emphasis && styles.accentOnDark]} />
      {emphasis ? (
        <LinearGradient
          colors={[...actionGradient]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      ) : (
        <LinearGradient
          colors={['rgba(22,166,182,0.08)', 'rgba(255,255,255,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      )}

      <View style={styles.topRow}>
        <Animated.View
          style={[
            styles.iconWrap,
            emphasis && styles.iconWrapOnDark,
            iconAnim,
          ]}
        >
          <Ionicons name={icon} size={22} color={emphasis ? colors.white : colors.tealStrong} />
        </Animated.View>
        <View style={styles.topCopy}>
          <Text style={[styles.eyebrow, emphasis && styles.eyebrowOnDark]}>{eyebrow}</Text>
          {live ? (
            <View style={[styles.livePill, emphasis && styles.livePillOnDark]}>
              <View style={[styles.liveDot, emphasis && styles.liveDotOnDark]} />
              <Text style={[styles.liveText, emphasis && styles.liveTextOnDark]}>{liveLabel}</Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.copy}>
        <Text style={[styles.title, emphasis && styles.titleOnDark]}>{title}</Text>
        {body ? (
          <Text style={[styles.body, emphasis && styles.bodyOnDark]} numberOfLines={3}>
            {body}
          </Text>
        ) : null}
      </View>

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

      <Button
        label={actionLabel}
        variant={emphasis ? 'secondary' : 'primary'}
        size="sm"
        onPress={onAction}
      />
    </>
  );

  const cardStyle = [styles.card, emphasis && styles.cardEmphasis];

  if (onPressCard) {
    return (
      <Animated.View style={cardAnim}>
        <Pressable
          style={cardStyle}
          onPress={onPressCard}
          accessibilityRole="button"
          accessibilityLabel={title}
        >
          {content}
        </Pressable>
      </Animated.View>
    );
  }

  return <Animated.View style={[...cardStyle, cardAnim]}>{content}</Animated.View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
    overflow: 'hidden',
  },
  cardEmphasis: {
    backgroundColor: colors.navy,
    borderColor: colors.navySoft,
  },
  accent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: colors.teal,
    zIndex: 1,
  },
  accentOnDark: {
    backgroundColor: colors.yellow,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  topCopy: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    minWidth: 0,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: colors.tealSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapOnDark: {
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  copy: { gap: 6 },
  eyebrow: {
    fontFamily: typography.fonts.semibold,
    fontSize: 11,
    color: colors.tealStrong,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  eyebrowOnDark: {
    color: colors.tealSoft,
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.full,
    backgroundColor: colors.tealSoft,
  },
  livePillOnDark: {
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.tealStrong,
  },
  liveDotOnDark: {
    backgroundColor: colors.yellow,
  },
  liveText: {
    fontFamily: typography.fonts.semibold,
    fontSize: 11,
    color: colors.tealStrong,
    letterSpacing: 0.2,
  },
  liveTextOnDark: {
    color: colors.white,
  },
  title: {
    fontFamily: typography.fonts.display,
    fontSize: 18,
    lineHeight: 24,
    color: colors.text,
  },
  titleOnDark: {
    color: colors.white,
  },
  body: {
    fontFamily: typography.fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  bodyOnDark: {
    color: 'rgba(255,255,255,0.75)',
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statChip: {
    minWidth: 88,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceSubdued,
    gap: 2,
  },
  statChipOnDark: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  statValue: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 16,
    color: colors.navy,
  },
  statValueOnDark: {
    color: colors.white,
  },
  statLabel: {
    fontFamily: typography.fonts.medium,
    fontSize: 11,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  statLabelOnDark: {
    color: 'rgba(255,255,255,0.65)',
  },
});
