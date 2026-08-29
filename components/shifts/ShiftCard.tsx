import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { OrganizationBadge } from '@/components/organizations/OrganizationBadge';
import { PositionsRemaining } from '@/components/shifts/PositionsRemaining';
import { ShiftMetaGrid } from '@/components/shifts/ShiftMeta';
import { ShiftStatusBadge } from '@/components/shifts/ShiftStatusBadge';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { clinical } from '@/constants/clinical';
import { colors, spacing, typography } from '@/constants/theme';
import type { Shift } from '@/types';
import { formatCurrency } from '@/utils/format';

type Props = {
  shift: Shift;
  showStatus?: boolean;
  ctaLabel?: string;
  onPress?: () => void;
};

export function ShiftCard({
  shift,
  showStatus = true,
  ctaLabel = 'View Shift',
  onPress,
}: Props) {
  const router = useRouter();

  const handlePress = () => {
    if (onPress) onPress();
    else router.push(`/shifts/${shift.id}`);
  };

  return (
    <Card style={styles.card} elevated>
      <View style={styles.accentRail} />

      <View style={styles.body}>
        <View style={styles.top}>
          <View style={styles.topLeft}>
            <OrganizationBadge
              name={shift.organizationName}
              verified={shift.organizationVerified}
              compact
            />
            <Text style={styles.role}>{shift.professionalRoleName}</Text>
            <Text style={styles.dept}>{shift.departmentName}</Text>
          </View>
          <View style={styles.badges}>
            {shift.urgent ? (
              <Badge
                label="Urgent"
                color={colors.navy}
                backgroundColor={colors.yellow}
                icon="flash"
              />
            ) : null}
            {showStatus && shift.status !== 'OPEN' ? (
              <ShiftStatusBadge status={shift.status} />
            ) : null}
          </View>
        </View>

        <ShiftMetaGrid shift={shift} />

        <View style={styles.divider} />

        <View style={styles.footer}>
          <View style={styles.payBlock}>
            <Text style={styles.payLabel}>Shift pay</Text>
            <Text style={styles.pay}>{formatCurrency(shift.pay, shift.currency)}</Text>
          </View>
          <Button
            label={ctaLabel}
            variant="dark"
            size="sm"
            fullWidth={false}
            onPress={handlePress}
            style={styles.cta}
          />
        </View>

        {shift.status === 'OPEN' && shift.remainingPositions > 0 ? (
          <PositionsRemaining
            remaining={shift.remainingPositions}
            required={shift.requiredWorkers}
          />
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
    padding: 0,
    overflow: 'hidden',
    borderColor: clinical.border,
    backgroundColor: colors.white,
  },
  accentRail: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: colors.yellow,
  },
  body: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingLeft: spacing.lg + 6,
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  topLeft: {
    flex: 1,
    minWidth: 140,
    gap: 4,
  },
  badges: {
    alignItems: 'flex-end',
    gap: spacing.xs,
    flexShrink: 0,
  },
  role: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: typography.size.md,
    lineHeight: 22,
    color: colors.navy,
    letterSpacing: -0.2,
    marginTop: 2,
  },
  dept: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.size.sm,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: clinical.border,
    marginBottom: spacing.md,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  payBlock: {
    flex: 1,
    minWidth: 120,
    gap: 2,
  },
  payLabel: {
    fontFamily: typography.fonts.medium,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.navyLift,
  },
  pay: {
    fontFamily: typography.fonts.displayExtra,
    fontSize: 26,
    lineHeight: 30,
    letterSpacing: -0.6,
    color: colors.navy,
  },
  cta: {
    minWidth: 112,
    paddingHorizontal: spacing.lg,
    flexGrow: 0,
  },
});
