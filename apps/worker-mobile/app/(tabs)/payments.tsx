import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { TextInput } from '@/components/ui/TextInput';
import { APP_CONFIG } from '@/constants/config';
import { colors, spacing, typography } from '@/constants/theme';
import { usePayouts } from '@/hooks/usePayouts';
import { submitPayoutAccount } from '@/lib/rpcs';
import { useAuth } from '@/providers/AuthProvider';
import { maskIban } from '@/utils/format';

export default function PaymentsScreen() {
  const { user } = useAuth();
  const { payouts, account, loading, error, refresh } = usePayouts(user?.id);
  const [ibanInput, setIbanInput] = useState('');
  const [saving, setSaving] = useState(false);

  const onSaveAccount = async () => {
    const masked = maskIban(ibanInput);
    if (masked === '••••') {
      Alert.alert('Invalid IBAN', 'Enter a valid IBAN. Only a masked form is stored.');
      return;
    }
    setSaving(true);
    const result = await submitPayoutAccount({
      country: APP_CONFIG.countryCode,
      currency: APP_CONFIG.currency,
      maskedIban: masked,
    });
    setSaving(false);
    if (result.error) {
      Alert.alert('Could not save account', result.error);
      return;
    }
    setIbanInput('');
    Alert.alert('Saved', `Payout account submitted as ${masked}. Awaiting verification.`);
    void refresh();
  };

  return (
    <AppScreen scroll={false} edges={['top']}>
      <ScreenHeader title="Payments" subtitle="Payouts and bank destination" />

      <View style={styles.accountCard}>
        <Text style={styles.accountTitle}>Payout account</Text>
        {account ? (
          <Text style={styles.accountValue}>
            {account.masked_iban} · {account.status}
          </Text>
        ) : (
          <Text style={styles.accountValue}>No payout account on file</Text>
        )}
        <Text style={styles.hint}>
          Only a masked IBAN is stored (e.g. CY••••6789). Never enter secrets in chat or logs.
        </Text>
        <TextInput
          label="IBAN (will be masked before save)"
          value={ibanInput}
          onChangeText={setIbanInput}
          autoCapitalize="characters"
          autoCorrect={false}
        />
        <Button label="Submit payout account" variant="brand" loading={saving} onPress={onSaveAccount} />
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
    textTransform: 'capitalize',
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
