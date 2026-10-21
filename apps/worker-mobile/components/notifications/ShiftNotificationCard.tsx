import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { colors, radii, shadows, spacing, typography } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import type { Notification } from '@/lib/queries';
import { formatRelativeDate } from '@/utils/format';

type Props = {
  item: Notification;
  unavailable: boolean;
  index?: number;
  onPress: () => void;
};

type ShiftParts = {
  day?: string;
  hours?: string;
  place?: string;
  availability?: string;
  rate?: string;
};

/** Parse marketplace push body: `19 Oct · 08:00–19:00 · ICU · 1 position open · €18/hour` */
export function parseShiftNotificationBody(body: string): ShiftParts {
  const parts = body
    .split('·')
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length < 2) return {};
  return {
    day: parts[0],
    hours: parts[1],
    place: parts[2],
    availability: parts[3],
    rate: parts[4],
  };
}

function formatAddedAt(iso: string): { relative: string; exact: string } {
  const date = new Date(iso);
  const exact = new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
  return { relative: formatRelativeDate(iso), exact };
}

function FactChip({
  icon,
  label,
  value,
  tone = 'neutral',
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  tone?: 'neutral' | 'accent' | 'money';
}) {
  const palette =
    tone === 'money'
      ? { bg: colors.successLight, fg: colors.success, iconBg: colors.success }
      : tone === 'accent'
        ? { bg: colors.tealSoft, fg: colors.tealStrong, iconBg: colors.tealStrong }
        : { bg: colors.surfaceSubdued, fg: colors.navy, iconBg: colors.navy };

  return (
    <View style={[styles.chip, { backgroundColor: palette.bg }]}>
      <View style={[styles.chipIcon, { backgroundColor: palette.iconBg }]}>
        <Ionicons name={icon} size={11} color={colors.white} />
      </View>
      <View style={styles.chipCopy}>
        <Text style={styles.chipLabel}>{label}</Text>
        <Text style={[styles.chipValue, { color: palette.fg }]} numberOfLines={1}>
          {value}
        </Text>
      </View>
    </View>
  );
}

export function ShiftNotificationCard({ item, unavailable, index = 0, onPress }: Props) {
  const reduced = useReducedMotion();
  const unread = !item.read_at;
  const parts = parseShiftNotificationBody(item.body ?? '');
  const added = formatAddedAt(item.created_at);
  const isShiftAlert = Boolean(parts.day || parts.hours);

  return (
    <Animated.View
      entering={reduced ? undefined : FadeInDown.delay(Math.min(index * 40, 280)).duration(340)}
    >
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${item.title}${unread ? ', unread' : ''}${unavailable ? ', no longer available' : ''}, added ${added.exact}`}
        style={({ pressed }) => [
          styles.card,
          unread && styles.cardUnread,
          unavailable && styles.cardUnavailable,
          pressed && styles.cardPressed,
        ]}
      >
        <LinearGradient
          pointerEvents="none"
          colors={
            unavailable
              ? ['rgba(108, 117, 125, 0.1)', 'transparent']
              : unread
                ? ['rgba(20, 169, 181, 0.14)', 'transparent']
                : ['rgba(11, 42, 67, 0.06)', 'transparent']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        <View style={styles.topRow}>
          <LinearGradient
            colors={
              unavailable
                ? ['#6C757D', '#495057']
                : unread
                  ? [colors.navy, colors.tealStrong]
                  : [colors.navyLift, colors.teal]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.icon}
          >
            <Ionicons
              name={unavailable ? 'close-circle' : unread ? 'flash' : 'calendar'}
              size={18}
              color={colors.white}
            />
          </LinearGradient>

          <View style={styles.headerCopy}>
            <View style={styles.badgeRow}>
              {unread ? (
                <View style={styles.newBadge}>
                  <Text style={styles.newBadgeText}>New</Text>
                </View>
              ) : null}
              {unavailable ? (
                <View style={styles.goneBadge}>
                  <Text style={styles.goneBadgeText}>Closed</Text>
                </View>
              ) : isShiftAlert ? (
                <View style={styles.openBadge}>
                  <Text style={styles.openBadgeText}>Open shift</Text>
                </View>
              ) : null}
            </View>
            <Text style={[styles.title, unread && styles.titleUnread]} numberOfLines={2}>
              {item.title}
            </Text>
          </View>
        </View>

        {isShiftAlert ? (
          <View style={styles.factGrid}>
            {parts.day ? (
              <FactChip icon="calendar" label="Date" value={parts.day} tone="accent" />
            ) : null}
            {parts.hours ? (
              <FactChip icon="time" label="Hours" value={parts.hours} />
            ) : null}
            {parts.place ? (
              <FactChip icon="location" label="Location" value={parts.place} tone="accent" />
            ) : null}
            {parts.availability ? (
              <FactChip icon="people" label="Open" value={parts.availability} />
            ) : null}
            {parts.rate ? (
              <FactChip icon="cash" label="Rate" value={parts.rate} tone="money" />
            ) : null}
          </View>
        ) : (
          <Text style={styles.fallbackBody} numberOfLines={3}>
            {item.body}
          </Text>
        )}

        <View style={styles.footer}>
          <View style={styles.addedBlock}>
            <Ionicons name="notifications" size={13} color={colors.tealStrong} />
            <View style={styles.addedCopy}>
              <Text style={styles.addedLabel}>Added</Text>
              <Text style={styles.addedExact}>{added.exact}</Text>
            </View>
          </View>
          <View style={styles.relativePill}>
            <Text style={styles.relativeText}>{added.relative}</Text>
          </View>
        </View>

        {unavailable ? (
          <Text style={styles.unavailableNote}>
            This shift is no longer available to claim.
          </Text>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
    overflow: 'hidden',
    ...shadows.sm,
  },
  cardUnread: {
    borderColor: 'rgba(20, 169, 181, 0.35)',
    backgroundColor: '#F4FBFC',
  },
  cardUnavailable: {
    borderColor: colors.borderStrong,
    opacity: 0.92,
  },
  cardPressed: {
    opacity: 0.9,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  newBadge: {
    backgroundColor: colors.tealStrong,
    borderRadius: radii.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  newBadgeText: {
    fontFamily: typography.fonts.bold,
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: colors.white,
  },
  openBadge: {
    backgroundColor: colors.navy,
    borderRadius: radii.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  openBadgeText: {
    fontFamily: typography.fonts.bold,
    fontSize: 10,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: colors.white,
  },
  goneBadge: {
    backgroundColor: colors.surfaceSubdued,
    borderRadius: radii.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
  },
  goneBadgeText: {
    fontFamily: typography.fonts.bold,
    fontSize: 10,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: colors.textSecondary,
  },
  title: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 16,
    lineHeight: 21,
    letterSpacing: -0.2,
    color: colors.text,
  },
  titleUnread: {
    color: colors.navy,
  },
  factGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexGrow: 1,
    flexBasis: '46%',
    minWidth: 140,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: radii.md,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  chipIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipCopy: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  chipLabel: {
    fontFamily: typography.fonts.semibold,
    fontSize: 10,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: colors.textMuted,
  },
  chipValue: {
    fontFamily: typography.fonts.semibold,
    fontSize: 13,
    lineHeight: 16,
  },
  fallbackBody: {
    fontFamily: typography.fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  addedBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  addedCopy: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  addedLabel: {
    fontFamily: typography.fonts.bold,
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: colors.tealStrong,
  },
  addedExact: {
    fontFamily: typography.fonts.semibold,
    fontSize: 13,
    color: colors.navy,
  },
  relativePill: {
    backgroundColor: colors.surfaceSubdued,
    borderRadius: radii.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  relativeText: {
    fontFamily: typography.fonts.semibold,
    fontSize: 12,
    color: colors.textSecondary,
  },
  unavailableNote: {
    fontFamily: typography.fonts.medium,
    fontSize: 12,
    color: colors.textMuted,
  },
});
