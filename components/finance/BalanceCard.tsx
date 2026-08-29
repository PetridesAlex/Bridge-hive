import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, shadows, spacing, typography } from '@/constants/theme';
import { useLayout } from '@/hooks/useLayout';
import type { Member } from '@/types';
import { formatCurrency } from '@/utils/format';

type Props = {
  member: Member;
};

export function BalanceCard({ member }: Props) {
  const { isCompact } = useLayout();

  return (
    <LinearGradient
      colors={[colors.navy, colors.navySoft]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.card, shadows.lg, isCompact && styles.cardCompact]}
    >
      <View style={styles.top}>
        <Text style={styles.label}>Available</Text>
        <Ionicons name="card-outline" size={20} color={colors.yellow} />
      </View>
      <Text style={[styles.amount, isCompact && styles.amountCompact]} numberOfLines={1}>
        {formatCurrency(member.availableEarnings)}
      </Text>
      <View style={[styles.row, isCompact && styles.rowCompact]}>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Pending</Text>
          <Text style={styles.statValue} numberOfLines={1}>
            {formatCurrency(member.pendingEarnings)}
          </Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Paid This Month</Text>
          <Text style={styles.statValue} numberOfLines={1}>
            {formatCurrency(member.paidThisMonth)}
          </Text>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.xl,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    width: '100%',
  },
  cardCompact: {
    padding: spacing.lg,
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontFamily: typography.fonts.medium,
    fontSize: typography.size.xs,
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  amount: {
    fontFamily: typography.fonts.bold,
    fontSize: typography.size.display,
    color: colors.white,
    marginVertical: spacing.sm,
  },
  amountCompact: {
    fontSize: typography.size.xxxl,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.xl,
    marginTop: spacing.md,
  },
  rowCompact: {
    gap: spacing.md,
  },
  stat: {
    flex: 1,
    minWidth: 0,
  },
  statLabel: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.size.xs,
    color: 'rgba(255,255,255,0.65)',
  },
  statValue: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.size.lg,
    color: colors.white,
    marginTop: 2,
  },
});
