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
      title="How would you like to continue?"
      subtitle="Create a professional account or sign in to manage shifts, documents and payment records."
      showBack={false}
      centered
      compact
      footer={
        <View style={styles.footer}>
          <Text style={styles.footerText}>Prefer email later?</Text>
          <Pressable
            onPress={() => router.push('/auth/worker/login')}
            accessibilityRole="link"
            accessibilityLabel="Sign in with email"
            hitSlop={8}
            style={styles.footerLinkHit}
          >
            <Text style={styles.footerLink}>Sign in with email</Text>
          </Pressable>
        </View>
      }
    >
      <View style={styles.actions}>
        <Button
          label="Create professional account"
          variant="primary"
          size="lg"
          onPress={() => router.push('/auth/worker/register')}
        />
        <Button
          label="Sign in"
          variant="secondary"
          size="lg"
          onPress={() => router.push('/auth/worker/login')}
        />
        <View style={styles.googleWrap}>
          <GoogleSignInButton />
        </View>
      </View>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: spacing.md,
    width: '100%',
  },
  googleWrap: {
    marginTop: spacing.xs,
  },
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 44,
  },
  footerText: {
    fontFamily: typography.fonts.regular,
    fontSize: 14,
    color: colors.textSecondary,
  },
  footerLinkHit: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  footerLink: {
    fontFamily: typography.fonts.semibold,
    fontSize: 15,
    color: colors.tealStrong,
  },
});
