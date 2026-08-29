import React, { useState } from 'react';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { BalanceCard } from '@/components/finance/BalanceCard';
import { InvoiceCard } from '@/components/finance/InvoiceCard';
import { PaymentRow } from '@/components/finance/PaymentRow';
import { AppScreen } from '@/components/ui/AppScreen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { colors } from '@/constants/theme';
import { mockInvoices, mockPayments } from '@/data/mock';
import { useAuth } from '@/providers/AuthProvider';

const TABS = [
  {
    key: 'payments',
    label: 'Payments',
    icon: 'card-outline' as const,
    iconFocused: 'card' as const,
    badge: mockPayments.length,
    accent: colors.blue,
  },
  {
    key: 'invoices',
    label: 'Invoices',
    icon: 'document-text-outline' as const,
    iconFocused: 'document-text' as const,
    badge: mockInvoices.length,
    accent: colors.yellow,
  },
];

export default function FinancesScreen() {
  const [tab, setTab] = useState('payments');
  const { member } = useAuth();

  return (
    <AppScreen>
      <ScreenHeader title="Finances" subtitle="Earnings & invoices" />
      <BalanceCard member={member} />
      <SegmentedTabs tabs={TABS} activeKey={tab} onChange={setTab} />

      {tab === 'payments' ? (
        <Animated.View key="payments" entering={FadeIn.duration(220)} exiting={FadeOut.duration(120)}>
          {mockPayments.map((payment, index) => (
            <PaymentRow key={payment.id} payment={payment} index={index} />
          ))}
        </Animated.View>
      ) : null}

      {tab === 'invoices' ? (
        <Animated.View key="invoices" entering={FadeIn.duration(220)} exiting={FadeOut.duration(120)}>
          {mockInvoices.map((invoice, index) => (
            <InvoiceCard key={invoice.id} invoice={invoice} index={index} />
          ))}
        </Animated.View>
      ) : null}
    </AppScreen>
  );
}
