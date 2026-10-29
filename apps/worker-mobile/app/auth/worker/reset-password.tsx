import {
  WORKER_RECOVERY_PASSWORD_MIN_LENGTH,
  validateWorkerRecoveryPassword,
  workerRecoveryUrlErrorMessage,
  type WorkerRecoveryUrlParseResult,
} from '@bridge-hive/domain';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { AuthField } from '@/components/auth/AuthField';
import { AuthShell } from '@/components/auth/AuthShell';
import { Button } from '@/components/ui/Button';
import { APP_CONFIG } from '@/constants/config';
import { colors, radii, spacing, typography } from '@/constants/theme';
import {
  clearAllWorkerRecoveryState,
  clearPendingRecovery,
  getPendingRecoveryTokenHash,
  isWorkerRecoverySessionActive,
} from '@/lib/pending-recovery';
import { useAuth } from '@/providers/AuthProvider';

type Step = 'confirm' | 'password' | 'done' | 'invalid';
type ReqState = 'idle' | 'ok' | 'bad';

function RequirementRow({ label, state }: { label: string; state: ReqState }) {
  const color =
    state === 'ok' ? colors.tealStrong : state === 'bad' ? colors.error : colors.textMuted;
  return (
    <View style={styles.reqRow} accessibilityRole="text">
      <View
        style={[
          styles.reqDot,
          state === 'ok' && styles.reqDotOk,
          state === 'bad' && styles.reqDotBad,
        ]}
      />
      <Text style={[styles.reqLabel, { color }]}>{label}</Text>
    </View>
  );
}

function SupportLine() {
  return (
    <Pressable
      onPress={() => void Linking.openURL(`mailto:${APP_CONFIG.supportEmail}`)}
      accessibilityRole="link"
      accessibilityLabel={`Email support at ${APP_CONFIG.supportEmail}`}
      hitSlop={8}
      style={styles.supportHit}
    >
      <Text style={styles.support}>Support: {APP_CONFIG.supportEmail}</Text>
    </Pressable>
  );
}

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

  const syncFromPending = useCallback(() => {
    const pendingHash = getPendingRecoveryTokenHash();
    if (pendingHash) {
      setStep('confirm');
      return;
    }
    if (isWorkerRecoverySessionActive() && session) {
      setStep('password');
      return;
    }
    if (!loading && !session) {
      setStep('invalid');
    }
  }, [loading, session]);

  useEffect(() => {
    // Capture any cold/warm recovery URL held by AuthProvider before rendering.
    const outcome = consumePendingRecoveryLink();
    if (outcome?.kind === 'invalid') {
      setStep('invalid');
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

  const lengthState: ReqState = useMemo(() => {
    if (!password) return 'idle';
    return password.length >= WORKER_RECOVERY_PASSWORD_MIN_LENGTH ? 'ok' : 'bad';
  }, [password]);

  const matchState: ReqState = useMemo(() => {
    if (!confirm) return 'idle';
    return password === confirm ? 'ok' : 'bad';
  }, [password, confirm]);

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

  const goForgot = () => {
    clearAllWorkerRecoveryState();
    router.replace('/auth/worker/forgot-password');
  };

  const goSignIn = () => {
    clearAllWorkerRecoveryState();
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
        <View style={styles.stateIconWrap}>
          <Ionicons name="shield-outline" size={28} color={colors.navy} />
        </View>
        <Text style={styles.stateCopy} accessibilityLiveRegion="polite">
          This reset link is no longer available. Request a fresh email, then open it on this
          device.
        </Text>
        <Button
          label="Request a new reset link"
          variant="primary"
          size="lg"
          onPress={goForgot}
          style={styles.cta}
        />
        <Button
          label="Back to sign in"
          variant="ghost"
          size="lg"
          onPress={goSignIn}
          style={styles.secondaryCta}
        />
        <SupportLine />
      </AuthShell>
    );
  }

  if (step === 'confirm') {
    return (
      <AuthShell
        title="Continue password reset"
        subtitle="Confirm once to verify your reset link, then choose a new password. This does not activate an organization account."
        showBack={false}
        centered
      >
        <View style={styles.stateIconWrap}>
          <Ionicons name="lock-closed-outline" size={28} color={colors.tealStrong} />
        </View>
        {error ? (
          <Text style={styles.error} accessibilityLiveRegion="polite">
            {error}
          </Text>
        ) : null}
        <Button
          label="Continue password reset"
          variant="primary"
          size="lg"
          loading={submitting}
          disabled={submitting}
          onPress={() => void onConfirmLink()}
          style={styles.cta}
          accessibilityHint="Verifies your reset link once before you set a new password"
        />
        <Button
          label="Cancel"
          variant="ghost"
          size="lg"
          onPress={() => void onCancel()}
          style={styles.secondaryCta}
        />
        <SupportLine />
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
        <View style={[styles.stateIconWrap, styles.stateIconSuccess]}>
          <Ionicons name="checkmark-circle" size={32} color={colors.tealStrong} />
        </View>
        <Text style={styles.success} accessibilityLiveRegion="polite">
          Your password was updated successfully.
        </Text>
        <Button
          label="Continue to sign in"
          variant="primary"
          size="lg"
          onPress={onDoneContinue}
          style={styles.cta}
        />
        <SupportLine />
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
          label="Request a new reset link"
          variant="primary"
          size="lg"
          onPress={goForgot}
          style={styles.cta}
        />
        <Button
          label="Back to sign in"
          variant="ghost"
          size="lg"
          onPress={goSignIn}
          style={styles.secondaryCta}
        />
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Set a new password"
      subtitle={`Choose a new password for your Bridge Hive worker account. Use at least ${WORKER_RECOVERY_PASSWORD_MIN_LENGTH} characters.`}
      showBack={false}
      centered
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

        <View style={styles.reqList} accessibilityLiveRegion="polite">
          <RequirementRow
            label={`At least ${WORKER_RECOVERY_PASSWORD_MIN_LENGTH} characters`}
            state={lengthState}
          />
          <RequirementRow label="Passwords match" state={matchState} />
        </View>

        {error ? (
          <Text style={styles.error} accessibilityLiveRegion="polite">
            {error}
          </Text>
        ) : null}
        <Button
          label="Update password"
          variant="primary"
          size="lg"
          loading={submitting}
          disabled={submitting}
          onPress={() => void onSubmitPassword()}
          style={styles.cta}
        />
        <Button
          label="Back to sign in"
          variant="ghost"
          size="lg"
          onPress={() => void onCancel()}
          style={styles.secondaryCta}
        />
      </View>
      <SupportLine />
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
  reqList: {
    gap: 8,
    paddingVertical: 4,
  },
  reqRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 22,
  },
  reqDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.borderStrong,
  },
  reqDotOk: {
    backgroundColor: colors.tealStrong,
  },
  reqDotBad: {
    backgroundColor: colors.error,
  },
  reqLabel: {
    fontFamily: typography.fonts.semibold,
    fontSize: 13,
  },
  stateIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceSubdued,
  },
  stateIconSuccess: {
    backgroundColor: 'rgba(20, 169, 181, 0.14)',
  },
  stateCopy: {
    fontFamily: typography.fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  success: {
    fontFamily: typography.fonts.medium,
    fontSize: 15,
    color: colors.textSecondary,
  },
  error: {
    fontFamily: typography.fonts.regular,
    fontSize: 13,
    color: colors.error,
  },
  hint: {
    fontFamily: typography.fonts.regular,
    fontSize: 14,
    color: colors.textMuted,
  },
  cta: {
    borderRadius: radii.full,
    minHeight: 48,
  },
  secondaryCta: {
    minHeight: 48,
  },
  supportHit: {
    minHeight: 44,
    justifyContent: 'center',
    alignSelf: 'center',
  },
  support: {
    fontFamily: typography.fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
