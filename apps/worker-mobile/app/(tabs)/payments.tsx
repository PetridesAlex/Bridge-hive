import { payoutSummaryLabel } from '@bridge-hive/domain';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { InvoiceCard } from '@/components/invoices/InvoiceCard';
import { PayoutCard } from '@/components/payments/PayoutCard';
import { AppScreen } from '@/components/ui/AppScreen';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { MoneyAmount } from '@/components/ui/MoneyAmount';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { colors, radii, spacing, typography } from '@/constants/theme';
import { useInvoices } from '@/hooks/useInvoices';
import { usePayouts } from '@/hooks/usePayouts';
import { useAuth } from '@/providers/AuthProvider';

type MoneySegment = 'earnings' | 'invoices';

export default function MoneyScreen() {
  const { user } = useAuth();
  const { payouts, account, loading: payoutLoading, error: payoutError, refresh: refreshPayouts } =
    usePayouts(user?.id);
  const {
    invoices,
    allInvoices,
    loading: invoiceLoading,
    error: invoiceError,
    refresh: refreshInvoices,
  } = useInvoices(user?.id);
  const [segment, setSegment] = useState<MoneySegment>('earnings');

  const invoiceTotals = useMemo(() => {
    const open = allInvoices
      .filter((i) => i.status === 'open' || i.status === 'payment_processing')
      .reduce((sum, i) => sum + i.commission_amount_minor, 0);
    const pastDue = allInvoices
      .filter((i) => i.status === 'past_due')
      .reduce((sum, i) => sum + i.commission_amount_minor, 0);
    return { open, pastDue };
  }, [allInvoices]);

  const earningsTotal = useMemo(
    () => payouts.reduce((sum, p) => sum + (p.gross_amount_minor ?? 0), 0),
    [payouts],
  );

  const onRefresh = () => {
    void refreshPayouts();
    void refreshInvoices();
  };

  const loading = payoutLoading || invoiceLoading;

  return (
    <AppScreen scroll={false} edges={['top']}>
      <ScreenHeader
        eyebrow="Finances"
        title="Money"
        subtitle="Earnings and Bridge Hive invoices"
      />

      <Text style={styles.explainer}>
        Organizations pay your approved shift earnings directly. Bridge Hive commission invoices are
        separate and paid through the app.
      </Text>

      <View style={styles.summaries}>
        <Pressable
          style={styles.summaryCard}
          onPress={() => setSegment('earnings')}
          accessibilityRole="button"
          accessibilityLabel="View earnings"
        >
          <Text style={styles.summaryLabel}>Earnings</Text>
          <MoneyAmount amountMinor={earningsTotal} emphasize />
          <Text style={styles.summaryHint}>Gross shift amounts from organizations</Text>
        </Pressable>
        <Pressable
          style={styles.summaryCard}
          onPress={() => setSegment('invoices')}
          accessibilityRole="button"
          accessibilityLabel="View invoices"
        >
          <Text style={styles.summaryLabel}>Invoices</Text>
          <MoneyAmount
            amountMinor={invoiceTotals.open + invoiceTotals.pastDue}
            emphasize
          />
          <Text style={styles.summaryHint}>
            {invoiceTotals.pastDue > 0 ? 'Past due — action needed' : 'Bridge Hive commission'}
          </Text>
        </Pressable>
      </View>

      <SegmentedTabs
        tabs={[
          { key: 'earnings', label: 'Earnings' },
          { key: 'invoices', label: 'Invoices' },
        ]}
        activeKey={segment}
        onChange={(key) => setSegment(key as MoneySegment)}
      />

      {segment === 'earnings' ? (
        <>
          <View style={styles.accountCard}>
            <Text style={styles.accountTitle}>Payout account</Text>
            {account ? (
              <Text style={styles.accountValue}>
                {account.masked_iban} · {payoutSummaryLabel(account.status)}
              </Text>
            ) : (
              <Text style={styles.accountValue}>No payout account on file</Text>
            )}
            <Button
              label={account ? 'Manage payout account' : 'Set up payout account'}
              variant="secondary"
              size="sm"
              onPress={() => router.push('/payout-setup')}
            />
          </View>

          {payoutLoading && payouts.length === 0 ? (
            <SkeletonCard />
          ) : payoutError && payouts.length === 0 ? (
            <ErrorState title="Could not load earnings" onRetry={refreshPayouts} />
          ) : (
            <FlatList
              data={payouts}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.list}
              refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} />}
              ListEmptyComponent={
                <EmptyState
                  title="No earnings yet"
                  description="Approved timesheets create payout snapshots here. Paid only after reconciliation."
                />
              }
              renderItem={({ item }) => <PayoutCard payout={item} />}
            />
          )}
        </>
      ) : invoiceLoading && invoices.length === 0 ? (
        <SkeletonCard />
      ) : invoiceError && invoices.length === 0 ? (
        <ErrorState title="Could not load invoices" onRetry={refreshInvoices} />
      ) : (
        <FlatList
          data={invoices}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <EmptyState
              title="No invoices yet"
              description="When an organization approves your timesheet, a Bridge Hive commission invoice appears here."
            />
          }
          ListHeaderComponent={
            <Button
              label="Open full invoice list"
              variant="ghost"
              size="sm"
              onPress={() => router.push('/(tabs)/invoices')}
              style={styles.fullListLink}
            />
          }
          renderItem={({ item }) => (
            <InvoiceCard
              invoice={item}
              onPress={() => router.push(`/invoices/${item.id}`)}
            />
          )}
        />
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  explainer: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  summaries: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 4,
    minHeight: 96,
  },
  summaryLabel: {
    fontFamily: typography.fonts.semibold,
    fontSize: 11,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  summaryHint: {
    fontFamily: typography.fonts.regular,
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  accountCard: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  accountTitle: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.size.lg,
    color: colors.text,
  },
  accountValue: {
    fontFamily: typography.fonts.medium,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
  },
  list: {
    paddingBottom: spacing.huge,
    gap: spacing.sm,
  },
  fullListLink: {
    marginBottom: spacing.sm,
  },
});
