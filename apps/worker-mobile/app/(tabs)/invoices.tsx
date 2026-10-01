import { router } from 'expo-router';
import React, { useMemo } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { InvoiceCard } from '@/components/invoices/InvoiceCard';
import { AppScreen } from '@/components/ui/AppScreen';
import { Banner } from '@/components/ui/Banner';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { MoneyAmount } from '@/components/ui/MoneyAmount';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { colors, radii, spacing, typography } from '@/constants/theme';
import { type InvoiceFilter, useInvoices } from '@/hooks/useInvoices';
import { useAuth } from '@/providers/AuthProvider';

const FILTERS: { key: InvoiceFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'past_due', label: 'Past due' },
  { key: 'paid', label: 'Paid' },
];

export default function InvoicesScreen() {
  const { user } = useAuth();
  const { invoices, allInvoices, loading, error, refresh, filter, setFilter } = useInvoices(user?.id);

  const totals = useMemo(() => {
    const open = allInvoices
      .filter((i) => i.status === 'open' || i.status === 'payment_processing')
      .reduce((sum, i) => sum + i.commission_amount_minor, 0);
    const pastDue = allInvoices
      .filter((i) => i.status === 'past_due')
      .reduce((sum, i) => sum + i.commission_amount_minor, 0);
    const paid = allInvoices
      .filter((i) => i.status === 'paid')
      .reduce((sum, i) => sum + i.commission_amount_minor, 0);
    return { open, pastDue, paid };
  }, [allInvoices]);

  return (
    <AppScreen scroll={false} edges={['top']}>
      <ScreenHeader
        eyebrow="Finances"
        title="Invoices"
        subtitle="Bridge Hive commission invoices"
      />
      <Banner
        variant="info"
        title="Separate from your shift pay"
        body="The organization pays your approved gross shift amount separately. This list is the Bridge Hive platform commission."
        style={styles.explainer}
      />

      <View style={styles.metrics}>
        <Metric label="Open" amountMinor={totals.open} />
        <Metric label="Past due" amountMinor={totals.pastDue} danger={totals.pastDue > 0} />
        <Metric label="Paid" amountMinor={totals.paid} />
      </View>

      <View style={styles.filters}>
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <Pressable
              key={f.key}
              onPress={() => setFilter(f.key)}
              style={[styles.chip, active ? styles.chipActive : null]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`Filter ${f.label}`}
            >
              <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>
                {f.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {loading && invoices.length === 0 ? (
        <View style={styles.list}>
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : error && invoices.length === 0 ? (
        <ErrorState title="Could not load invoices" onRetry={refresh} />
      ) : (
        <FlatList
          data={invoices}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
          ListEmptyComponent={
            <EmptyState
              title="No invoices yet"
              description="When an organization approves your timesheet, a Bridge Hive commission invoice appears here. Due in 10 calendar days."
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

function Metric({
  label,
  amountMinor,
  danger,
}: {
  label: string;
  amountMinor: number;
  danger?: boolean;
}) {
  return (
    <View style={[styles.metric, danger && styles.metricDanger]}>
      <Text style={styles.metricLabel}>{label}</Text>
      <MoneyAmount amountMinor={amountMinor} emphasize />
    </View>
  );
}

const styles = StyleSheet.create({
  explainer: {
    marginBottom: spacing.md,
  },
  metrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  metric: {
    flexGrow: 1,
    flexBasis: '30%',
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 4,
    minWidth: 100,
  },
  metricDanger: {
    borderColor: colors.error,
    backgroundColor: colors.errorLight,
  },
  metricLabel: {
    fontFamily: typography.fonts.semibold,
    fontSize: 11,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 36,
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.tealSoft,
    borderColor: colors.teal,
  },
  chipText: {
    fontFamily: typography.fonts.regular,
    fontSize: 13,
    color: colors.navy,
  },
  chipTextActive: {
    color: colors.tealStrong,
    fontFamily: typography.fonts.semibold,
  },
  list: {
    paddingBottom: spacing.huge,
    gap: spacing.md,
  },
});
