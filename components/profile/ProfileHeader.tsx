import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { StarRating } from '@/components/profile/StarRating';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { brandGradient, colors, radii, shadows, spacing, typography } from '@/constants/theme';
import { PROFILE_RATING_SUMMARY } from '@/data/profileFeedback';
import { useLayout } from '@/hooks/useLayout';
import type { Member } from '@/types';

type Props = {
  member: Member;
};

export function ProfileHeader({ member }: Props) {
  const { isCompact } = useLayout();
  const verified = member.verificationStatus === 'VERIFIED';

  return (
    <View style={[styles.wrap, shadows.lg]}>
      <LinearGradient
        colors={[...brandGradient]}
        locations={[0, 0.55, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <View style={styles.glow} pointerEvents="none" />
        <View style={styles.accentBar} pointerEvents="none" />

        <View style={[styles.top, isCompact && styles.topCompact]}>
          <Avatar
            initials={member.avatarInitials}
            size={isCompact ? 68 : 80}
            backgroundColor="rgba(245,176,0,0.28)"
            textColor={colors.yellow}
          />
          <View style={styles.info}>
            <Text style={styles.kicker}>Professional profile</Text>
            <Text style={[styles.name, isCompact && styles.nameCompact]} numberOfLines={2}>
              {member.fullName}
            </Text>
            <Text style={styles.role}>
              {member.professionalRoleName}
              {member.speciality ? ` · ${member.speciality}` : ''}
            </Text>
            <Text style={styles.location}>
              {member.city}, Cyprus · {member.yearsExperience}+ years experience
            </Text>
            <View style={styles.badges}>
              {member.appRole === 'SUPER_ADMIN' ? (
                <Badge
                  label="Super Admin"
                  color={colors.navy}
                  backgroundColor={colors.yellow}
                  icon="shield"
                />
              ) : null}
              <Badge
                label={verified ? 'Verified professional' : 'Pending verification'}
                color={colors.navy}
                backgroundColor={verified ? colors.yellow : 'rgba(255,255,255,0.2)'}
                icon={verified ? 'shield-checkmark' : 'time'}
              />
            </View>
          </View>
        </View>

        <View style={styles.ratingRow}>
          <StarRating
            rating={PROFILE_RATING_SUMMARY.average}
            size={18}
            emptyColor="rgba(255,255,255,0.25)"
          />
          <Text style={styles.ratingText}>
            {PROFILE_RATING_SUMMARY.average.toFixed(1)} · {PROFILE_RATING_SUMMARY.totalReviews}{' '}
            reviews from hospitals & clinics
          </Text>
        </View>

        <View style={styles.stats}>
          <Stat label="Reliability" value={`${member.reliabilityPercent}%`} />
          <Stat label="Shifts" value={`${member.completedShifts}`} />
          <Stat label="Hours" value={member.hoursWorked.toLocaleString()} />
          <Stat label="Facilities" value={`${member.organizationsWorkedWith}`} />
        </View>
      </LinearGradient>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.statLabel} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.lg,
    borderRadius: radii.xl,
  },
  card: {
    borderRadius: radii.xl,
    padding: spacing.xl,
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    top: -40,
    right: -20,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(245,176,0,0.14)',
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
  top: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginBottom: spacing.lg,
  },
  topCompact: {
    gap: spacing.md,
  },
  info: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  kicker: {
    fontFamily: typography.fonts.medium,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.yellow,
  },
  name: {
    fontFamily: typography.fonts.displayExtra,
    fontSize: 24,
    lineHeight: 28,
    letterSpacing: -0.5,
    color: colors.white,
  },
  nameCompact: {
    fontSize: 20,
    lineHeight: 24,
  },
  role: {
    fontFamily: typography.fonts.medium,
    fontSize: 14,
    color: 'rgba(255,255,255,0.88)',
  },
  location: {
    fontFamily: typography.fonts.regular,
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: radii.md,
  },
  ratingText: {
    flex: 1,
    minWidth: 140,
    fontFamily: typography.fonts.regular,
    fontSize: 12,
    lineHeight: 16,
    color: 'rgba(255,255,255,0.72)',
  },
  stats: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    minWidth: 0,
  },
  statValue: {
    fontFamily: typography.fonts.displayExtra,
    fontSize: 18,
    color: colors.white,
  },
  statLabel: {
    fontFamily: typography.fonts.regular,
    fontSize: 10,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 2,
    textAlign: 'center',
  },
});
