import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { colors, radii, spacing, typography } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { formatDate, formatDayLabel, parseLocalDate } from '@/utils/format';

const TILE = 48;

function relativeKind(iso: string, reference = new Date()): 'today' | 'tomorrow' | null {
  const target = parseLocalDate(iso);
  const today = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate());
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86_400_000);
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'tomorrow';
  return null;
}

/** Date group header for the open-shifts list: date tile, day name, full date, shift count. */
export function ShiftDayHeader({
  iso,
  count,
  index,
}: {
  iso: string;
  count: number;
  index: number;
}) {
  const reduced = useReducedMotion();
  const date = parseLocalDate(iso);
  const kind = relativeKind(iso);
  const highlighted = kind !== null;
  const title = formatDayLabel(iso);
  const dayNumber = formatDate(date, { weekday: undefined, month: undefined, day: 'numeric' });
  const month = formatDate(date, { weekday: undefined, day: undefined, month: 'short' })
    .replace('.', '')
    .toUpperCase();
  const fullDate = formatDate(date, kind ? { weekday: 'long' } : { weekday: undefined });

  const pulse = useSharedValue(0);
  useEffect(() => {
    if (reduced || kind !== 'today') return;
    pulse.value = withRepeat(
      withTiming(1, { duration: 1400, easing: Easing.out(Easing.quad) }),
      -1,
      false,
    );
  }, [kind, pulse, reduced]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.55, 0]),
    transform: [{ scale: interpolate(pulse.value, [0, 1], [1, 2.4]) }],
  }));

  return (
    <Animated.View
      entering={
        reduced
          ? undefined
          : FadeInDown.delay(Math.min(index, 6) * 50).duration(380).springify().damping(18)
      }
      style={styles.row}
      accessibilityRole="header"
      accessibilityLabel={`${title}, ${fullDate}`}
    >
      <LinearGradient
        colors={
          highlighted
            ? ['#F4C542', '#E8B530']
            : [colors.navy, '#0C3E56', colors.tealStrong]
        }
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={styles.tile}
      >
        <Text style={[styles.tileMonth, highlighted && styles.tileMonthHighlighted]}>
          {month}
        </Text>
        <Text style={[styles.tileDay, highlighted && styles.tileDayHighlighted]}>
          {dayNumber}
        </Text>
      </LinearGradient>

      <View style={styles.copy}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {kind === 'today' ? (
            <View style={styles.liveDotWrap}>
              <Animated.View style={[styles.liveDotPulse, pulseStyle]} />
              <View style={styles.liveDot} />
            </View>
          ) : null}
        </View>
        <Text style={styles.subtitle} numberOfLines={1}>
          {fullDate}
        </Text>
      </View>

      <View style={[styles.countPill, highlighted && styles.countPillHighlighted]}>
        <Ionicons
          name="briefcase"
          size={12}
          color={highlighted ? colors.navy : colors.tealStrong}
        />
        <Text style={styles.countText}>{count}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  tile: {
    width: TILE,
    height: TILE,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.navy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 3,
  },
  tileMonth: {
    fontFamily: typography.fonts.semibold,
    fontSize: 10,
    letterSpacing: 1,
    color: 'rgba(184, 228, 234, 0.9)',
  },
  tileMonthHighlighted: {
    color: 'rgba(11, 42, 67, 0.75)',
  },
  tileDay: {
    fontFamily: typography.fonts.displayExtra,
    fontSize: 20,
    lineHeight: 22,
    color: colors.white,
    letterSpacing: -0.4,
  },
  tileDayHighlighted: {
    color: colors.navy,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: typography.size.md,
    color: colors.navy,
    letterSpacing: -0.2,
  },
  subtitle: {
    marginTop: 1,
    fontFamily: typography.fonts.medium,
    fontSize: typography.size.xs,
    color: colors.textSecondary,
  },
  liveDotWrap: {
    width: 8,
    height: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.yellow,
  },
  liveDotPulse: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.yellow,
  },
  countPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.full,
    backgroundColor: colors.tealSoft,
  },
  countPillHighlighted: {
    backgroundColor: colors.yellowLight,
  },
  countText: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.size.xs,
    color: colors.navy,
  },
});
