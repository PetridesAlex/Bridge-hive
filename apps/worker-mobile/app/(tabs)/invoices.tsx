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
import { AppReviewDemoBanner } from '@/components/review/AppReviewDemoBanner';
import { AppScreen } from '@/components/ui/AppScreen';
import { Banner } from '@/components/ui/Banner';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { MoneyAmount } from '@/components/ui/MoneyAmount';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { useTabBarScrollInset } from '@/components/navigation/AnimatedTabBar';
import { colors, radii, spacing, typography } from '@/constants/theme';
import { type InvoiceFilter, useInvoices } from '@/hooks/useInvoices';
import { useTranslation } from '@/i18n/locale-provider';
import { useAuth } from '@/providers/AuthProvider';

export default function InvoicesScreen() {
  const { user, isAppReviewDemo } = useAuth();
  const { t } = useTranslation();
  const tabScrollInset = useTabBarScrollInset(spacing.xl);
  const { invoices, allInvoices, loading, error, refresh, filter, setFilter } = useInvoices(user?.id);

  const FILTERS: { key: InvoiceFilter; label: string }[] = [
    { key: 'all', label: t('invoices.filterAll') },
    { key: 'open', label: t('invoices.filterOpen') },
    { key: 'past_due', label: t('invoices.filterPastDue') },
    { key: 'paid', label: t('invoices.filterPaid') },
  ];

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
        eyebrow={t('invoices.eyebrow')}
        title={t('invoices.title')}
        subtitle={t('invoices.subtitle')}
      />
      {isAppReviewDemo ? <AppReviewDemoBanner /> : null}
      <Banner
        variant="info"
        title={t('invoices.separateTitle')}
        body={t('invoices.separateBody')}
        style={styles.explainer}
      />

      <View style={styles.metrics}>
        <Metric label={t('invoices.open')} amountMinor={totals.open} />
        <Metric
          label={t('invoices.pastDue')}
          amountMinor={totals.pastDue}
          danger={totals.pastDue > 0}
        />
        <Metric label={t('invoices.paid')} amountMinor={totals.paid} />
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
        <ErrorState title={t('invoices.loadError')} onRetry={refresh} />
      ) : (
        <FlatList
          data={invoices}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.list, { paddingBottom: tabScrollInset }]}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
          ListEmptyComponent={
            <EmptyState
              title={t('invoices.empty')}
              description={t('invoices.emptyBody')}
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
    paddingBottom: 0,
    gap: spacing.md,
  },
});
