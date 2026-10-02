import { Redirect, router } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AuthShell } from '@/components/auth/AuthShell';
import { Button } from '@/components/ui/Button';
import { TextInput } from '@/components/ui/TextInput';
import { APP_CONFIG } from '@/constants/config';
import { colors, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';

export default function WorkerResetPasswordScreen() {
  const { session, loading, updatePassword, homeRoute, signOut } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();
  const [done, setDone] = useState(false);

  if (!loading && !session) {
    return <Redirect href="/auth/worker/login" />;
  }

  const onSubmit = async () => {
    setError(undefined);
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setSubmitting(true);
    const result = await updatePassword(password);
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setDone(true);
  };

  return (
    <AuthShell
      title="Set a new password"
      subtitle="Choose a new password for your Bridge Hive worker account."
      showBack={false}
      centered={false}
    >
      {done ? (
        <View style={styles.fields}>
          <Text style={styles.success}>Your password was updated.</Text>
          <Button
            label="Continue"
            variant="primary"
            onPress={() => router.replace(homeRoute as never)}
          />
        </View>
      ) : (
        <View style={styles.fields}>
          <TextInput
            label="New password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <TextInput
            label="Confirm password"
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button
            label="Update password"
            variant="primary"
            loading={submitting}
            onPress={() => void onSubmit()}
          />
          <Button
            label="Cancel"
            variant="ghost"
            onPress={() => void signOut().then(() => router.replace('/auth/worker/login'))}
          />
        </View>
      )}
      <Text style={styles.support}>Support: {APP_CONFIG.supportEmail}</Text>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  fields: { gap: spacing.md },
  success: {
    fontFamily: typography.fonts.medium,
    fontSize: 15,
    color: colors.success,
  },
  error: {
    fontFamily: typography.fonts.regular,
    fontSize: 13,
    color: colors.error,
  },
  support: {
    fontFamily: typography.fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
