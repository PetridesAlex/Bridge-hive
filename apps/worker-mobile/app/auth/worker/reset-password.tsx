import {
  validateWorkerRecoveryPassword,
  workerRecoveryUrlErrorMessage,
  type WorkerRecoveryUrlParseResult,
} from '@bridge-hive/domain';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AuthField } from '@/components/auth/AuthField';
import { AuthShell } from '@/components/auth/AuthShell';
import { Button } from '@/components/ui/Button';
import { APP_CONFIG } from '@/constants/config';
import { colors, spacing, typography } from '@/constants/theme';
import {
  clearAllWorkerRecoveryState,
  clearPendingRecovery,
  getPendingRecoveryTokenHash,
  isWorkerRecoverySessionActive,
} from '@/lib/pending-recovery';
import { useAuth } from '@/providers/AuthProvider';

type Step = 'confirm' | 'password' | 'done' | 'invalid';

export default function WorkerResetPasswordScreen() {
  const {
    session,
    loading,
    updatePassword,
    signOut,
    confirmRecoveryOtp,
    consumePendingRecoveryLink,
  } = useAuth();
  const [step, setStep] = useState<Step>('password');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();
  const [linkError, setLinkError] = useState<string>();

  const syncFromPending = useCallback(() => {
    const pendingHash = getPendingRecoveryTokenHash();
    if (pendingHash) {
      setStep('confirm');
      setLinkError(undefined);
      return;
    }
    if (isWorkerRecoverySessionActive() && session) {
      setStep('password');
      return;
    }
    if (!loading && !session) {
      setStep('invalid');
      setLinkError(
        'Open the reset link from your email, or request a new password reset.',
      );
    }
  }, [loading, session]);

  useEffect(() => {
    // Capture any cold/warm recovery URL held by AuthProvider before rendering.
    const outcome = consumePendingRecoveryLink();
    if (outcome?.kind === 'invalid') {
      setStep('invalid');
      setLinkError(outcome.message);
      clearPendingRecovery();
      return;
    }
    syncFromPending();
  }, [consumePendingRecoveryLink, syncFromPending]);

  useEffect(() => {
    if (loading) return;
    if (getPendingRecoveryTokenHash() && step !== 'done' && step !== 'invalid') {
      setStep('confirm');
      return;
    }
    if (isWorkerRecoverySessionActive() && session && step !== 'done' && step !== 'confirm') {
      setStep('password');
      return;
    }
    if (
      !session &&
      step === 'password' &&
      !getPendingRecoveryTokenHash() &&
      !isWorkerRecoverySessionActive()
    ) {
      setStep('invalid');
    }
  }, [loading, session, step]);

  const onConfirmLink = async () => {
    setError(undefined);
    setSubmitting(true);
    const result = await confirmRecoveryOtp();
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      setStep('invalid');
      return;
    }
    setStep('password');
  };

  const onSubmitPassword = async () => {
    setError(undefined);
    const policy = validateWorkerRecoveryPassword({ password, confirm });
    if (!policy.ok) {
      setError(policy.error);
      return;
    }
    if (!isWorkerRecoverySessionActive()) {
      setError('This reset link is no longer valid. Request a new password reset email.');
      return;
    }
    setSubmitting(true);
    const result = await updatePassword(password);
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setPassword('');
    setConfirm('');
    clearAllWorkerRecoveryState();
    await signOut();
    setStep('done');
  };

  const onDoneContinue = () => {
    router.replace('/auth/worker/login');
  };

  const onCancel = async () => {
    clearAllWorkerRecoveryState();
    await signOut();
    router.replace('/auth/worker/login');
  };

  if (loading && step !== 'confirm' && step !== 'done') {
    return (
      <AuthShell
        title="Set a new password"
        subtitle="Preparing your secure reset…"
        showBack={false}
        centered
      >
        <Text style={styles.hint}>Please wait.</Text>
      </AuthShell>
    );
  }

  if (step === 'invalid') {
    return (
      <AuthShell
        title="Reset link unavailable"
        subtitle="Request a new password reset from the worker sign-in screen."
        showBack={false}
        centered
      >
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {linkError ?? error ?? 'This reset link is invalid.'}
        </Text>
        <Button
          label="Back to sign in"
          variant="primary"
          onPress={() => {
            clearAllWorkerRecoveryState();
            router.replace('/auth/worker/login');
          }}
        />
        <Text style={styles.support}>Support: {APP_CONFIG.supportEmail}</Text>
      </AuthShell>
    );
  }

  if (step === 'confirm') {
    return (
      <AuthShell
        title="Continue password reset"
        subtitle="Confirm once to verify your reset link, then choose a new password. This does not activate an organization account."
        showBack={false}
        centered={false}
      >
        {error ? (
          <Text style={styles.error} accessibilityLiveRegion="polite">
            {error}
          </Text>
        ) : null}
        <Button
          label="Continue password reset"
          variant="primary"
          loading={submitting}
          disabled={submitting}
          onPress={() => void onConfirmLink()}
          accessibilityHint="Verifies your reset link once before you set a new password"
        />
        <Button label="Cancel" variant="ghost" onPress={() => void onCancel()} />
        <Text style={styles.support}>Support: {APP_CONFIG.supportEmail}</Text>
      </AuthShell>
    );
  }

  if (step === 'done') {
    return (
      <AuthShell
        title="Password updated"
        subtitle="You can now sign in with your new password."
        showBack={false}
        centered
      >
        <Text style={styles.success} accessibilityLiveRegion="polite">
          Your password was updated successfully.
        </Text>
        <Button label="Continue to sign in" variant="primary" onPress={onDoneContinue} />
        <Text style={styles.support}>Support: {APP_CONFIG.supportEmail}</Text>
      </AuthShell>
    );
  }

  // Password step — require recovery session marker; redirect otherwise.
  if (!isWorkerRecoverySessionActive()) {
    return (
      <AuthShell
        title="Reset link unavailable"
        subtitle="Open the link from your Bridge Hive email, or request a new reset."
        showBack={false}
        centered
      >
        <Button
          label="Back to sign in"
          variant="primary"
          onPress={() => router.replace('/auth/worker/login')}
        />
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Set a new password"
      subtitle="Choose a new password for your Bridge Hive worker account (at least 12 characters, with a letter and a number)."
      showBack={false}
      centered={false}
    >
      <View style={styles.fields}>
        <AuthField
          label="New password"
          icon="lock-closed-outline"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
          accessibilityLabel="New password"
        />
        <AuthField
          label="Confirm new password"
          icon="lock-closed-outline"
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
          accessibilityLabel="Confirm new password"
        />
        {error ? (
          <Text style={styles.error} accessibilityLiveRegion="polite">
            {error}
          </Text>
        ) : null}
        <Button
          label="Update password"
          variant="primary"
          loading={submitting}
          disabled={submitting}
          onPress={() => void onSubmitPassword()}
        />
        <Button label="Cancel" variant="ghost" onPress={() => void onCancel()} />
      </View>
      <Text style={styles.support}>Support: {APP_CONFIG.supportEmail}</Text>
    </AuthShell>
  );
}

/** Exported for tests that assert invalid-link messaging shape. */
export function mapRecoveryParseFailure(
  result: Extract<WorkerRecoveryUrlParseResult, { ok: false }>,
): string {
  return workerRecoveryUrlErrorMessage(result.reason);
}

const styles = StyleSheet.create({
  fields: { gap: spacing.md },
  success: {
    fontFamily: typography.fonts.medium,
    fontSize: 15,
    color: colors.success,
    marginBottom: spacing.md,
  },
  error: {
    fontFamily: typography.fonts.regular,
    fontSize: 13,
    color: colors.error,
    marginBottom: spacing.sm,
  },
  hint: {
    fontFamily: typography.fonts.regular,
    fontSize: 14,
    color: colors.textMuted,
  },
  support: {
    fontFamily: typography.fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
