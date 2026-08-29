import { Ionicons } from '@expo/vector-icons';
import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
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

type Props = {
  remaining: number;
  required: number;
  compact?: boolean;
};

export function PositionsRemaining({ remaining, required, compact = false }: Props) {
  const reveal = useSharedValue(0);
  const pulse = useSharedValue(1);
  const shimmer = useSharedValue(0);
  const urgent = remaining > 0 && remaining <= 2;
  const filled = Math.max(0, required - remaining);
  const fillRatio = required > 0 ? filled / required : 0;
  const slots = Math.min(Math.max(required, 1), 6);

  useEffect(() => {
    reveal.value = withSpring(1, { damping: 15, stiffness: 160 });
    shimmer.value = withDelay(
      200,
      withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) }),
    );
    if (urgent) {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1.035, { duration: 900, easing: Easing.inOut(Easing.quad) }),
          withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        false,
      );
    } else {
      pulse.value = 1;
    }
  }, [pulse, reveal, shimmer, urgent]);

  const shellStyle = useAnimatedStyle(() => ({
    opacity: reveal.value,
    transform: [
      { translateY: interpolate(reveal.value, [0, 1], [8, 0], Extrapolation.CLAMP) },
      { scale: pulse.value },
    ],
  }));

  const barStyle = useAnimatedStyle(() => ({
    width: `${interpolate(shimmer.value, [0, 1], [0, fillRatio * 100], Extrapolation.CLAMP)}%`,
  }));

  if (remaining <= 0) return null;

  return (
    <Animated.View
      style={[styles.shell, urgent && styles.shellUrgent, compact && styles.shellCompact, shellStyle]}
    >
      <View style={styles.top}>
        <View style={[styles.iconWrap, urgent && styles.iconWrapUrgent]}>
          <Ionicons
            name={urgent ? 'flash' : 'people'}
            size={compact ? 13 : 15}
            color={urgent ? colors.navy : colors.yellow}
          />
        </View>
        <View style={styles.copy}>
          <Text style={[styles.count, urgent && styles.countUrgent]}>
            {remaining}
            <Text style={[styles.countSuffix, urgent && styles.countSuffixUrgent]}>
              {' '}
              of {required}
            </Text>
          </Text>
          <Text style={[styles.label, urgent && styles.labelUrgent]}>
            {remaining === 1 ? 'position left' : 'positions remaining'}
            {urgent ? ' · filling fast' : ''}
          </Text>
        </View>
        {urgent ? (
          <View style={styles.livePill}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>Limited</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.track}>
        <Animated.View style={[styles.fill, urgent && styles.fillUrgent, barStyle]} />
      </View>

      <View style={styles.slots}>
        {Array.from({ length: slots }, (_, index) => {
          const isOpen = index >= filled && index < filled + remaining;
          const isTaken = index < filled;
          return (
            <View
              key={`slot-${index}`}
              style={[
                styles.slot,
                isTaken && styles.slotTaken,
                isOpen && (urgent ? styles.slotOpenUrgent : styles.slotOpen),
              ]}
            />
          );
        })}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  shell: {
    backgroundColor: colors.blueLight,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    marginTop: spacing.sm,
    overflow: 'hidden',
  },
  shellCompact: {
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
  },
  shellUrgent: {
    backgroundColor: colors.yellowLight,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: radii.sm,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapUrgent: {
    backgroundColor: colors.yellow,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  count: {
    fontFamily: typography.fonts.displayExtra,
    fontSize: 18,
    letterSpacing: -0.4,
    color: colors.navy,
  },
  countUrgent: {
    color: colors.navy,
  },
  countSuffix: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 13,
    letterSpacing: -0.2,
    color: colors.navyLift,
  },
  countSuffixUrgent: {
    color: colors.navySoft,
  },
  label: {
    fontFamily: typography.fonts.medium,
    fontSize: 12,
    color: colors.textSecondary,
  },
  labelUrgent: {
    color: colors.navySoft,
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.navy,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.full,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.yellow,
  },
  liveText: {
    fontFamily: typography.fonts.semibold,
    fontSize: 10,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: colors.white,
  },
  track: {
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(7,26,47,0.08)',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: colors.navyLift,
  },
  fillUrgent: {
    backgroundColor: colors.yellow,
  },
  slots: {
    flexDirection: 'row',
    gap: 4,
  },
  slot: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(7,26,47,0.08)',
  },
  slotTaken: {
    backgroundColor: colors.navy,
  },
  slotOpen: {
    backgroundColor: colors.yellow,
  },
  slotOpenUrgent: {
    backgroundColor: colors.yellow,
  },
});
