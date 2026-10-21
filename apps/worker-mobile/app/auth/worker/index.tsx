import { Redirect, router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AuthShell } from '@/components/auth/AuthShell';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { Button } from '@/components/ui/Button';
import { colors, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';

export default function WorkerAuthLandingScreen() {
  const { session, loading, homeRoute } = useAuth();

  if (!loading && session) {
    return <Redirect href={homeRoute as never} />;
  }

  return (
    <AuthShell
      title="Your BridgeHive workspace"
      subtitle="Sign in to manage shifts, documents, timesheets and payment records."
      showBack={false}
      footer={
        <View style={styles.footer}>
          <Text style={styles.footerText}>Already registered?</Text>
          <Pressable
            onPress={() => router.push('/auth/worker/login')}
            accessibilityRole="link"
            accessibilityLabel="Sign in"
          >
            <Text style={styles.footerLink}>Sign in</Text>
          </Pressable>
        </View>
      }
    >
      <View style={styles.actions}>
        <Button
          label="Create professional account"
          variant="primary"
          onPress={() => router.push('/auth/worker/register')}
        />
        <Button
          label="Sign in"
          variant="secondary"
          onPress={() => router.push('/auth/worker/login')}
        />
        <GoogleSignInButton />
      </View>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: spacing.md,
    width: '100%',
  },
  footer: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  footerText: {
    fontFamily: typography.fonts.regular,
    fontSize: 14,
    color: colors.textSecondary,
  },
  footerLink: {
    fontFamily: typography.fonts.semibold,
    fontSize: 15,
    color: colors.tealStrong,
  },
});
