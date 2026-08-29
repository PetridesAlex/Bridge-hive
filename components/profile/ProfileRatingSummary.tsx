import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { StarRating } from '@/components/profile/StarRating';
import { PROFILE_RATING_SUMMARY } from '@/data/profileFeedback';
import { colors, radii, spacing, typography } from '@/constants/theme';

const CATEGORIES: { key: keyof typeof PROFILE_RATING_SUMMARY.categoryAverages; label: string }[] = [
  { key: 'clinicalSkill', label: 'Clinical skill' },
  { key: 'reliability', label: 'Reliability' },
  { key: 'communication', label: 'Communication' },
  { key: 'teamwork', label: 'Teamwork' },
];

export function ProfileRatingSummary() {
  const { average, totalReviews, recommendationRate, distribution, categoryAverages } =
    PROFILE_RATING_SUMMARY;
  const maxCount = Math.max(...distribution.map((d) => d.count), 1);

  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <View style={styles.scoreBlock}>
          <Text style={styles.scoreEyebrow}>Overall</Text>
          <Text style={styles.score}>{average.toFixed(1)}</Text>
          <StarRating rating={average} size={16} emptyColor="rgba(7,26,47,0.15)" showValue={false} />
          <Text style={styles.reviews}>{totalReviews} hospital reviews</Text>
        </View>

        <View style={styles.bars}>
          {distribution.map((row) => {
            const pct = Math.round((row.count / maxCount) * 100);
            return (
              <View key={row.stars} style={styles.barRow}>
                <Text style={styles.barLabel}>{row.stars}</Text>
                <Ionicons name="star" size={10} color={colors.yellow} />
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${pct}%` }]} />
                </View>
                <Text style={styles.barCount}>{row.count}</Text>
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statPill}>
          <Text style={styles.statValue}>{recommendationRate}%</Text>
          <Text style={styles.statLabel}>Would book again</Text>
        </View>
        <View style={styles.statPill}>
          <Text style={styles.statValue}>{distribution[0].count}</Text>
          <Text style={styles.statLabel}>Five-star reviews</Text>
        </View>
      </View>

      <View style={styles.categories}>
        <Text style={styles.categoriesTitle}>Performance by skill</Text>
        {CATEGORIES.map((cat) => {
          const value = categoryAverages[cat.key];
          return (
            <View key={cat.key} style={styles.category}>
              <Text style={styles.categoryLabel}>{cat.label}</Text>
              <View style={styles.categoryTrack}>
                <View style={[styles.categoryFill, { width: `${(value / 5) * 100}%` }]} />
              </View>
              <Text style={styles.categoryValue}>{value.toFixed(1)}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: spacing.lg,
    marginBottom: spacing.xxl,
    gap: spacing.lg,
  },
  top: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  scoreBlock: {
    width: 112,
    backgroundColor: colors.navy,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    alignItems: 'flex-start',
    gap: 6,
  },
  scoreEyebrow: {
    fontFamily: typography.fonts.semibold,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.55)',
  },
  score: {
    fontFamily: typography.fonts.displayExtra,
    fontSize: 42,
    lineHeight: 44,
    letterSpacing: -1.2,
    color: colors.white,
  },
  reviews: {
    fontFamily: typography.fonts.regular,
    fontSize: 11,
    lineHeight: 15,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  bars: {
    flex: 1,
    gap: 8,
    justifyContent: 'center',
    paddingVertical: 2,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  barLabel: {
    width: 10,
    fontFamily: typography.fonts.semibold,
    fontSize: 11,
    color: colors.navy,
  },
  barTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.blueLight,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: colors.yellow,
  },
  barCount: {
    width: 18,
    textAlign: 'right',
    fontFamily: typography.fonts.semibold,
    fontSize: 11,
    color: colors.textMuted,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statPill: {
    flex: 1,
    backgroundColor: colors.yellowLight,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: 2,
  },
  statValue: {
    fontFamily: typography.fonts.displayExtra,
    fontSize: 20,
    letterSpacing: -0.4,
    color: colors.navy,
  },
  statLabel: {
    fontFamily: typography.fonts.medium,
    fontSize: 12,
    color: colors.navySoft,
  },
  categories: {
    gap: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  categoriesTitle: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 13,
    letterSpacing: -0.2,
    color: colors.navy,
    marginBottom: 2,
  },
  category: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  categoryLabel: {
    width: 108,
    fontFamily: typography.fonts.medium,
    fontSize: 13,
    color: colors.navySoft,
  },
  categoryTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.blueLight,
    overflow: 'hidden',
  },
  categoryFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: colors.navyLift,
  },
  categoryValue: {
    width: 28,
    textAlign: 'right',
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 13,
    color: colors.navy,
  },
});
