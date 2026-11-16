import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { colors, radii, shadows, spacing, typography } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { formatTime } from '@/utils/format';

const OPEN_BLUE = '#B7DCFF';
const OPEN_BLUE_INK = '#0C5EAE';

/** Frosted fill. Native has no backdrop blur here, so the wash stays a little denser. */
const glassCard: ViewStyle =
  Platform.OS === 'web'
    ? ({
        backgroundColor: 'rgba(255, 255, 255, 0.28)',
        backdropFilter: 'blur(18px) saturate(1.45)',
      } as ViewStyle)
    : { backgroundColor: 'rgba(255, 255, 255, 0.72)' };

type Props = {
  title: string;
  startsAt: string;
  endsAt: string;
  tone: 'booked' | 'open';
  status: string;
  place?: string | null;
  rate?: string | null;
  onPress: () => void;
};

export function DayShiftCard({
  title,
  startsAt,
  endsAt,
  tone,
  status,
  place,
  rate,
  onPress,
}: Props) {
  const booked = tone === 'booked';
  const reduced = useReducedMotion();
  const nudge = useSharedValue(0);
  const press = useSharedValue(0);

  useEffect(() => {
    if (reduced) {
      nudge.value = 0;
      return;
    }
    nudge.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 680, easing: Easing.out(Easing.cubic) }),
        withTiming(0, { duration: 680, easing: Easing.in(Easing.cubic) }),
        withTiming(0, { duration: 1500 }),
      ),
      -1,
      false,
    );
  }, [nudge, reduced]);

  const arrowStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(nudge.value, [0, 1], [0, 5]) + press.value * 3 },
    ],
  }));

  const badgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + interpolate(nudge.value, [0, 1], [0, 0.06]) + press.value * 0.08 }],
  }));

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => {
        if (!reduced) press.value = withSpring(1, { damping: 12, stiffness: 320 });
      }}
      onPressOut={() => {
        press.value = withSpring(0, { damping: 14, stiffness: 240 });
      }}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${formatTime(startsAt)} to ${formatTime(endsAt)}, ${status}`}
      style={({ pressed }) => [styles.card, glassCard, pressed && styles.pressed]}
    >
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(255,255,255,0.55)', 'rgba(255,255,255,0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.28 }}
        style={styles.sheen}
      />
      <View style={[styles.time, booked ? styles.timeBooked : styles.timeOpen]}>
        <Text style={[styles.start, !booked && styles.startOpen]}>{formatTime(startsAt)}</Text>
        <View style={[styles.timeRule, booked ? styles.timeRuleBooked : styles.timeRuleOpen]} />
        <Text style={[styles.end, !booked && styles.endOpen]}>{formatTime(endsAt)}</Text>
      </View>
      <View style={styles.copy}>
        <View style={[styles.pill, booked ? styles.pillBooked : styles.pillOpen]}>
          <View style={[styles.dot, booked ? styles.dotBooked : styles.dotOpen]} />
          <Text style={[styles.pillText, booked ? styles.pillTextBooked : styles.pillTextOpen]}>
            {status}
          </Text>
        </View>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        {place || rate ? (
          <View style={styles.meta}>
            {place ? (
              <Text style={styles.place} numberOfLines={1}>
                {place}
              </Text>
            ) : null}
            {rate ? (
              <Text style={[styles.rate, booked ? styles.rateBooked : styles.rateOpen]}>
                {rate}
              </Text>
            ) : null}
          </View>
        ) : null}
      </View>
      <Animated.View
        style={[styles.chevron, booked ? styles.chevronBooked : styles.chevronOpen, badgeStyle]}
      >
        <Animated.View style={arrowStyle}>
          <Ionicons
            name="arrow-forward"
            size={15}
            color={booked ? colors.tealStrong : OPEN_BLUE_INK}
          />
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 88,
    paddingVertical: spacing.md,
    paddingLeft: spacing.sm,
    paddingRight: spacing.md,
    overflow: 'hidden',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.82)',
    backgroundColor: 'transparent',
    ...shadows.sm,
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  sheen: {
    ...StyleSheet.absoluteFillObject,
  },
  pressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.62)',
  },
  time: {
    width: 76,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: spacing.sm,
    borderRadius: radii.lg,
  },
  timeBooked: {
    backgroundColor: colors.tealSoft,
  },
  timeOpen: {
    backgroundColor: OPEN_BLUE,
  },
  start: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 15,
    lineHeight: 18,
    letterSpacing: -0.3,
    color: colors.navy,
  },
  startOpen: {
    color: OPEN_BLUE_INK,
  },
  timeRule: {
    width: 16,
    height: 2,
    borderRadius: 1,
  },
  timeRuleBooked: {
    backgroundColor: colors.honeyStrong,
  },
  timeRuleOpen: {
    backgroundColor: OPEN_BLUE_INK,
  },
  end: {
    fontFamily: typography.fonts.medium,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textSecondary,
  },
  endOpen: {
    color: OPEN_BLUE_INK,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  pill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.full,
  },
  pillBooked: {
    backgroundColor: colors.tealSoft,
  },
  pillOpen: {
    backgroundColor: OPEN_BLUE,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotBooked: {
    backgroundColor: colors.tealStrong,
  },
  dotOpen: {
    backgroundColor: OPEN_BLUE_INK,
  },
  pillText: {
    fontFamily: typography.fonts.bold,
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  pillTextBooked: {
    color: colors.tealStrong,
  },
  pillTextOpen: {
    color: OPEN_BLUE_INK,
  },
  title: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 16,
    lineHeight: 21,
    letterSpacing: -0.25,
    color: colors.navy,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  place: {
    flexShrink: 1,
    fontFamily: typography.fonts.medium,
    fontSize: 13,
    lineHeight: 18,
    color: colors.navy,
  },
  rate: {
    flexShrink: 0,
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: -0.2,
  },
  rateBooked: {
    color: colors.tealStrong,
  },
  rateOpen: {
    color: OPEN_BLUE_INK,
  },
  chevron: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevronBooked: {
    backgroundColor: colors.tealSoft,
  },
  chevronOpen: {
    backgroundColor: OPEN_BLUE,
  },
});
