import { payoutSummaryLabel } from '@bridge-hive/domain';
import { router } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { PayoutCard } from '@/components/payments/PayoutCard';
import { AppScreen } from '@/components/ui/AppScreen';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { colors, spacing, typography } from '@/constants/theme';
import { usePayouts } from '@/hooks/usePayouts';
import { useAuth } from '@/providers/AuthProvider';

export default function PaymentsScreen() {
  const { user } = useAuth();
  const { payouts, account, loading, error, refresh } = usePayouts(user?.id);

  return (
    <AppScreen scroll={false} edges={['top']}>
      <ScreenHeader title="Payments" subtitle="Payouts and bank destination" />

      <View style={styles.accountCard}>
        <Text style={styles.accountTitle}>Payout account</Text>
        {account ? (
          <Text style={styles.accountValue}>
            {account.masked_iban} · {payoutSummaryLabel(account.status)}
          </Text>
        ) : (
          <Text style={styles.accountValue}>No payout account on file</Text>
        )}
        <Text style={styles.hint}>
          Only a masked IBAN is stored. Update account details and proof from payout setup.
        </Text>
        <Button
          label={account ? 'Manage payout account' : 'Set up payout account'}
          variant="brand"
          onPress={() => router.push('/payout-setup')}
        />
      </View>

      {loading && payouts.length === 0 ? (
        <ActivityIndicator color={colors.navy} style={{ marginTop: spacing.xl }} />
      ) : error && payouts.length === 0 ? (
        <EmptyState title="Could not load payouts" description={error} actionLabel="Retry" onAction={refresh} />
      ) : (
        <FlatList
          data={payouts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
          ListEmptyComponent={
            <EmptyState
              title="No payouts yet"
              description="Approved timesheets create payout snapshots here. Paid only after reconciliation."
            />
          }
          renderItem={({ item }) => <PayoutCard payout={item} />}
        />
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  accountCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  accountTitle: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 16,
    color: colors.text,
  },
  accountValue: {
    fontFamily: typography.fonts.medium,
    fontSize: 14,
    color: colors.navyLift,
  },
  hint: {
    fontFamily: typography.fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 16,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.huge,
    gap: spacing.md,
  },
});
