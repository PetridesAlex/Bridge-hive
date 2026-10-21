import * as Linking from 'expo-linking';
import { Redirect, router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AuthShell } from '@/components/auth/AuthShell';
import { Button } from '@/components/ui/Button';
import { colors, spacing, typography } from '@/constants/theme';
import { isRestrictedVerificationStatus } from '@/lib/home-route';
import { useAuth } from '@/providers/AuthProvider';

const SUPPORT_EMAIL = 'support@bridgehive.app';

export default function WorkerRestrictedScreen() {
  const { session, loading, workerProfile, homeRoute, signOut } = useAuth();

  if (!loading && !session) {
    return <Redirect href="/auth/worker/login" />;
  }

  if (
    !loading &&
    (!workerProfile || !isRestrictedVerificationStatus(workerProfile.verification_status))
  ) {
    return <Redirect href={homeRoute as never} />;
  }

  return (
    <AuthShell
      title="Your access is currently restricted"
      subtitle="Your account needs review before you can access new shifts."
      showBack={false}
    >
      <View style={styles.body}>
        <Text style={styles.copy}>
          You cannot browse or claim marketplace shifts while access is restricted.
          Contact Bridge Hive support if you need help with your account.
        </Text>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={`Email ${SUPPORT_EMAIL}`}
          onPress={() => void Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
          style={styles.support}
        >
          <Text style={styles.supportLabel}>Email support</Text>
          <Text style={styles.supportEmail}>{SUPPORT_EMAIL}</Text>
        </Pressable>
      </View>
      <View style={styles.actions}>
        <Button
          label="Sign out"
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
    gap: spacing.md,
  },
  copy: {
    fontFamily: typography.fonts.regular,
    fontSize: 15,
    lineHeight: 23,
    color: colors.textSecondary,
  },
  support: {
    gap: 4,
    paddingVertical: spacing.sm,
  },
  supportLabel: {
    fontFamily: typography.fonts.semibold,
    fontSize: 13,
    color: colors.textMuted,
  },
  supportEmail: {
    fontFamily: typography.fonts.semibold,
    fontSize: 16,
    color: colors.tealStrong,
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
});
