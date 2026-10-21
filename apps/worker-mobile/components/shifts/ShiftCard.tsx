import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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

import { openPositionsLabel, remainingOpenPositions } from '@bridge-hive/domain';

import { StatusBadge } from '@/components/ui/StatusBadge';
import { WORKER_ROLE_LABELS } from '@/constants/config';
import { colors, radii, shadows, spacing, shiftStatusStyles, typography } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import type { MarketplaceShift, Shift } from '@/lib/queries';
import {
  formatDayLabel,
  formatMoney,
  formatTimeRange,
  isoDateFromTimestamp,
} from '@/utils/format';

type Props = {
  shift: Shift | MarketplaceShift;
  organizationName?: string;
  locationName?: string;
  onPress?: () => void;
};

/** Compact scheduling list row — date tile, hierarchy, trailing rate/chevron. */
export function ShiftCard({
  shift,
  organizationName,
  locationName,
  onPress,
}: Props) {
  const router = useRouter();
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  const nudge = useSharedValue(0);
  const idle = useSharedValue(0);
  const glow = useSharedValue(0.35);
  const roleLabel =
    WORKER_ROLE_LABELS[shift.required_role as keyof typeof WORKER_ROLE_LABELS] ??
    shift.required_role;
  const statusStyle = shiftStatusStyles[shift.status] ?? {
    label: shift.status.replace(/_/g, ' '),
    fg: colors.info,
    bg: colors.infoLight,
    icon: 'ellipse',
  };
  const day = formatDayLabel(isoDateFromTimestamp(shift.starts_at));
  const dateObj = new Date(shift.starts_at);
  const dayNum = dateObj.getDate();
  const openCount =
    'open_positions' in shift && typeof shift.open_positions === 'number'
      ? shift.open_positions
      : remainingOpenPositions(shift.required_positions ?? 1, 0);
  const positionsCopy =
    shift.status === 'published' ? openPositionsLabel(openCount) : null;
  const isOpen = shift.status === 'published';
  const marketplace =
    'location_name' in shift || 'organization_name' in shift
      ? (shift as MarketplaceShift)
      : null;
  const resolvedLocation =
    locationName ||
    [marketplace?.location_name, marketplace?.ward_name].filter(Boolean).join(' · ') ||
    undefined;
  const resolvedOrg = organizationName || marketplace?.organization_name || undefined;

  useEffect(() => {
    if (reduced) return;
    idle.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
    glow.value = withRepeat(
      withSequence(
        withTiming(0.75, { duration: 1400, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.3, { duration: 1400, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
  }, [glow, idle, reduced]);

  const motionStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const chevronStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: nudge.value + idle.value * 3 },
      { scale: 1 + idle.value * 0.04 },
    ],
  }));
  const ringStyle = useAnimatedStyle(() => ({
    opacity: glow.value,
    transform: [{ scale: interpolate(glow.value, [0.3, 0.75], [1, 1.18]) }],
  }));

  const handlePress = () => {
    if (onPress) onPress();
    else router.push(`/shifts/${shift.id}`);
  };

  return (
    <Animated.View style={motionStyle}>
      <Pressable
        onPress={handlePress}
        onPressIn={() => {
          if (reduced) return;
          scale.value = withSpring(0.985, { damping: 18, stiffness: 420 });
          nudge.value = withSpring(4, { damping: 14, stiffness: 320 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 14, stiffness: 260 });
          nudge.value = withSpring(0, { damping: 14, stiffness: 260 });
        }}
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={`${shift.title?.trim() || roleLabel}${resolvedLocation ? `, ${resolvedLocation}` : ''}, ${day}${positionsCopy ? `, ${positionsCopy}` : ''}`}
      >
        <View style={[styles.accent, isOpen ? styles.accentOpen : styles.accentMuted]} />

        <View style={[styles.dateTile, !isOpen && styles.dateTileMuted]}>
          {isOpen ? (
            <LinearGradient
              pointerEvents="none"
              colors={[colors.navy, '#0A6C78', colors.tealStrong]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          ) : null}
          <Text style={[styles.dayNum, isOpen && styles.dayNumOpen]}>{dayNum}</Text>
          <Text style={[styles.dayLabel, isOpen && styles.dayLabelOpen]} numberOfLines={1}>
            {day.slice(0, 3)}
          </Text>
        </View>

        <View style={styles.main}>
          <Text style={styles.title} numberOfLines={2}>
            {shift.title?.trim() || roleLabel}
          </Text>

          <View style={styles.locationRow}>
            <View style={styles.locationIcon}>
              <Ionicons name="location" size={12} color={colors.white} />
            </View>
            <Text style={styles.location} numberOfLines={2}>
              {resolvedLocation || 'Location not listed'}
            </Text>
          </View>

          {resolvedOrg ? (
            <View style={styles.orgRow}>
              <Ionicons name="business-outline" size={13} color={colors.textSecondary} />
              <Text style={styles.meta} numberOfLines={2}>
                {resolvedOrg}
              </Text>
            </View>
          ) : null}

          <View style={styles.factGrid}>
            <View style={styles.factChip}>
              <View style={[styles.factIcon, styles.factIconTime]}>
                <Ionicons name="time" size={12} color={colors.white} />
              </View>
              <View style={styles.factCopy}>
                <Text style={styles.factLabel}>Hours</Text>
                <Text style={styles.factValue}>
                  {formatTimeRange(shift.starts_at, shift.ends_at)}
                </Text>
              </View>
            </View>

            <View style={styles.factChip}>
              <View style={[styles.factIcon, styles.factIconRole]}>
                <Ionicons name="medkit" size={12} color={colors.white} />
              </View>
              <View style={styles.factCopy}>
                <Text style={styles.factLabel}>Role</Text>
                <Text style={styles.factValue}>{roleLabel}</Text>
              </View>
            </View>

            {positionsCopy ? (
              <View style={[styles.factChip, styles.factChipWide]}>
                <View style={[styles.factIcon, styles.factIconOpen]}>
                  <Ionicons name="people" size={12} color={colors.white} />
                </View>
                <View style={styles.factCopy}>
                  <Text style={styles.factLabel}>Availability</Text>
                  <Text style={[styles.factValue, styles.factValueOpen]}>{positionsCopy}</Text>
                </View>
              </View>
            ) : null}
          </View>

          <View style={styles.footer}>
            <StatusBadge
              label={statusStyle.label}
              tone={isOpen ? 'accent' : 'neutral'}
              icon={statusStyle.icon as never}
              pulse={isOpen}
              solid={isOpen}
            />
            <View style={styles.ratePill}>
              <LinearGradient
                pointerEvents="none"
                colors={[colors.navy, '#0C3E56', colors.tealStrong]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <Text style={styles.rate}>
                {formatMoney(shift.rate_minor, shift.currency)}/hr
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.actionCol}>
          <Animated.View pointerEvents="none" style={[styles.actionRing, ringStyle]} />
          <Animated.View style={[styles.actionOrb, chevronStyle]}>
            <LinearGradient
              colors={[colors.navy, '#0C3E56', colors.tealStrong]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Ionicons name="arrow-forward" size={16} color={colors.white} />
          </Animated.View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingLeft: spacing.lg + 4,
    backgroundColor: colors.card,
    minHeight: 88,
    overflow: 'hidden',
  },
  pressed: {
    backgroundColor: '#F3FAFB',
  },
  accent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  accentOpen: {
    backgroundColor: colors.tealStrong,
  },
  accentMuted: {
    backgroundColor: colors.borderStrong,
  },
  dateTile: {
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: radii.md,
    gap: 2,
    overflow: 'hidden',
    ...shadows.sm,
  },
  dateTileMuted: {
    backgroundColor: colors.surfaceSubdued,
  },
  dayNum: {
    fontFamily: typography.fonts.bold,
    fontSize: 18,
    color: colors.navy,
    lineHeight: 22,
  },
  dayNumOpen: {
    color: colors.white,
  },
  dayLabel: {
    fontFamily: typography.fonts.semibold,
    fontSize: 11,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  dayLabelOpen: {
    color: 'rgba(255, 255, 255, 0.92)',
  },
  main: {
    flex: 1,
    minWidth: 0,
    gap: 5,
  },
  title: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: typography.size.lg,
    color: colors.text,
    letterSpacing: -0.2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.tealSoft,
    borderRadius: radii.sm,
    paddingHorizontal: 8,
    paddingVertical: 5,
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  locationIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.tealStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  location: {
    flexShrink: 1,
    fontFamily: typography.fonts.semibold,
    fontSize: typography.size.sm,
    color: colors.navy,
  },
  orgRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  meta: {
    flex: 1,
    fontFamily: typography.fonts.regular,
    fontSize: typography.size.sm,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  factGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
  },
  factChip: {
    flexGrow: 1,
    flexBasis: '46%',
    minWidth: 132,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surfaceSubdued,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  factChipWide: {
    flexBasis: '100%',
    backgroundColor: colors.yellowLight,
    borderColor: 'rgba(212, 148, 36, 0.35)',
  },
  factIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  factIconTime: {
    backgroundColor: colors.navy,
  },
  factIconRole: {
    backgroundColor: colors.tealStrong,
  },
  factIconOpen: {
    backgroundColor: colors.honeyStrong,
  },
  factCopy: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  factLabel: {
    fontFamily: typography.fonts.semibold,
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: colors.textMuted,
  },
  factValue: {
    fontFamily: typography.fonts.semibold,
    fontSize: 13,
    lineHeight: 17,
    color: colors.navy,
  },
  factValueOpen: {
    color: colors.honeyStrong,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: 4,
  },
  ratePill: {
    borderRadius: radii.full,
    paddingHorizontal: 11,
    paddingVertical: 5,
    overflow: 'hidden',
    ...shadows.sm,
  },
  rate: {
    fontFamily: typography.fonts.bold,
    fontSize: typography.size.sm,
    color: colors.white,
    letterSpacing: -0.1,
  },
  actionCol: {
    marginTop: 4,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionRing: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(20, 169, 181, 0.45)',
    backgroundColor: 'rgba(20, 169, 181, 0.08)',
  },
  actionOrb: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...shadows.sm,
  },
});
