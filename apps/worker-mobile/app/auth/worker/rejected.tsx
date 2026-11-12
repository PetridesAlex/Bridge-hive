import { Redirect, router } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AuthShell } from '@/components/auth/AuthShell';
import { Button } from '@/components/ui/Button';
import { colors, spacing, typography } from '@/constants/theme';
import { useTranslation } from '@/i18n/locale-provider';
import { useAuth } from '@/providers/AuthProvider';

export default function WorkerRejectedScreen() {
  const { session, loading, accountRejectionReason, signOut } = useAuth();
  const { t } = useTranslation();

  if (!loading && !session) {
    return <Redirect href="/auth/worker/login" />;
  }

  if (!loading && !accountRejectionReason) {
    return <Redirect href="/" />;
  }

  return (
    <AuthShell
      title={t('auth.rejectedTitle')}
      subtitle={t('auth.rejectedBody')}
      showBack={false}
    >
      <Text style={styles.body}>{accountRejectionReason}</Text>
      <View style={styles.actions}>
        <Button
          label={t('profile.deleteAccount')}
          variant="ghost"
          onPress={() => router.push('/delete-account')}
        />
        <Button
          label={t('profile.signOut')}
          variant="brand"
          onPress={async () => {
            await signOut();
            router.replace('/auth/worker/login');
          }}
        />
      </View>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  body: {
    fontFamily: typography.fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
  },
  actions: { gap: spacing.sm, marginTop: spacing.md },
});
