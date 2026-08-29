import { Redirect, router } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AuthField } from '@/components/auth/AuthField';
import { AuthShell } from '@/components/auth/AuthShell';
import { Button } from '@/components/ui/Button';
import { colors, radii, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';

export default function AdminLoginScreen() {
  const { signIn, session, loading, homeRoute } = useAuth();
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
      setError('Enter your admin email and password.');
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

  return (
    <AuthShell
      title="Admin sign in"
      subtitle="Platform administrators only. Invitation required."
    >
      <AuthField
        label="Admin email"
        icon="shield-checkmark-outline"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
        placeholder="admin@healthbridge.app"
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
          variant="dark"
          size="lg"
          loading={submitting}
          onPress={onSubmit}
          style={styles.cta}
        />
        <Text style={styles.hint}>Access is granted by invitation only.</Text>
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
  hint: {
    fontFamily: typography.fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
