import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/ui/AppScreen';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Divider } from '@/components/ui/Divider';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { colors, invoiceStatusStyles, spacing, typography } from '@/constants/theme';
import { mockInvoices } from '@/data/mock';
import { useAuth } from '@/providers/AuthProvider';
import { formatCurrency, formatDate } from '@/utils/format';

/** Pre-render known invoice detail URLs for static web hosting. */
export function generateStaticParams(): { id: string }[] {
  return mockInvoices.map((invoice) => ({ id: invoice.id }));
}

export default function InvoiceDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { member } = useAuth();
  const invoice = mockInvoices.find((item) => item.id === id);

  if (!invoice) {
    return (
      <AppScreen>
        <ScreenHeader title="Invoice" showBack />
        <EmptyState title="Invoice not found" />
      </AppScreen>
    );
  }

  const status = invoiceStatusStyles[invoice.status];
  const totalHours = invoice.items.reduce((sum, item) => sum + item.hours, 0);

  return (
    <AppScreen>
      <ScreenHeader title="Invoice Details" showBack />

      <Card style={styles.hero}>
        <Text style={styles.number}>{invoice.invoiceNumber}</Text>
        <Text style={styles.period}>{invoice.periodLabel}</Text>
        <View style={styles.heroMeta}>
          <Badge label={status.label.toUpperCase()} color={status.fg} backgroundColor={status.bg} />
          <Text style={styles.professional}>{member.fullName}</Text>
        </View>
        <Text style={styles.total}>{formatCurrency(invoice.totalAmount, invoice.currency)}</Text>
        <Text style={styles.paymentStatus}>Payment Status: {invoice.paymentStatus}</Text>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Shift Breakdown</Text>
        {invoice.items.map((item) => (
          <View key={item.id}>
            <View style={styles.itemRow}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemDesc}>{item.description}</Text>
                <Text style={styles.itemMeta}>
                  {item.organizationName} · {formatDate(item.date, { weekday: undefined })} ·{' '}
                  {item.hours}h
                </Text>
              </View>
              <Text style={styles.itemAmount}>
                {formatCurrency(item.amount, invoice.currency)}
              </Text>
            </View>
            <Divider />
          </View>
        ))}
        <View style={styles.totals}>
          <Text style={styles.totalLabel}>Total Hours</Text>
          <Text style={styles.totalValue}>{totalHours}</Text>
        </View>
        <View style={styles.totals}>
          <Text style={styles.totalLabel}>Total Amount</Text>
          <Text style={styles.totalValueStrong}>
            {formatCurrency(invoice.totalAmount, invoice.currency)}
          </Text>
        </View>
      </Card>

      <Button
        label="Download Invoice"
        variant="primary"
        style={styles.download}
        onPress={() =>
          Alert.alert('Download Invoice', 'Phase 1 placeholder — PDF download comes in Phase 2.')
        }
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  hero: {
    marginBottom: spacing.lg,
  },
  number: {
    fontFamily: typography.fonts.bold,
    fontSize: typography.size.xl,
    color: colors.navy,
  },
  period: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    marginTop: 4,
  },
  heroMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  professional: {
    fontFamily: typography.fonts.medium,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    flexShrink: 1,
  },
  total: {
    fontFamily: typography.fonts.bold,
    fontSize: typography.size.xxxl,
    color: colors.navy,
    marginTop: spacing.lg,
  },
  paymentStatus: {
    fontFamily: typography.fonts.medium,
    fontSize: typography.size.sm,
    color: colors.success,
    marginTop: spacing.xs,
  },
  sectionTitle: {
    fontFamily: typography.fonts.bold,
    fontSize: typography.size.md,
    color: colors.navy,
    marginBottom: spacing.md,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  itemInfo: {
    flex: 1,
    minWidth: 160,
  },
  itemDesc: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.size.sm,
    color: colors.navy,
  },
  itemMeta: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  itemAmount: {
    fontFamily: typography.fonts.bold,
    fontSize: typography.size.sm,
    color: colors.navy,
  },
  totals: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  totalLabel: {
    fontFamily: typography.fonts.medium,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
  },
  totalValue: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.size.sm,
    color: colors.navy,
  },
  totalValueStrong: {
    fontFamily: typography.fonts.bold,
    fontSize: typography.size.lg,
    color: colors.navy,
  },
  download: {
    marginTop: spacing.xl,
  },
});
