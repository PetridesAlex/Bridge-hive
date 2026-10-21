import { payoutSummaryLabel } from '@bridge-hive/domain';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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
import { MoneySummaryTile } from '@/components/payments/MoneySummaryTile';
import { PayoutCard } from '@/components/payments/PayoutCard';
import { AppScreen } from '@/components/ui/AppScreen';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { useTabBarScrollInset } from '@/components/navigation/AnimatedTabBar';
import { colors, radii, spacing, typography } from '@/constants/theme';
import { useInvoices } from '@/hooks/useInvoices';
import { usePayouts } from '@/hooks/usePayouts';
import { useAuth } from '@/providers/AuthProvider';

type MoneySegment = 'earnings' | 'invoices';

export default function MoneyScreen() {
  const { user } = useAuth();
  const tabScrollInset = useTabBarScrollInset(spacing.xl);
  const { payouts, account, loading: payoutLoading, error: payoutError, refresh: refreshPayouts } =
    usePayouts(user?.id);  const {
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

  const invoiceDue = invoiceTotals.open + invoiceTotals.pastDue;
  const invoiceHint =
    invoiceTotals.pastDue > 0
      ? 'Past due — pay now'
      : invoiceDue > 0
        ? 'Open commission due'
        : 'Platform commission';

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
        subtitle="Track earnings and commission in one place"
      />

      <View style={styles.intro}>
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(22,166,182,0.12)', 'rgba(11,42,67,0.04)', 'rgba(255,255,255,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.introAccent} />
        <Text style={styles.introTitle}>How pay works</Text>
        <Text style={styles.introBody}>
          Organizations pay approved shift earnings directly to you. Bridge Hive commission invoices
          stay separate and are paid in the app.
        </Text>
      </View>

      <View style={styles.summaries}>
        <MoneySummaryTile
          label="Earnings"
          amountMinor={earningsTotal}
          hint="Paid by organizations"
          icon="wallet-outline"
          selected={segment === 'earnings'}
          delayMs={40}
          onPress={() => setSegment('earnings')}
          accessibilityLabel={`Earnings ${earningsTotal === 0 ? 'zero euros' : ''}. View earnings`}
        />
        <MoneySummaryTile
          label="Invoices"
          amountMinor={invoiceDue}
          hint={invoiceHint}
          icon={invoiceTotals.pastDue > 0 ? 'alert-circle-outline' : 'receipt-outline'}
          selected={segment === 'invoices'}
          emphasis={invoiceTotals.pastDue > 0 ? 'alert' : 'default'}
          delayMs={90}
          onPress={() => setSegment('invoices')}
          accessibilityLabel={`Invoices. ${invoiceHint}. View invoices`}
        />
      </View>

      {segment === 'earnings' ? (
        <>
          <Pressable
            style={styles.accountCard}
            onPress={() => router.push('/payout-setup')}
            accessibilityRole="button"
            accessibilityLabel={
              account ? 'Manage payout account' : 'Set up payout account'
            }
          >
            <LinearGradient
              pointerEvents="none"
              colors={['rgba(11,42,67,0.04)', 'rgba(22,166,182,0.08)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.accountIcon}>
              <Ionicons name="card-outline" size={18} color={colors.white} />
            </View>
            <View style={styles.accountCopy}>
              <Text style={styles.accountTitle}>Payout account</Text>
              {account ? (
                <Text style={styles.accountValue}>
                  {account.masked_iban} · {payoutSummaryLabel(account.status)}
                </Text>
              ) : (
                <Text style={styles.accountValue}>Add your IBAN to receive earnings</Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.navyLift} />
          </Pressable>

          {payoutLoading && payouts.length === 0 ? (
            <SkeletonCard />
          ) : payoutError && payouts.length === 0 ? (
            <ErrorState title="Could not load earnings" onRetry={refreshPayouts} />
          ) : (
            <FlatList
              data={payouts}
              keyExtractor={(item) => item.id}
              contentContainerStyle={[styles.list, { paddingBottom: tabScrollInset }]}
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
          contentContainerStyle={[styles.list, { paddingBottom: tabScrollInset }]}
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
  intro: {
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingLeft: spacing.lg + 8,
    marginBottom: spacing.md,
    overflow: 'hidden',
    gap: 4,
  },
  introAccent: {
    position: 'absolute',
    left: 0,
    top: 14,
    bottom: 14,
    width: 3,
    borderRadius: 2,
    backgroundColor: colors.tealStrong,
  },
  introTitle: {
    fontFamily: typography.fonts.semibold,
    fontSize: 13,
    color: colors.navy,
  },
  introBody: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.textSecondary,
  },
  summaries: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
    overflow: 'hidden',
    minHeight: 72,
  },
  accountIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.navy,
  },
  accountCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  accountTitle: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.size.md,
    color: colors.text,
  },
  accountValue: {
    fontFamily: typography.fonts.medium,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
  },
  list: {
    paddingBottom: 0,
    gap: spacing.sm,
  },
  fullListLink: {
    marginBottom: spacing.sm,
  },
});
