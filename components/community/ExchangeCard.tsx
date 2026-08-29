import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { colors, spacing, typography } from '@/constants/theme';
import type { ShiftExchangeListing } from '@/types';
import {
  formatCurrency,
  formatDayLabel,
  formatTimeRange,
} from '@/utils/format';

type Props = {
  listing: ShiftExchangeListing;
};

export function ExchangeCard({ listing }: Props) {
  const router = useRouter();

  return (
    <Card style={styles.card}>
      <View style={styles.top}>
        <Badge
          label={listing.urgent ? 'URGENT TRANSFER' : 'AVAILABLE FOR TRANSFER'}
          color={listing.urgent ? colors.navy : colors.blue}
          backgroundColor={listing.urgent ? colors.yellow : colors.blueLight}
          icon={listing.urgent ? 'flash' : 'swap-horizontal'}
        />
      </View>
      <Text style={styles.member}>
        {listing.fromMemberName} · {listing.professionalRoleName} ✓
      </Text>
      <Text style={styles.org}>{listing.organizationName}</Text>
      <Text style={styles.dept}>{listing.departmentName}</Text>
      <Text style={styles.meta}>
        {listing.urgent ? 'Starts Tonight' : formatDayLabel(listing.date)} ·{' '}
        {formatTimeRange(listing.startTime, listing.endTime)} · {listing.city}
      </Text>
      <View style={styles.footer}>
        <Text style={styles.pay}>{formatCurrency(listing.pay, listing.currency)}</Text>
        <Button
          label="View Shift"
          variant="primary"
          size="sm"
          fullWidth={false}
          onPress={() => router.push(`/shifts/${listing.shiftId}`)}
          style={styles.btn}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
  },
  top: {
    marginBottom: spacing.sm,
  },
  member: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.size.md,
    color: colors.navy,
  },
  org: {
    fontFamily: typography.fonts.medium,
    fontSize: typography.size.sm,
    color: colors.text,
    marginTop: 2,
  },
  dept: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
  },
  meta: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  pay: {
    fontFamily: typography.fonts.bold,
    fontSize: typography.size.xl,
    color: colors.navy,
    flexShrink: 1,
  },
  btn: {
    minWidth: 100,
    flexGrow: 0,
  },
});
