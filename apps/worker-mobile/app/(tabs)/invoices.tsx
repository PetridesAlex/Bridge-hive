import { router } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { InvoiceCard } from '@/components/invoices/InvoiceCard';
import { AppScreen } from '@/components/ui/AppScreen';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { colors, spacing, typography } from '@/constants/theme';
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
  const { invoices, loading, error, refresh, filter, setFilter } = useInvoices(user?.id);

  return (
    <AppScreen scroll={false} edges={['top']}>
      <ScreenHeader
        title="Invoices"
        subtitle="Bridge Hive commission invoices"
      />

      <View style={styles.filters}>
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <Pressable
              key={f.key}
              onPress={() => setFilter(f.key)}
              style={[styles.chip, active ? styles.chipActive : null]}
            >
              <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>
                {f.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {loading && invoices.length === 0 ? (
        <ActivityIndicator color={colors.navy} style={{ marginTop: spacing.xl }} />
      ) : error && invoices.length === 0 ? (
        <EmptyState
          title="Could not load invoices"
          description={error}
          actionLabel="Retry"
          onAction={refresh}
        />
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

const styles = StyleSheet.create({
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  chipText: {
    fontFamily: typography.fonts.regular,
    fontSize: 12,
    color: colors.navy,
  },
  chipTextActive: {
    color: colors.white,
    fontFamily: typography.fonts.semibold,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.huge,
    gap: spacing.md,
  },
});
