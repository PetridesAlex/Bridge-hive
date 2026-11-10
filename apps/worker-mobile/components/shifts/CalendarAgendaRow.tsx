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

import { colors, radii, spacing, typography } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/useReducedMotion';

const SPRING = { damping: 16, stiffness: 280, mass: 0.8 };

type Tone = 'booked' | 'open';

type Props = {
  tone: Tone;
  eyebrow: string;
  title: string;
  subtitle: string;
  accessibilityLabel: string;
  onPress: () => void;
  /** Stagger entrance when the selected day refreshes the list. */
  enterDelay?: number;
  /** Optional trailing meta chip (e.g. pay rate). */
  metaChip?: string;
  /** Soft live pulse on the status rail / badge. */
  live?: boolean;
};

const TONE = {
  booked: {
    rail: [colors.tealStrong, '#0E7A8A'] as [string, string],
    badgeBg: 'rgba(20, 169, 181, 0.14)',
    badgeBorder: 'rgba(20, 169, 181, 0.34)',
    badgeIcon: '#0E7A8A' as const,
    icon: 'briefcase' as const,
    wash: ['rgba(20, 169, 181, 0.10)', 'rgba(20, 169, 181, 0)'] as [string, string],
    chipBg: 'rgba(20, 169, 181, 0.12)',
    chipFg: colors.tealStrong,
  },
  open: {
    rail: [colors.yellow, colors.honeyStrong] as [string, string],
    badgeBg: 'rgba(224, 170, 24, 0.14)',
    badgeBorder: 'rgba(224, 170, 24, 0.36)',
    badgeIcon: colors.navy,
    icon: 'calendar' as const,
    wash: ['rgba(245, 178, 26, 0.10)', 'rgba(245, 178, 26, 0)'] as [string, string],
    chipBg: 'rgba(11, 42, 67, 0.06)',
    chipFg: colors.navy,
  },
} as const;

/**
 * Premium day-agenda row for the shift calendar — press spring, staggered enter,
 * idle chevron nudge, and tone-specific status chrome.
 */
export function CalendarAgendaRow({
  tone,
  eyebrow,
  title,
  subtitle,
  accessibilityLabel,
  onPress,
  enterDelay = 0,
  metaChip,
  live = false,
}: Props) {
  const reduced = useReducedMotion();
  const palette = TONE[tone];
  const press = useSharedValue(1);
  const nudge = useSharedValue(0);
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (reduced) {
      nudge.value = 0;
      return;
    }
    nudge.value = withDelay(
      420 + enterDelay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: 900, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: 1600 }),
        ),
        -1,
        false,
      ),
    );
  }, [enterDelay, nudge, reduced]);

  useEffect(() => {
    if (!live || reduced) {
      pulse.value = 0;
      return;
    }
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
  }, [live, pulse, reduced]);

  const shellStyle = useAnimatedStyle(() => ({
    transform: [{ scale: press.value }],
  }));

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(nudge.value, [0, 1], [0, 4]) },
    ],
    opacity: interpolate(nudge.value, [0, 1], [0.72, 1]),
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.35, 0.9]),
    transform: [{ scaleY: interpolate(pulse.value, [0, 1], [0.92, 1]) }],
  }));

  const entering = reduced
    ? undefined
    : FadeInDown.delay(enterDelay).duration(380).springify().damping(17);

  return (
    <Animated.View entering={entering} style={shellStyle}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        onPressIn={() => {
          if (reduced) return;
          press.value = withSpring(0.985, { damping: 18, stiffness: 420 });
        }}
        onPressOut={() => {
          press.value = withSpring(1, SPRING);
        }}
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      >
        <Animated.View style={[styles.railWrap, live ? pulseStyle : null]}>
          <LinearGradient
            colors={palette.rail}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.rail}
          />
        </Animated.View>

        <LinearGradient
          pointerEvents="none"
          colors={palette.wash}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.wash}
        />

        <View
          style={[
            styles.badge,
            {
              backgroundColor: palette.badgeBg,
              borderColor: palette.badgeBorder,
            },
          ]}
        >
          <Ionicons name={palette.icon} size={18} color={palette.badgeIcon} />
        </View>

        <View style={styles.copy}>
          <View style={styles.eyebrowRow}>
            <Text style={styles.eyebrow} numberOfLines={1}>
              {eyebrow}
            </Text>
            {live ? (
              <View style={styles.livePill}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>Live</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.subtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        </View>

        <View style={styles.trailing}>
          {metaChip ? (
            <View style={[styles.metaChip, { backgroundColor: palette.chipBg }]}>
              <Text style={[styles.metaChipText, { color: palette.chipFg }]} numberOfLines={1}>
                {metaChip}
              </Text>
            </View>
          ) : null}
          <Animated.View style={[styles.chevronWrap, chevronStyle]}>
            <Ionicons name="chevron-forward" size={16} color={colors.navy} />
          </Animated.View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    minHeight: 76,
    paddingVertical: spacing.sm + 4,
    paddingRight: spacing.md,
    paddingLeft: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(11, 42, 67, 0.10)',
    overflow: 'hidden',
    shadowColor: '#0B2A43',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  rowPressed: {
    borderColor: 'rgba(20, 169, 181, 0.28)',
    backgroundColor: '#F7FBFC',
  },
  railWrap: {
    width: 5,
    alignSelf: 'stretch',
    borderRadius: 3,
    overflow: 'hidden',
    marginVertical: 2,
  },
  rail: {
    flex: 1,
    borderRadius: 3,
  },
  wash: {
    ...StyleSheet.absoluteFillObject,
    left: 10,
    right: '35%',
  },
  badge: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    flexShrink: 0,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eyebrow: {
    flexShrink: 1,
    fontFamily: typography.fonts.semibold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: colors.textSecondary,
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: 'rgba(20, 169, 181, 0.12)',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.tealStrong,
  },
  liveText: {
    fontFamily: typography.fonts.semibold,
    fontSize: 10,
    letterSpacing: 0.3,
    color: colors.tealStrong,
  },
  title: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 16,
    lineHeight: 21,
    letterSpacing: -0.2,
    color: colors.navy,
  },
  subtitle: {
    fontFamily: typography.fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  trailing: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 8,
    flexShrink: 0,
  },
  metaChip: {
    maxWidth: 92,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  metaChipText: {
    fontFamily: typography.fonts.semibold,
    fontSize: 12,
    letterSpacing: -0.1,
  },
  chevronWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(11, 42, 67, 0.06)',
  },
});
