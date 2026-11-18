import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { colors, shadows, spacing, typography } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import type { BillingRestrictionSummary } from '@/lib/invoices';
import { formatMoney, formatShortDate } from '@/utils/format';

type Props = {
  summary: BillingRestrictionSummary;
};

/**
 * "Marketplace access paused" alert for the notifications inbox.
 * Premium urgency card — pauses new claims only; current assignments stay open.
 */
export function BillingRestrictionAlert({ summary }: Props) {
  const reduced = useReducedMotion();
  const breath = useSharedValue(reduced ? 1 : 0);
  const amount = formatMoney(summary.overdue_amount_minor);
  const due = summary.oldest_due_at ? `Due ${formatShortDate(summary.oldest_due_at)}` : null;
  const enter =
    !reduced && Platform.OS !== 'web'
      ? FadeInDown.duration(380).springify().damping(18)
      : undefined;

  useEffect(() => {
    if (reduced) {
      breath.value = 1;
      return;
    }
    breath.value = withDelay(
      200,
      withRepeat(
        withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      ),
    );
  }, [breath, reduced]);

  const accentStyle = useAnimatedStyle(() => ({
    opacity: interpolate(breath.value, [0, 1], [0.55, 1]),
    transform: [{ scaleY: interpolate(breath.value, [0, 1], [0.78, 1]) }],
  }));

  const sheenStyle = useAnimatedStyle(() => ({
    opacity: interpolate(breath.value, [0, 1], [0.03, 0.12]),
    transform: [{ translateX: interpolate(breath.value, [0, 1], [-40, 80]) }],
  }));

  return (
    <Animated.View
      entering={enter}
      accessibilityRole="alert"
      accessibilityLabel={`Marketplace access paused. ${amount} overdue${due ? `. ${due}` : ''}`}
      style={styles.card}
    >
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(180, 35, 24, 0.08)', 'rgba(224, 170, 24, 0.06)', 'rgba(255,255,255,0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <Animated.View pointerEvents="none" style={[styles.sheen, sheenStyle]}>
        <LinearGradient
          colors={['transparent', 'rgba(255,255,255,0.55)', 'transparent']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>

      <View style={styles.row}>
        <Animated.View style={[styles.accent, accentStyle]} />
        <View style={styles.bodyCol}>
          <View style={styles.header}>
            <LinearGradient
              colors={['#8B1E16', colors.error, '#C45A2A']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconWrap}
            >
              <Ionicons name="lock-closed" size={16} color={colors.white} />
            </LinearGradient>
            <View style={styles.headerCopy}>
              <Text style={styles.eyebrow}>Billing</Text>
              <Text style={styles.title}>Marketplace access paused</Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <View style={styles.metaChip}>
              <Ionicons name="alert-circle" size={13} color={colors.error} />
              <Text style={styles.metaChipText}>
                <Text style={styles.metaAmount}>{amount}</Text> overdue
              </Text>
            </View>
            {due ? (
              <View style={styles.metaChip}>
                <Ionicons name="calendar-outline" size={13} color={colors.tealStrong} />
                <Text style={styles.metaChipText}>{due}</Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.body}>
            New shift claims are paused until past-due commission is paid. Your current
            assignments are unaffected.
          </Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="View invoices"
            onPress={() => router.push('/(tabs)/invoices')}
            style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
          >
            <LinearGradient
              colors={[colors.navy, '#0C3E56', colors.tealStrong]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={StyleSheet.absoluteFillObject}
            />
            <Text style={styles.ctaText}>View invoices</Text>
            <Ionicons name="arrow-forward" size={15} color={colors.yellow} />
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    backgroundColor: colors.card,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(180, 35, 24, 0.14)',
    ...shadows.sm,
  },
  sheen: {
    ...StyleSheet.absoluteFillObject,
    width: 92,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  accent: {
    width: 3,
    marginVertical: 16,
    marginLeft: 12,
    borderRadius: 2,
    backgroundColor: colors.error,
  },
  bodyCol: {
    flex: 1,
    gap: 12,
    paddingVertical: 16,
    paddingLeft: 12,
    paddingRight: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: {
    flex: 1,
    gap: 3,
    paddingTop: 1,
    minWidth: 0,
  },
  eyebrow: {
    fontFamily: typography.fonts.bold,
    fontSize: 10,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: colors.error,
  },
  title: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.25,
    color: colors.navy,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(11, 42, 67, 0.05)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(11, 42, 67, 0.06)',
  },
  metaChipText: {
    fontFamily: typography.fonts.medium,
    fontSize: 12,
    color: colors.navy,
  },
  metaAmount: {
    fontFamily: typography.fonts.bold,
    color: colors.error,
  },
  body: {
    fontFamily: typography.fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  cta: {
    alignSelf: 'stretch',
    minHeight: 46,
    borderRadius: 999,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: spacing.lg,
  },
  ctaPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  ctaText: {
    fontFamily: typography.fonts.semibold,
    fontSize: 15,
    color: colors.white,
  },
});
