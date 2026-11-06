import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
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
  ZoomIn,
} from 'react-native-reanimated';

import { colors, radii, shadows, spacing, typography } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { formatDate, formatDurationMinutes, formatMoney, formatTimeRange } from '@/utils/format';

export type SummaryPill = {
  label: string;
  fg: string;
  bg: string;
  icon: keyof typeof Ionicons.glyphMap;
  /** Live states get a pulsing ring around the icon. */
  live?: boolean;
};

export type SummaryRow = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
};

type Props = {
  eyebrow: string;
  eyebrowIcon?: keyof typeof Ionicons.glyphMap;
  pill?: SummaryPill;
  title: string;
  org?: string | null;
  startsAt: string;
  endsAt: string;
  breakMinutes: number;
  location?: string | null;
  rateMinor: number;
  currency: string;
  /** Extra detail rows rendered after Duration (e.g. availability, role). */
  extraRows?: SummaryRow[];
  ctaLabel?: string;
  onPress: () => void;
  accessibilityLabel: string;
  /** Rendered inside the card under the CTA (e.g. progress toggle). */
  children?: React.ReactNode;
  /**
   * `compact` = dense marketplace row (more shifts visible).
   * `full` = detailed card for next-shift / assignment surfaces.
   */
  density?: 'full' | 'compact';
};

const INK = colors.navy;
const SLATE = '#5B7391';
const TILE = '#E6EEFB';
const TILE_ICON = '#1F4E96';
/** Below this card width the pay panel stacks under the details. */
const TWO_COLUMN_MIN_WIDTH = 330;

/** Shared status colours so every shift surface reads the same. */
export const SUMMARY_PILLS = {
  accepted: { fg: '#15803D', bg: '#E1F4E8', icon: 'checkmark-circle', live: true },
  open: { fg: '#15803D', bg: '#E1F4E8', icon: 'radio-button-on', live: true },
  live: { fg: colors.tealStrong, bg: colors.tealSoft, icon: 'radio-button-on', live: true },
  success: { fg: colors.success, bg: '#D5F0DF', icon: 'checkmark-done-circle' },
  danger: { fg: colors.error, bg: colors.errorLight, icon: 'close-circle' },
  warning: { fg: colors.honeyStrong, bg: colors.yellowLight, icon: 'hourglass' },
  info: { fg: colors.info, bg: colors.infoLight, icon: 'document-text' },
  neutral: { fg: colors.textSecondary, bg: colors.surfaceSubdued, icon: 'time' },
} as const satisfies Record<string, Omit<SummaryPill, 'label'>>;

export function ShiftSummaryCard({
  eyebrow,
  eyebrowIcon = 'calendar',
  pill,
  title,
  org,
  startsAt,
  endsAt,
  breakMinutes,
  location,
  rateMinor,
  currency,
  extraRows,
  ctaLabel = 'View shift details',
  onPress,
  accessibilityLabel,
  children,
  density = 'full',
}: Props) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  const [cardWidth, setCardWidth] = useState(0);
  const compact = density === 'compact';
  const minutes = Math.max(
    0,
    Math.round((new Date(endsAt).getTime() - new Date(startsAt).getTime()) / 60000) -
      breakMinutes,
  );
  const dateLabel = compact
    ? formatDate(startsAt, {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : formatDate(startsAt, { year: 'numeric' });
  const timeLabel = formatTimeRange(startsAt, endsAt);
  const durationLabel = formatDurationMinutes(minutes).toLowerCase();
  const rateLabel = formatMoney(rateMinor, currency);
  const estimateLabel = formatMoney(Math.round((rateMinor * minutes) / 60), currency);
  const twoColumn = cardWidth === 0 || cardWidth >= TWO_COLUMN_MIN_WIDTH;
  const availability = extraRows?.find((row) => row.label === 'Availability')?.value;
  const orgLabel = org?.trim() || null;
  const locationLabel = location?.trim() || null;

  const rows: SummaryRow[] = [
    { icon: 'calendar-outline', label: 'Date', value: dateLabel },
    { icon: 'time-outline', label: 'Working hours', value: timeLabel },
    ...(location ? [{ icon: 'location' as const, label: 'Location', value: location }] : []),
    { icon: 'hourglass-outline', label: 'Duration', value: durationLabel },
    ...(extraRows ?? []),
  ];

  const motionStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const onLayout = (e: LayoutChangeEvent) => {
    const next = Math.round(e.nativeEvent.layout.width);
    if (next !== cardWidth) setCardWidth(next);
  };

  if (compact) {
    return (
      <Animated.View style={[styles.card, styles.cardCompact, motionStyle]}>
        <Pressable
          onPress={onPress}
          onPressIn={() => {
            if (!reduced) scale.value = withSpring(0.985, { damping: 18, stiffness: 420 });
          }}
          onPressOut={() => {
            scale.value = withSpring(1, { damping: 14, stiffness: 260 });
          }}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          style={({ pressed }) => [
            styles.pressCompact,
            pressed && styles.cardPressed,
          ]}
        >
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(11, 42, 67, 0.03)', 'rgba(20, 169, 181, 0.06)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />

          <View style={styles.compactTop}>
            <View style={styles.compactTitleCol}>
              <Text style={styles.compactTitle} numberOfLines={1}>
                {title}
              </Text>
              <View style={styles.compactMetaRow}>
                <View style={styles.compactTimeChip}>
                  <Ionicons name="time" size={12} color={TILE_ICON} />
                  <Text style={styles.compactTimeText} numberOfLines={1}>
                    {timeLabel}
                  </Text>
                </View>
                {availability ? (
                  <View style={styles.compactAvailChip}>
                    <View style={styles.compactAvailDot} />
                    <Text style={styles.compactAvailText} numberOfLines={1}>
                      {availability}
                    </Text>
                  </View>
                ) : null}
              </View>
              {orgLabel || locationLabel ? (
                <View style={styles.compactPlaceBlock}>
                  {orgLabel ? (
                    <CompactPlaceChip
                      tone="org"
                      icon="business"
                      label={orgLabel}
                      delay={40}
                      reduced={reduced}
                    />
                  ) : null}
                  {locationLabel ? (
                    <CompactPlaceChip
                      tone="location"
                      icon="location"
                      label={locationLabel}
                      delay={90}
                      reduced={reduced}
                    />
                  ) : null}
                </View>
              ) : null}
            </View>
            <View style={styles.compactAside}>
              {pill ? <ShiftStatusPill pill={pill} compact /> : null}
              <View style={styles.compactRateChip}>
                <Text style={styles.compactRate} numberOfLines={1}>
                  {rateLabel}
                </Text>
                <Text style={styles.compactRateUnit}>/hr</Text>
              </View>
            </View>
          </View>

          <View style={styles.compactFooter}>
            <View style={styles.compactDateRow}>
              <LinearGradient
                colors={['#2A6BD6', '#123A5C']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.compactDateMark}
              >
                <Ionicons name="calendar" size={11} color={colors.white} />
              </LinearGradient>
              <Text style={styles.compactDate} numberOfLines={1}>
                {dateLabel}
              </Text>
            </View>
            <View style={styles.compactEarn}>
              <Text style={styles.compactEarnLabel}>Est.</Text>
              <Text style={styles.compactEarnValue}>{estimateLabel}</Text>
              <LinearGradient
                colors={[colors.navy, '#0C3E56', colors.tealStrong]}
                start={{ x: 0.1, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.compactChevron}
              >
                <Ionicons name="chevron-forward" size={14} color={colors.white} />
              </LinearGradient>
            </View>
          </View>
        </Pressable>
        {children ? <View style={styles.compactChildren}>{children}</View> : null}
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.card, motionStyle]}>
      <Pressable
        onPress={onPress}
        onLayout={onLayout}
        onPressIn={() => {
          if (!reduced) scale.value = withSpring(0.985, { damping: 18, stiffness: 420 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 14, stiffness: 260 });
        }}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={({ pressed }) => [styles.press, pressed && styles.cardPressed]}
      >
        <View style={styles.header}>
          <View style={styles.eyebrowRow}>
            <LinearGradient
              colors={['#2A6BD6', '#123A5C']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.mark}
            >
              <Ionicons name={eyebrowIcon} size={20} color={colors.white} />
            </LinearGradient>
            <Text style={styles.eyebrow} numberOfLines={1}>
              {eyebrow}
            </Text>
          </View>
          <View style={styles.headerRight}>
            {pill ? <ShiftStatusPill pill={pill} /> : null}
            <View style={styles.more}>
              <Ionicons name="ellipsis-horizontal" size={18} color={INK} />
            </View>
          </View>
        </View>

        <View style={styles.titleBlock}>
          <Text style={styles.role} numberOfLines={2}>
            {title}
          </Text>
          {org ? (
            <View style={styles.orgRow}>
              <Ionicons name="business" size={16} color={TILE_ICON} />
              <Text style={styles.org} numberOfLines={2}>
                {org}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={[styles.body, !twoColumn && styles.bodyStacked]}>
          <View style={[styles.details, twoColumn && styles.detailsSplit]}>
            {rows.map((row, i) => (
              <DetailRow key={row.label} {...row} last={i === rows.length - 1} />
            ))}
          </View>

          <View
            style={[styles.payPanel, twoColumn ? styles.payPanelSplit : styles.payPanelStacked]}
          >
            <LinearGradient
              pointerEvents="none"
              colors={['rgba(232, 241, 252, 0.2)', '#B9D5EE', '#5C9BC4']}
              start={{ x: 0, y: 0.1 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Ionicons
              name="medkit"
              size={110}
              color="rgba(255, 255, 255, 0.28)"
              style={styles.panelWatermark}
            />

            <LinearGradient
              colors={['#0B2A43', '#0F4C78']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.rateCard}
            >
              <View style={styles.rateIcon}>
                <Ionicons name="cash" size={18} color={colors.yellow} />
              </View>
              <View style={styles.cardCopy}>
                <Text style={styles.rateLabel}>Pay rate</Text>
                <Text style={styles.rateValue} numberOfLines={1} adjustsFontSizeToFit>
                  {rateLabel}
                </Text>
                <Text style={styles.rateSub}>per hour</Text>
              </View>
            </LinearGradient>

            <View style={styles.earnCard}>
              <View style={styles.earnIcon}>
                <Ionicons name="stats-chart" size={16} color={TILE_ICON} />
              </View>
              <View style={styles.cardCopy}>
                <Text style={styles.earnLabel} numberOfLines={2}>
                  Estimated earnings
                </Text>
                <Text style={styles.earnValue} numberOfLines={1} adjustsFontSizeToFit>
                  {estimateLabel}
                </Text>
                <Text style={styles.earnSub} numberOfLines={1}>
                  {durationLabel} × {rateLabel}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.cta}>
          <Text style={styles.ctaText}>{ctaLabel}</Text>
          <View style={styles.ctaArrow}>
            <Ionicons name="arrow-forward" size={17} color={INK} />
          </View>
        </View>
      </Pressable>

      {children ? <View style={styles.extra}>{children}</View> : null}
    </Animated.View>
  );
}

/**
 * Animated assignment status: springs in, shows a live pulsing ring for active
 * states, and a soft sheen sweeps across every few seconds. Static under Reduce Motion.
 */
function ShiftStatusPill({
  pill,
  compact = false,
}: {
  pill: SummaryPill;
  compact?: boolean;
}) {
  const reduced = useReducedMotion();
  const pulse = useSharedValue(0);
  const sheen = useSharedValue(0);
  const live = Boolean(pill.live);

  useEffect(() => {
    if (reduced || !live) {
      pulse.value = 0;
      return;
    }
    pulse.value = withRepeat(
      withTiming(1, { duration: 1700, easing: Easing.out(Easing.quad) }),
      -1,
      false,
    );
  }, [pulse, reduced, live]);

  useEffect(() => {
    if (reduced) return;
    sheen.value = withRepeat(
      withSequence(
        withDelay(2600, withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) })),
        withTiming(0, { duration: 0 }),
      ),
      -1,
      false,
    );
  }, [reduced, sheen]);

  const ringStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.5, 0]),
    transform: [{ scale: interpolate(pulse.value, [0, 1], [1, 1.9]) }],
  }));
  const sheenStyle = useAnimatedStyle(() => ({
    opacity: interpolate(sheen.value, [0, 0.15, 0.85, 1], [0, 0.7, 0.7, 0]),
    transform: [{ translateX: interpolate(sheen.value, [0, 1], [-40, 120]) }, { rotate: '18deg' }],
  }));

  return (
    <Animated.View
      entering={reduced ? undefined : ZoomIn.springify().damping(12).stiffness(200)}
      style={[
        styles.pill,
        compact && styles.pillCompact,
        { backgroundColor: pill.bg },
      ]}
      accessibilityRole="text"
      accessibilityLabel={pill.label}
    >
      <View style={styles.pillIcon}>
        {live && !reduced ? (
          <Animated.View
            pointerEvents="none"
            style={[styles.pillRing, { backgroundColor: pill.fg }, ringStyle]}
          />
        ) : null}
        <Ionicons name={pill.icon} size={compact ? 14 : 18} color={pill.fg} />
      </View>
      <Text
        style={[styles.pillText, compact && styles.pillTextCompact, { color: pill.fg }]}
        numberOfLines={1}
      >
        {pill.label}
      </Text>
      {!reduced && !compact ? (
        <Animated.View pointerEvents="none" style={[styles.pillSheen, sheenStyle]} />
      ) : null}
    </Animated.View>
  );
}

const PLACE_TONES = {
  org: {
    mark: ['#2A6BD6', '#123A5C'] as [string, string],
    wash: 'rgba(42, 107, 214, 0.08)',
    border: 'rgba(42, 107, 214, 0.18)',
  },
  location: {
    mark: [colors.tealStrong, '#0E7A8A'] as [string, string],
    wash: 'rgba(20, 169, 181, 0.09)',
    border: 'rgba(20, 169, 181, 0.20)',
  },
} as const;

function CompactPlaceChip({
  tone,
  icon,
  label,
  delay,
  reduced,
}: {
  tone: keyof typeof PLACE_TONES;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  delay: number;
  reduced: boolean;
}) {
  const palette = PLACE_TONES[tone];
  return (
    <Animated.View
      entering={
        reduced ? undefined : FadeInDown.delay(delay).duration(360).springify().damping(17)
      }
      style={[
        styles.compactPlaceChip,
        { backgroundColor: palette.wash, borderColor: palette.border },
      ]}
    >
      <LinearGradient
        colors={palette.mark}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={styles.compactPlaceMark}
      >
        <Ionicons name={icon} size={11} color={colors.white} />
      </LinearGradient>
      <Text
        style={[
          styles.compactPlace,
          tone === 'org' ? styles.compactPlaceOrg : styles.compactPlaceLocation,
        ]}
        numberOfLines={2}
      >
        {label}
      </Text>
    </Animated.View>
  );
}

function DetailRow({
  icon,
  label,
  value,
  last = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.detailRow, !last && styles.detailRowDivider]}>
      <View style={styles.detailIcon}>
        <Ionicons name={icon} size={18} color={TILE_ICON} />
      </View>
      <View style={styles.detailCopy}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue} numberOfLines={2}>
          {value}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 28,
    overflow: 'hidden',
    ...shadows.md,
  },
  cardCompact: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(11, 42, 67, 0.10)',
    overflow: 'hidden',
    ...shadows.sm,
  },
  compactChildren: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  press: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  pressCompact: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: 10,
  },
  cardPressed: {
    opacity: 0.96,
  },
  compactTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  compactTitleCol: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  compactTitle: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.35,
    color: INK,
  },
  compactMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  compactTimeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(42, 107, 214, 0.10)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(42, 107, 214, 0.22)',
  },
  compactTimeText: {
    fontFamily: typography.fonts.semibold,
    fontSize: 12,
    letterSpacing: -0.15,
    color: TILE_ICON,
  },
  compactAvailChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(34, 160, 107, 0.10)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(34, 160, 107, 0.28)',
  },
  compactAvailDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.success,
  },
  compactAvailText: {
    fontFamily: typography.fonts.semibold,
    fontSize: 12,
    letterSpacing: -0.1,
    color: '#15803D',
  },
  compactPlaceBlock: {
    gap: 6,
    marginTop: 2,
  },
  compactPlaceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  compactPlaceMark: {
    width: 22,
    height: 22,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  compactPlace: {
    flex: 1,
    minWidth: 0,
    fontSize: 13,
    lineHeight: 17,
    letterSpacing: -0.15,
  },
  compactPlaceOrg: {
    fontFamily: typography.fonts.semibold,
    color: INK,
  },
  compactPlaceLocation: {
    fontFamily: typography.fonts.medium,
    color: '#3D5A73',
  },
  compactAside: {
    alignItems: 'flex-end',
    gap: 8,
    flexShrink: 0,
  },
  compactRateChip: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 10,
    backgroundColor: 'rgba(11, 42, 67, 0.05)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(11, 42, 67, 0.10)',
  },
  compactRate: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 14,
    letterSpacing: -0.25,
    color: INK,
  },
  compactRateUnit: {
    fontFamily: typography.fonts.medium,
    fontSize: 11,
    color: SLATE,
  },
  compactFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(11, 42, 67, 0.08)',
  },
  compactDateRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  compactDateMark: {
    width: 22,
    height: 22,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactDate: {
    flex: 1,
    minWidth: 0,
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 13,
    letterSpacing: -0.2,
    color: INK,
  },
  compactEarn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  compactEarnLabel: {
    fontFamily: typography.fonts.medium,
    fontSize: 11,
    letterSpacing: 0.2,
    textTransform: 'uppercase',
    color: SLATE,
  },
  compactEarnValue: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 15,
    letterSpacing: -0.25,
    color: colors.success,
  },
  compactChevron: {
    width: 26,
    height: 26,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
  },
  pillCompact: {
    height: 28,
    paddingLeft: 8,
    paddingRight: 10,
    gap: 4,
  },
  pillTextCompact: {
    fontSize: 12,
  },
  extra: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    marginTop: -spacing.xs,
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexShrink: 1,
  },
  mark: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: {
    fontFamily: typography.fonts.semibold,
    fontSize: 13,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: INK,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  more: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF3FA',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 38,
    paddingLeft: 10,
    paddingRight: 14,
    borderRadius: radii.full,
    overflow: 'hidden',
  },
  pillIcon: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillRing: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  pillText: {
    fontFamily: typography.fonts.semibold,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0.1,
  },
  pillSheen: {
    position: 'absolute',
    top: -6,
    bottom: -6,
    width: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
  },
  titleBlock: {
    gap: 6,
  },
  role: {
    fontFamily: typography.fonts.display,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.5,
    color: INK,
  },
  orgRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  org: {
    flexShrink: 1,
    fontFamily: typography.fonts.medium,
    fontSize: 15,
    lineHeight: 20,
    color: SLATE,
  },
  body: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.md,
  },
  bodyStacked: {
    flexDirection: 'column',
  },
  details: {
    minWidth: 0,
  },
  detailsSplit: {
    flex: 1.05,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  detailRowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(11, 42, 67, 0.12)',
  },
  detailIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: TILE,
  },
  detailCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  detailLabel: {
    fontFamily: typography.fonts.semibold,
    fontSize: 10.5,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: SLATE,
  },
  detailValue: {
    fontFamily: typography.fonts.bold,
    fontSize: 14,
    lineHeight: 19,
    color: INK,
  },
  payPanel: {
    borderRadius: 24,
    overflow: 'hidden',
    padding: 10,
    gap: 10,
    justifyContent: 'center',
  },
  payPanelSplit: {
    flex: 1,
    minWidth: 0,
  },
  payPanelStacked: {
    alignSelf: 'stretch',
  },
  panelWatermark: {
    position: 'absolute',
    right: -18,
    top: 6,
  },
  rateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 18,
    padding: 12,
    shadowColor: '#0B2A43',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  rateIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  cardCopy: {
    flex: 1,
    minWidth: 0,
  },
  rateLabel: {
    fontFamily: typography.fonts.semibold,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: 'rgba(255, 255, 255, 0.72)',
  },
  rateValue: {
    fontFamily: typography.fonts.bold,
    fontSize: 22,
    lineHeight: 28,
    color: colors.white,
  },
  rateSub: {
    fontFamily: typography.fonts.medium,
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.78)',
  },
  earnCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 18,
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
  },
  earnIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: TILE,
  },
  earnLabel: {
    fontFamily: typography.fonts.semibold,
    fontSize: 9.5,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: SLATE,
  },
  earnValue: {
    fontFamily: typography.fonts.bold,
    fontSize: 22,
    lineHeight: 28,
    color: colors.success,
  },
  earnSub: {
    fontFamily: typography.fonts.medium,
    fontSize: 11.5,
    color: SLATE,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderRadius: 16,
    paddingHorizontal: 10,
    backgroundColor: INK,
  },
  ctaText: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 15,
    color: colors.white,
  },
  ctaArrow: {
    position: 'absolute',
    right: 8,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.yellow,
  },
});
