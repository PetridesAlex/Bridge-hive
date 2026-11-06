import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
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

type Tone = 'open' | 'booked' | 'today';

type ChipProps = {
  tone: Tone;
  label: string;
  count?: number;
  active?: boolean;
  enterDelay?: number;
  onPress?: () => void;
};

const TONE = {
  open: {
    dot: colors.yellow,
    soft: 'rgba(224, 170, 24, 0.14)',
    border: 'rgba(224, 170, 24, 0.34)',
    ink: colors.navy,
    activeSoft: 'rgba(224, 170, 24, 0.22)',
    activeBorder: 'rgba(224, 170, 24, 0.55)',
  },
  booked: {
    dot: colors.tealStrong,
    soft: 'rgba(20, 169, 181, 0.12)',
    border: 'rgba(20, 169, 181, 0.32)',
    ink: '#0E7A8A',
    activeSoft: 'rgba(20, 169, 181, 0.2)',
    activeBorder: 'rgba(20, 169, 181, 0.5)',
  },
  today: {
    dot: colors.yellow,
    soft: 'rgba(224, 170, 24, 0.16)',
    border: 'rgba(224, 170, 24, 0.4)',
    ink: colors.navy,
    activeSoft: 'rgba(11, 42, 67, 0.92)',
    activeBorder: 'rgba(11, 42, 67, 0.95)',
  },
} as const;

function LegendChip({
  tone,
  label,
  count,
  active = false,
  enterDelay = 0,
  onPress,
}: ChipProps) {
  const reduced = useReducedMotion();
  const press = useSharedValue(1);
  const pulse = useSharedValue(0);
  const palette = TONE[tone];
  const showCount = typeof count === 'number';

  useEffect(() => {
    if (reduced || tone !== 'today' || !active) {
      pulse.value = 0;
      return;
    }
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 1100, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
  }, [active, pulse, reduced, tone]);

  const shellStyle = useAnimatedStyle(() => ({
    transform: [{ scale: press.value }],
  }));

  const dotStyle = useAnimatedStyle(() => {
    if (tone !== 'today') {
      return {
        transform: [{ scale: 1 }],
        opacity: 1,
      };
    }
    return {
      opacity: interpolate(pulse.value, [0, 1], [0.7, 1]),
      transform: [{ scale: interpolate(pulse.value, [0, 1], [1, 1.18]) }],
    };
  });

  const entering = reduced
    ? undefined
    : FadeIn.delay(enterDelay).duration(320);

  const content = (
    <Animated.View
      entering={entering}
      style={[
        styles.chip,
        {
          backgroundColor: active ? palette.activeSoft : palette.soft,
          borderColor: active ? palette.activeBorder : palette.border,
        },
        tone === 'today' && active ? styles.chipTodayActive : null,
        shellStyle,
      ]}
    >
      <Animated.View
        style={[
          styles.dot,
          tone === 'today' ? styles.dotToday : null,
          { backgroundColor: tone === 'today' && active ? colors.yellow : palette.dot },
          dotStyle,
        ]}
      />
      <Text
        style={[
          styles.label,
          { color: tone === 'today' && active ? colors.white : palette.ink },
        ]}
      >
        {label}
      </Text>
      {showCount ? (
        <View
          style={[
            styles.countPill,
            tone === 'today' && active
              ? styles.countPillOnDark
              : { backgroundColor: 'rgba(11, 42, 67, 0.06)' },
          ]}
        >
          <Text
            style={[
              styles.countText,
              {
                color:
                  tone === 'today' && active
                    ? colors.yellow
                    : tone === 'booked'
                      ? colors.tealStrong
                      : colors.navy,
              },
            ]}
          >
            {count}
          </Text>
        </View>
      ) : null}
    </Animated.View>
  );

  if (!onPress) {
    return content;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        showCount ? `${label}, ${count}` : label
      }
      accessibilityState={{ selected: active }}
      onPress={onPress}
      onPressIn={() => {
        if (reduced) return;
        press.value = withSpring(0.96, { damping: 18, stiffness: 420 });
      }}
      onPressOut={() => {
        press.value = withSpring(1, { damping: 16, stiffness: 280 });
      }}
      hitSlop={4}
    >
      {content}
    </Pressable>
  );
}

type Props = {
  openCount: number;
  bookedCount: number;
  todayActive: boolean;
  openActive?: boolean;
  bookedActive?: boolean;
  onPressOpen?: () => void;
  onPressBooked?: () => void;
  onPressToday?: () => void;
  /** Remount key so chips re-enter when the month changes. */
  motionKey: string;
};

/**
 * Month legend under the calendar grid — live counts, tone chips, Today pulse.
 */
export function CalendarLegend({
  openCount,
  bookedCount,
  todayActive,
  openActive = false,
  bookedActive = false,
  onPressOpen,
  onPressBooked,
  onPressToday,
  motionKey,
}: Props) {
  const reduced = useReducedMotion();
  const wash = useSharedValue(reduced ? 0.5 : 0);

  useEffect(() => {
    if (reduced) {
      wash.value = 0.5;
      return;
    }
    wash.value = 0;
    wash.value = withDelay(
      80,
      withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) }),
    );
  }, [motionKey, reduced, wash]);

  const trayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(wash.value, [0, 1], [0.55, 1]),
    transform: [{ translateY: interpolate(wash.value, [0, 1], [4, 0]) }],
  }));

  return (
    <Animated.View key={motionKey} style={[styles.tray, trayStyle]}>
      <LegendChip
        tone="open"
        label="Open"
        count={openCount}
        active={openActive}
        enterDelay={40}
        onPress={onPressOpen}
      />
      <LegendChip
        tone="booked"
        label="Booked"
        count={bookedCount}
        active={bookedActive}
        enterDelay={90}
        onPress={onPressBooked}
      />
      <LegendChip
        tone="today"
        label="Today"
        active={todayActive}
        enterDelay={140}
        onPress={onPressToday}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  tray: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: radii.lg,
    backgroundColor: 'rgba(11, 42, 67, 0.035)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(11, 42, 67, 0.07)',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 32,
    paddingLeft: 8,
    paddingRight: 8,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipTodayActive: {
    shadowColor: '#0B2A43',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 2,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotToday: {
    width: 9,
    height: 9,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.55)',
  },
  label: {
    fontFamily: typography.fonts.semibold,
    fontSize: 12,
    letterSpacing: 0.1,
  },
  countPill: {
    minWidth: 20,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 999,
    alignItems: 'center',
  },
  countPillOnDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  countText: {
    fontFamily: typography.fonts.bold,
    fontSize: 11,
    letterSpacing: -0.1,
  },
});
