import { Redirect, router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { AuthField } from '@/components/auth/AuthField';
import { AuthShell } from '@/components/auth/AuthShell';
import { Button } from '@/components/ui/Button';
import { colors, radii, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';

export default function WorkerLoginScreen() {
  const { signIn, resetPassword, session, loading, homeRoute } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  if (!loading && session) {
    return <Redirect href={homeRoute as never} />;
  }

  const onSubmit = async () => {
    setError(undefined);
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setSubmitting(true);
    const result = await signIn(email, password);
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.replace('/');
  };

  const onForgot = async () => {
    if (!email.trim()) {
      Alert.alert('Email required', 'Enter your email above, then tap Forgot password.');
      return;
    }
    const result = await resetPassword(email);
    if (result.error) {
      Alert.alert('Could not send reset', result.error);
      return;
    }
    Alert.alert('Check your email', 'We sent a password reset link if that account exists.');
  };

  return (
    <AuthShell
      title="Sign in"
      subtitle="Continue as a nurse or ward assistant."
      footer={
        <View style={styles.footer}>
          <Text style={styles.footerText}>New to Bridge Hive?</Text>
          <Pressable onPress={() => router.push('/auth/worker/register')}>
            <Text style={styles.footerLink}>Create account</Text>
          </Pressable>
        </View>
      }
    >
      <AuthField
        label="Email"
        icon="mail-outline"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
        placeholder="name@email.com"
      />
      <AuthField
        label="Password"
        icon="lock-closed-outline"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="password"
        textContentType="password"
        placeholder="Required"
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.actions}>
        <Button
          label="Continue"
          variant="brand"
          size="lg"
          loading={submitting}
          onPress={onSubmit}
          style={styles.cta}
        />
        <Pressable onPress={onForgot} hitSlop={10} style={styles.forgotBtn}>
          <Text style={styles.forgot}>Forgot password?</Text>
        </Pressable>
      </View>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  cta: {
    borderRadius: radii.full,
  },
  error: {
    fontFamily: typography.fonts.regular,
    fontSize: 13,
    color: colors.error,
  },
  forgotBtn: {
    alignSelf: 'center',
    paddingVertical: 4,
  },
  forgot: {
    fontFamily: typography.fonts.semibold,
    fontSize: 15,
    color: colors.navyLift,
    textAlign: 'center',
  },
  footer: {
    marginTop: spacing.xxl,
    alignItems: 'center',
    gap: 6,
  },
  footerText: {
    fontFamily: typography.fonts.regular,
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
  },
  footerLink: {
    fontFamily: typography.fonts.semibold,
    fontSize: 16,
    color: colors.yellow,
  },
});
