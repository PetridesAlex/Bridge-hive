import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { StarRating } from '@/components/profile/StarRating';
import { colors, radii, spacing, typography } from '@/constants/theme';
import type { HospitalFeedback } from '@/types/feedback';
import { formatDate } from '@/utils/format';

type Props = {
  item: HospitalFeedback;
  featured?: boolean;
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function HospitalFeedbackCard({ item, featured = false }: Props) {
  const mark = useMemo(() => initials(item.organizationName), [item.organizationName]);

  return (
    <View style={[styles.card, featured && styles.cardFeatured]}>
      <View style={[styles.avatar, featured && styles.avatarFeatured]}>
        <Text style={[styles.avatarText, featured && styles.avatarTextFeatured]}>{mark}</Text>
      </View>

      <View style={styles.copy}>
        <Text style={[styles.org, featured && styles.textOnNavy]} numberOfLines={1}>
          {item.organizationName}
        </Text>
        <Text style={[styles.meta, featured && styles.metaOnNavy]} numberOfLines={1}>
          {item.departmentName} · {formatDate(item.reviewedAt, { weekday: undefined })}
        </Text>
      </View>

      <View style={[styles.rating, featured && styles.ratingFeatured]}>
        <Text style={[styles.score, featured && styles.scoreFeatured]}>
          {item.rating.toFixed(1)}
        </Text>
        <StarRating
          rating={item.rating}
          size={14}
          emptyColor={featured ? 'rgba(255,255,255,0.25)' : colors.border}
          showValue={false}
        />
      </View>

      {item.rating >= 5 ? (
        <View style={[styles.badge, featured && styles.badgeFeatured]}>
          <Ionicons name="star" size={11} color={featured ? colors.navy : colors.yellow} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: 72,
  },
  cardFeatured: {
    backgroundColor: colors.navy,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: radii.md,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFeatured: {
    backgroundColor: 'rgba(245,176,0,0.2)',
  },
  avatarText: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 13,
    color: colors.yellow,
  },
  avatarTextFeatured: {
    color: colors.yellow,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  org: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 15,
    letterSpacing: -0.25,
    color: colors.navy,
  },
  meta: {
    fontFamily: typography.fonts.regular,
    fontSize: 12,
    color: colors.textSecondary,
  },
  rating: {
    alignItems: 'flex-end',
    gap: 4,
  },
  ratingFeatured: {},
  score: {
    fontFamily: typography.fonts.displayExtra,
    fontSize: 18,
    letterSpacing: -0.4,
    color: colors.navy,
  },
  scoreFeatured: {
    color: colors.white,
  },
  badge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeFeatured: {
    backgroundColor: colors.yellow,
  },
  textOnNavy: {
    color: colors.white,
  },
  metaOnNavy: {
    color: 'rgba(255,255,255,0.6)',
  },
});
