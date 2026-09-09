import { Redirect, router } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AuthShell } from '@/components/auth/AuthShell';
import { Button } from '@/components/ui/Button';
import { colors, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';

export default function WorkerRejectedScreen() {
  const { session, loading, accountRejectionReason, signOut } = useAuth();

  if (!loading && !session) {
    return <Redirect href="/welcome" />;
  }

  if (!loading && !accountRejectionReason) {
    return <Redirect href="/" />;
  }

  return (
    <AuthShell
      title="Wrong app"
      subtitle="This account cannot use the worker mobile app."
      showBack={false}
    >
      <Text style={styles.body}>{accountRejectionReason}</Text>
      <View style={styles.actions}>
        <Button
          label="Sign out"
          variant="brand"
          onPress={async () => {
            await signOut();
            router.replace('/welcome');
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
