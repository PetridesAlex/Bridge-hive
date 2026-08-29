import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { colors, spacing, typography } from '@/constants/theme';
import type { ReplacementCandidate } from '@/types';

type Props = {
  candidate: ReplacementCandidate;
  onRequest: () => void;
};

export function ReplacementCard({ candidate, onRequest }: Props) {
  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <Avatar initials={candidate.avatarInitials} size={48} />
        <View style={styles.info}>
          <Text style={styles.name}>{candidate.fullName}</Text>
          <Text style={styles.role}>{candidate.professionalRoleName}</Text>
          <View style={styles.badges}>
            {candidate.verified ? (
              <Badge label="Verified ✓" color={colors.success} backgroundColor={colors.successLight} />
            ) : null}
            {candidate.available ? (
              <Badge label="Available ✓" color={colors.blue} backgroundColor={colors.blueLight} />
            ) : null}
          </View>
          {candidate.workedAtHospitalBefore ? (
            <Text style={styles.note}>Worked at this hospital before ✓</Text>
          ) : null}
          <Text style={styles.reliability}>Reliability: {candidate.reliabilityPercent}%</Text>
        </View>
      </View>
      <Button label="Request Transfer" variant="brand" onPress={onRequest} />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
    gap: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  info: {
    flex: 1,
    gap: 4,
  },
  name: {
    fontFamily: typography.fonts.bold,
    fontSize: typography.size.lg,
    color: colors.navy,
  },
  role: {
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
  note: {
    fontFamily: typography.fonts.medium,
    fontSize: typography.size.xs,
    color: colors.success,
    marginTop: 2,
  },
  reliability: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.size.sm,
    color: colors.navy,
    marginTop: spacing.xs,
  },
});
