import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
} from 'react-native-reanimated';

import { colors, radii, shadows, spacing, typography } from '@/constants/theme';
import { useLayout } from '@/hooks/useLayout';
import type { Member } from '@/types';
import { formatCurrency } from '@/utils/format';

type Props = {
  member: Member;
};

export function EarningsCard({ member }: Props) {
  const router = useRouter();
  const { isCompact } = useLayout();
  const reveal = useSharedValue(0);

  useEffect(() => {
    reveal.value = withDelay(60, withSpring(1, { damping: 16, stiffness: 160 }));
  }, [reveal]);

  const cardMotion = useAnimatedStyle(() => ({
    opacity: reveal.value,
    transform: [
      { translateY: interpolate(reveal.value, [0, 1], [14, 0], Extrapolation.CLAMP) },
      { scale: interpolate(reveal.value, [0, 1], [0.98, 1], Extrapolation.CLAMP) },
    ],
  }));

  return (
    <Animated.View style={[styles.wrap, cardMotion]}>
      <Pressable
        onPress={() => router.push('/(tabs)/finances')}
        accessibilityRole="button"
        accessibilityLabel="View finances"
      >
        <LinearGradient
          colors={['#071A2F', '#0E2A47', '#123A5C']}
          locations={[0, 0.55, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.card, shadows.lg, isCompact && styles.cardCompact]}
        >
          <View style={styles.glow} pointerEvents="none" />
          <View style={styles.accentBar} pointerEvents="none" />

          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.label}>Available Earnings</Text>
              <Text style={styles.hint}>Ready to withdraw</Text>
            </View>
            <View style={styles.iconWrap}>
              <Ionicons name="wallet" size={18} color={colors.navy} />
            </View>
          </View>

          <Text style={[styles.amount, isCompact && styles.amountCompact]} numberOfLines={1}>
            {formatCurrency(member.availableEarnings)}
          </Text>

          <View style={styles.statsPanel}>
            <View style={styles.stat}>
              <View style={styles.statIcon}>
                <Ionicons name="time-outline" size={14} color={colors.yellow} />
              </View>
              <View style={styles.statCopy}>
                <Text style={styles.statLabel}>Pending</Text>
                <Text style={styles.statValue} numberOfLines={1}>
                  {formatCurrency(member.pendingEarnings)}
                </Text>
              </View>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.stat}>
              <View style={styles.statIcon}>
                <Ionicons name="trending-up" size={14} color={colors.yellow} />
              </View>
              <View style={styles.statCopy}>
                <Text style={styles.statLabel}>This Month</Text>
                <Text style={styles.statValue} numberOfLines={1}>
                  {formatCurrency(member.paidThisMonth)}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerLabel}>Open finances</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.yellow} />
          </View>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    marginBottom: spacing.xl,
  },
  card: {
    borderRadius: radii.xl,
    padding: spacing.xl,
    overflow: 'hidden',
  },
  cardCompact: {
    padding: spacing.lg,
  },
  glow: {
    position: 'absolute',
    top: -48,
    right: -28,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(245, 176, 0, 0.14)',
  },
  accentBar: {
    position: 'absolute',
    top: 0,
    left: 28,
    right: 28,
    height: 3,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
    backgroundColor: colors.yellow,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.size.xs,
    color: 'rgba(255,255,255,0.78)',
    textTransform: 'uppercase',
    letterSpacing: 0.9,
  },
  hint: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.size.xs,
    color: 'rgba(255,255,255,0.45)',
    marginTop: 3,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: colors.yellow,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  amount: {
    fontFamily: typography.fonts.bold,
    fontSize: 42,
    lineHeight: 48,
    color: colors.white,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    letterSpacing: -0.8,
  },
  amountCompact: {
    fontSize: 34,
    lineHeight: 40,
  },
  statsPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  stat: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minWidth: 0,
  },
  statIcon: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: 'rgba(245, 176, 0, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  statCopy: {
    flex: 1,
    minWidth: 0,
  },
  statDivider: {
    width: 1,
    height: 34,
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginHorizontal: spacing.sm,
  },
  statLabel: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.size.xs,
    color: 'rgba(255,255,255,0.55)',
  },
  statValue: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.size.md,
    color: colors.white,
    marginTop: 1,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: spacing.md,
  },
  footerLabel: {
    fontFamily: typography.fonts.medium,
    fontSize: typography.size.xs,
    color: colors.yellow,
  },
});
