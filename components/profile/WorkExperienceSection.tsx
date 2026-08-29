import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ProfileDetailList } from '@/components/profile/ProfileDetailList';
import { Card } from '@/components/ui/Card';
import { colors, spacing, typography } from '@/constants/theme';
import type { Member } from '@/types';

type Props = {
  member: Member;
};

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export function WorkExperienceSection({ member }: Props) {
  return (
    <View style={styles.wrap}>
      <Card padded={false} style={styles.statsCard}>
        <View style={styles.statsRow}>
          <Stat label="Completed" value={`${member.completedShifts}`} />
          <View style={styles.statDivider} />
          <Stat label="Hours" value={member.hoursWorked.toLocaleString()} />
          <View style={styles.statDivider} />
          <Stat label="Orgs" value={`${member.organizationsWorkedWith}`} />
        </View>
      </Card>

      <ProfileDetailList
        sectionLabel="Career summary"
        help="These totals reflect completed HealthBridge shifts across Cyprus hospitals and clinics."
        rows={[
          {
            label: 'Completed shifts',
            value: `${member.completedShifts}`,
            icon: 'checkmark-done-outline',
          },
          {
            label: 'Hours worked',
            value: member.hoursWorked.toLocaleString(),
            icon: 'time-outline',
          },
          {
            label: 'Organizations',
            value: `${member.organizationsWorkedWith}`,
            icon: 'business-outline',
          },
          {
            label: 'Primary market',
            value: 'Cyprus',
            icon: 'globe-outline',
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
  statsCard: {
    overflow: 'hidden',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.sm,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
  statValue: {
    fontFamily: typography.fonts.bold,
    fontSize: typography.size.xxl,
    color: colors.navy,
  },
  statLabel: {
    fontFamily: typography.fonts.medium,
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
});
