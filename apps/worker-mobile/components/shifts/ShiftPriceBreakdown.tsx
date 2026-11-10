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
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { colors, radii, shadows, spacing, typography } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { formatMoney } from '@/utils/format';

type Props = {
  rateMinor: number;
  currency: string;
  estimatedPayMinor: number;
  commissionMinor: number;
  netMinor: number;
  commissionPercent: number;
};

/**
 * Premium shift pay overview — rate, gross, commission invoice, and net earnings.
 */
export function ShiftPriceBreakdown({
  rateMinor,
  currency,
  estimatedPayMinor,
  commissionMinor,
  netMinor,
  commissionPercent,
}: Props) {
  const reduced = useReducedMotion();
  const enter = useSharedValue(reduced ? 1 : 0);

  useEffect(() => {
    if (reduced) {
      enter.value = 1;
      return;
    }
    enter.value = withDelay(
      80,
      withTiming(1, { duration: 480, easing: Easing.out(Easing.cubic) }),
    );
  }, [enter, reduced]);

  const shellStyle = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [{ translateY: interpolate(enter.value, [0, 1], [8, 0]) }],
  }));

  const entering = reduced
    ? undefined
    : FadeInDown.delay(120).duration(380).springify().damping(17);

  return (
    <Animated.View style={[styles.card, shellStyle]}>
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(20, 169, 181, 0.08)', 'rgba(11, 42, 67, 0.02)', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.wash}
      />

      <View style={styles.header}>
        <LinearGradient
          colors={[colors.navy, '#0C3E56', colors.tealStrong]}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerIcon}
        >
          <Ionicons name="wallet" size={18} color={colors.white} />
        </LinearGradient>
        <View style={styles.headerCopy}>
          <Text style={styles.headerEyebrow}>Earnings estimate</Text>
          <Text style={styles.headerTitle}>Price overview</Text>
          <Text style={styles.headerSub}>
            Based on scheduled hours at {formatMoney(rateMinor, currency)}/hr
          </Text>
        </View>
        <View style={styles.rateBadge}>
          <Text style={styles.rateBadgeText}>{formatMoney(rateMinor, currency)}/hr</Text>
        </View>
      </View>

      {estimatedPayMinor > 0 ? (
        <View style={styles.rows}>
          <Animated.View entering={entering} style={styles.row}>
            <View style={[styles.rowIcon, styles.rowIconGross]}>
              <Ionicons name="cash-outline" size={16} color={colors.navy} />
            </View>
            <View style={styles.rowCopy}>
              <Text style={styles.rowLabel}>Total pay</Text>
              <Text style={styles.rowHint}>Paid by the organization</Text>
            </View>
            <Text style={styles.rowValue}>{formatMoney(estimatedPayMinor, currency)}</Text>
          </Animated.View>

          <Animated.View
            entering={
              reduced
                ? undefined
                : FadeInDown.delay(180).duration(380).springify().damping(17)
            }
            style={styles.row}
          >
            <View style={[styles.rowIcon, styles.rowIconCommission]}>
              <Ionicons name="receipt-outline" size={16} color={colors.navy} />
            </View>
            <View style={styles.rowCopy}>
              <View style={styles.rowLabelRow}>
                <Text style={styles.rowLabel}>Commission</Text>
                <View style={styles.percentPill}>
                  <Text style={styles.percentText}>{commissionPercent}%</Text>
                </View>
              </View>
              <Text style={styles.rowHint}>Bridge Hive invoice</Text>
            </View>
            <Text style={styles.rowDebit}>−{formatMoney(commissionMinor, currency)}</Text>
          </Animated.View>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
          </View>

          <Animated.View
            entering={
              reduced
                ? undefined
                : FadeInDown.delay(240).duration(400).springify().damping(17)
            }
            style={styles.netPanel}
          >
            <LinearGradient
              pointerEvents="none"
              colors={['rgba(20, 108, 67, 0.10)', 'rgba(20, 108, 67, 0.03)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.netIcon}>
              <Ionicons name="trending-up" size={16} color={colors.success} />
            </View>
            <View style={styles.rowCopy}>
              <Text style={styles.netLabel}>Earnings</Text>
              <Text style={styles.rowHint}>After commission invoice</Text>
            </View>
            <Text style={styles.netValue}>{formatMoney(netMinor, currency)}</Text>
          </Animated.View>
        </View>
      ) : (
        <Text style={styles.empty}>Estimate unavailable for this schedule.</Text>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 22,
    padding: spacing.lg,
    gap: spacing.lg,
    overflow: 'hidden',
    ...shadows.sm,
  },
  wash: {
    ...StyleSheet.absoluteFillObject,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  headerEyebrow: {
    fontFamily: typography.fonts.semibold,
    fontSize: 10,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    color: colors.tealStrong,
  },
  headerTitle: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 17,
    letterSpacing: -0.25,
    color: colors.navy,
  },
  headerSub: {
    fontFamily: typography.fonts.regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textSecondary,
  },
  rateBadge: {
    backgroundColor: colors.navy,
    borderRadius: radii.full,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  rateBadgeText: {
    fontFamily: typography.fonts.bold,
    fontSize: 12,
    color: colors.white,
  },
  rows: {
    gap: spacing.sm + 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    minHeight: 52,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: radii.md,
    backgroundColor: 'rgba(11, 42, 67, 0.03)',
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rowIconGross: {
    backgroundColor: 'rgba(20, 169, 181, 0.14)',
  },
  rowIconCommission: {
    backgroundColor: 'rgba(11, 42, 67, 0.08)',
  },
  rowCopy: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  rowLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rowLabel: {
    fontFamily: typography.fonts.semibold,
    fontSize: 14,
    letterSpacing: -0.1,
    color: colors.navy,
  },
  rowHint: {
    fontFamily: typography.fonts.regular,
    fontSize: 12,
    color: colors.textSecondary,
  },
  percentPill: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 999,
    backgroundColor: 'rgba(11, 42, 67, 0.08)',
  },
  percentText: {
    fontFamily: typography.fonts.bold,
    fontSize: 10,
    letterSpacing: 0.2,
    color: colors.navy,
  },
  rowValue: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 16,
    letterSpacing: -0.2,
    color: colors.navy,
  },
  rowDebit: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 16,
    letterSpacing: -0.2,
    color: colors.navy,
  },
  divider: {
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  dividerLine: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(11, 42, 67, 0.12)',
  },
  netPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    minHeight: 60,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: radii.md,
    overflow: 'hidden',
  },
  netIcon: {
    width: 32,
    height: 32,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(20, 108, 67, 0.12)',
    flexShrink: 0,
  },
  netLabel: {
    fontFamily: typography.fonts.bold,
    fontSize: 14,
    letterSpacing: -0.1,
    color: colors.navy,
  },
  netValue: {
    fontFamily: typography.fonts.displayExtra,
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: -0.4,
    color: colors.success,
  },
  empty: {
    fontFamily: typography.fonts.regular,
    fontSize: 14,
    color: colors.textSecondary,
  },
});
