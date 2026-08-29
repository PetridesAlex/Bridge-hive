import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ProfileDetailList } from '@/components/profile/ProfileDetailList';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { colors, spacing, typography } from '@/constants/theme';
import type { Member } from '@/types';

type Props = {
  member: Member;
};

export function ProfessionalInfoSection({ member }: Props) {
  return (
    <View style={styles.wrap}>
      <Card style={styles.summary}>
        <Text style={styles.role}>{member.professionalRoleName}</Text>
        <Text style={styles.sub}>Cyprus healthcare professional</Text>
        <View style={styles.badges}>
          <Badge
            label="Verified"
            color={colors.blue}
            backgroundColor={colors.blueLight}
            icon="shield-checkmark"
          />
          <Badge
            label={`${member.reliabilityPercent}% reliability`}
            color={colors.success}
            backgroundColor={colors.successLight}
            icon="checkmark-circle"
          />
        </View>
      </Card>

      <ProfileDetailList
        sectionLabel="Professional details"
        rows={[
          { label: 'Role', value: member.professionalRoleName, icon: 'medkit-outline' },
          {
            label: 'Verification',
            value: 'Verified Professional',
            icon: 'shield-checkmark-outline',
            badge: 'Verified',
            badgeTone: 'blue',
          },
          {
            label: 'Experience',
            value: `${member.yearsExperience} years`,
            icon: 'time-outline',
          },
          {
            label: 'Reliability',
            value: `${member.reliabilityPercent}%`,
            icon: 'stats-chart-outline',
            badge: 'Excellent',
            badgeTone: 'success',
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.lg,
  },
  summary: {
    gap: spacing.sm,
  },
  role: {
    fontFamily: typography.fonts.bold,
    fontSize: typography.size.xl,
    color: colors.navy,
  },
  sub: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
});
