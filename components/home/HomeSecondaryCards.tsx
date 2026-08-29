import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { colors, radii, spacing, typography } from '@/constants/theme';
import { useContentWidth } from '@/hooks/useLayout';

type Props = {
  communityCount: number;
  communityUnread?: number;
  documentsExpiring: number;
  documentsVerified: number;
  hoursThisMonth: number;
  hoursGoal?: number;
  shiftsCompletedThisMonth?: number;
};

function useReveal(delayMs: number) {
  const reveal = useSharedValue(0);
  useEffect(() => {
    reveal.value = withDelay(delayMs, withSpring(1, { damping: 16, stiffness: 170 }));
  }, [delayMs, reveal]);
  return useAnimatedStyle(() => ({
    opacity: reveal.value,
    transform: [
      { translateY: interpolate(reveal.value, [0, 1], [12, 0], Extrapolation.CLAMP) },
      { scale: interpolate(reveal.value, [0, 1], [0.97, 1], Extrapolation.CLAMP) },
    ],
  }));
}

export function HomeSecondaryCards({
  communityCount,
  communityUnread = 0,
  documentsExpiring,
  documentsVerified,
  hoursThisMonth,
  hoursGoal = 80,
  shiftsCompletedThisMonth = 0,
}: Props) {
  const router = useRouter();
  const contentWidth = useContentWidth();
  const gap = spacing.md;
  const twoCol = contentWidth >= 340;
  const itemWidth = twoCol ? (contentWidth - gap) / 2 : contentWidth;

  const communityMotion = useReveal(80);
  const docsMotion = useReveal(140);
  const hoursMotion = useReveal(200);

  const progress = useSharedValue(0);
  const fillRatio = Math.min(1, hoursThisMonth / Math.max(hoursGoal, 1));

  useEffect(() => {
    progress.value = withDelay(
      280,
      withTiming(fillRatio, { duration: 900, easing: Easing.out(Easing.cubic) }),
    );
  }, [fillRatio, progress]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${interpolate(progress.value, [0, 1], [0, 100], Extrapolation.CLAMP)}%`,
  }));

  const docsUrgent = documentsExpiring > 0;
  const hoursLeft = Math.max(0, hoursGoal - hoursThisMonth);
  const unread = communityUnread > 0 ? communityUnread : communityCount;

  return (
    <View style={[styles.grid, { gap }]}>
      <Animated.View style={[{ width: itemWidth }, communityMotion]}>
        <Pressable
          onPress={() => router.push('/(tabs)/community')}
          accessibilityRole="button"
          accessibilityLabel="Open community"
        >
          <View style={styles.tile}>
            <View style={styles.tileTop}>
              <View style={[styles.iconWrap, styles.iconNavy]}>
                <Ionicons name="people" size={18} color={colors.yellow} />
              </View>
              {unread > 0 ? (
                <View style={styles.livePill}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveText}>{unread} new</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.tileTitle}>Community</Text>
            <Text style={styles.tileMeta}>
              {communityCount} professional post{communityCount === 1 ? '' : 's'}
            </Text>
            <View style={styles.tileFooter}>
              <Text style={styles.tileAction}>Join discussion</Text>
              <Ionicons name="arrow-forward" size={14} color={colors.navyLift} />
            </View>
          </View>
        </Pressable>
      </Animated.View>

      <Animated.View style={[{ width: itemWidth }, docsMotion]}>
        <Pressable
          onPress={() => router.push('/documents')}
          accessibilityRole="button"
          accessibilityLabel="Open documents"
        >
          <View style={[styles.tile, docsUrgent && styles.tileWarn]}>
            <View style={styles.tileTop}>
              <View style={[styles.iconWrap, docsUrgent ? styles.iconYellow : styles.iconNavy]}>
                <Ionicons
                  name={docsUrgent ? 'warning' : 'shield-checkmark'}
                  size={18}
                  color={docsUrgent ? colors.navy : colors.yellow}
                />
              </View>
              <View style={[styles.statusChip, docsUrgent ? styles.statusWarn : styles.statusOk]}>
                <Text style={[styles.statusText, docsUrgent ? styles.statusTextWarn : styles.statusTextOk]}>
                  {docsUrgent ? 'Action needed' : 'Up to date'}
                </Text>
              </View>
            </View>
            <Text style={styles.tileTitle}>Credentials</Text>
            <Text style={styles.tileMeta}>
              {docsUrgent
                ? `${documentsExpiring} expiring soon · ${documentsVerified} verified`
                : `${documentsVerified} verified documents`}
            </Text>
            <View style={styles.tileFooter}>
              <Text style={styles.tileAction}>{docsUrgent ? 'Renew now' : 'View vault'}</Text>
              <Ionicons name="arrow-forward" size={14} color={colors.navyLift} />
            </View>
          </View>
        </Pressable>
      </Animated.View>

      <Animated.View style={[{ width: contentWidth }, hoursMotion]}>
        <Pressable
          onPress={() => router.push('/shifts/calendar')}
          accessibilityRole="button"
          accessibilityLabel="View hours and shift calendar"
        >
          <LinearGradient
            colors={['#071A2F', '#0E2A47', '#123A5C']}
            locations={[0, 0.55, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hoursCard}
          >
            <View style={styles.hoursTop}>
              <View style={styles.hoursIcon}>
                <Ionicons name="time" size={18} color={colors.navy} />
              </View>
              <View style={styles.hoursCopy}>
                <Text style={styles.hoursEyebrow}>Clinical hours</Text>
                <Text style={styles.hoursTitle}>This month</Text>
              </View>
              <View style={styles.hoursStat}>
                <Text style={styles.hoursValue}>{hoursThisMonth}</Text>
                <Text style={styles.hoursUnit}>hrs</Text>
              </View>
            </View>

            <View style={styles.track}>
              <Animated.View style={[styles.fill, barStyle]} />
            </View>

            <View style={styles.hoursBottom}>
              <Text style={styles.hoursMeta}>
                {shiftsCompletedThisMonth > 0
                  ? `${shiftsCompletedThisMonth} shift${shiftsCompletedThisMonth === 1 ? '' : 's'} logged`
                  : 'Track progress toward your goal'}
                {' · '}
                Goal {hoursGoal}h
              </Text>
              <Text style={styles.hoursRemain}>
                {hoursLeft > 0 ? `${hoursLeft}h to go` : 'Goal reached'}
              </Text>
            </View>
          </LinearGradient>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.lg,
  },
  tile: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: spacing.lg,
    minHeight: 148,
    gap: 6,
  },
  tileWarn: {
    backgroundColor: colors.yellowLight,
  },
  tileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconNavy: {
    backgroundColor: colors.navy,
  },
  iconYellow: {
    backgroundColor: colors.yellow,
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
    color: colors.white,
  },
  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.full,
  },
  statusOk: {
    backgroundColor: colors.successLight,
  },
  statusWarn: {
    backgroundColor: colors.navy,
  },
  statusText: {
    fontFamily: typography.fonts.semibold,
    fontSize: 10,
  },
  statusTextOk: {
    color: colors.success,
  },
  statusTextWarn: {
    color: colors.yellow,
  },
  tileTitle: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 17,
    letterSpacing: -0.3,
    color: colors.navy,
  },
  tileMeta: {
    fontFamily: typography.fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
    flexGrow: 1,
  },
  tileFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  tileAction: {
    fontFamily: typography.fonts.semibold,
    fontSize: 12,
    color: colors.navyLift,
  },
  hoursCard: {
    borderRadius: radii.xl,
    padding: spacing.lg,
    gap: spacing.md,
    overflow: 'hidden',
  },
  hoursTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  hoursIcon: {
    width: 42,
    height: 42,
    borderRadius: radii.md,
    backgroundColor: colors.yellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hoursCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  hoursEyebrow: {
    fontFamily: typography.fonts.semibold,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.5)',
  },
  hoursTitle: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 17,
    letterSpacing: -0.3,
    color: colors.white,
  },
  hoursStat: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
  },
  hoursValue: {
    fontFamily: typography.fonts.displayExtra,
    fontSize: 32,
    lineHeight: 34,
    letterSpacing: -0.8,
    color: colors.yellow,
  },
  hoursUnit: {
    fontFamily: typography.fonts.semibold,
    fontSize: 13,
    color: 'rgba(255,255,255,0.55)',
    marginBottom: 4,
  },
  track: {
    height: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: colors.yellow,
  },
  hoursBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  hoursMeta: {
    flex: 1,
    fontFamily: typography.fonts.regular,
    fontSize: 12,
    lineHeight: 16,
    color: 'rgba(255,255,255,0.55)',
  },
  hoursRemain: {
    fontFamily: typography.fonts.semibold,
    fontSize: 12,
    color: colors.yellow,
  },
});
