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
import { useTranslation } from '@/i18n/locale-provider';
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
  const { t } = useTranslation();
  return (
    <Pressable
      onPress={() => void Linking.openURL(`mailto:${APP_CONFIG.supportEmail}`)}
      accessibilityRole="link"
      accessibilityLabel={`${t('auth.emailSupport')} ${APP_CONFIG.supportEmail}`}
      hitSlop={8}
      style={styles.supportHit}
    >
      <Text style={styles.support}>
        {t('auth.supportLabel', { email: APP_CONFIG.supportEmail })}
      </Text>
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
  const { t } = useTranslation();
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
      setError(t('auth.resetLinkInvalid'));
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
        title={t('auth.resetTitle')}
        subtitle={t('auth.resetPreparing')}
        showBack={false}
        centered
      >
        <Text style={styles.hint}>{t('auth.pleaseWait')}</Text>
      </AuthShell>
    );
  }

  if (step === 'invalid') {
    return (
      <AuthShell
        title={t('auth.resetLinkUnavailable')}
        subtitle={t('auth.resetLinkUnavailableSubtitle')}
        showBack={false}
        centered
      >
        <View style={styles.stateIconWrap}>
          <Ionicons name="shield-outline" size={28} color={colors.navy} />
        </View>
        <Text style={styles.stateCopy} accessibilityLiveRegion="polite">
          {t('auth.resetLinkUnavailableBody')}
        </Text>
        <Button
          label={t('auth.requestNewResetLink')}
          variant="primary"
          size="lg"
          onPress={goForgot}
          style={styles.cta}
        />
        <Button
          label={t('auth.backToSignIn')}
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
        title={t('auth.continuePasswordReset')}
        subtitle={t('auth.continuePasswordResetSubtitle')}
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
          label={t('auth.continuePasswordReset')}
          variant="primary"
          size="lg"
          loading={submitting}
          disabled={submitting}
          onPress={() => void onConfirmLink()}
          style={styles.cta}
          accessibilityHint={t('auth.continuePasswordResetHint')}
        />
        <Button
          label={t('common.cancel')}
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
        title={t('auth.resetSuccessTitle')}
        subtitle={t('auth.resetSuccessSubtitle')}
        showBack={false}
        centered
      >
        <View style={[styles.stateIconWrap, styles.stateIconSuccess]}>
          <Ionicons name="checkmark-circle" size={32} color={colors.tealStrong} />
        </View>
        <Text style={styles.success} accessibilityLiveRegion="polite">
          {t('auth.resetSuccessBody')}
        </Text>
        <Button
          label={t('auth.continueToSignIn')}
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
        title={t('auth.resetLinkUnavailable')}
        subtitle={t('auth.resetLinkUnavailableAltSubtitle')}
        showBack={false}
        centered
      >
        <Button
          label={t('auth.requestNewResetLink')}
          variant="primary"
          size="lg"
          onPress={goForgot}
          style={styles.cta}
        />
        <Button
          label={t('auth.backToSignIn')}
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
      title={t('auth.resetTitle')}
      subtitle={t('auth.resetSubtitle', { count: WORKER_RECOVERY_PASSWORD_MIN_LENGTH })}
      showBack={false}
      centered
    >
      <View style={styles.fields}>
        <AuthField
          label={t('auth.newPassword')}
          icon="lock-closed-outline"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
          accessibilityLabel={t('auth.newPassword')}
        />
        <AuthField
          label={t('auth.confirmNewPassword')}
          icon="lock-closed-outline"
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
          accessibilityLabel={t('auth.confirmNewPassword')}
        />

        <View style={styles.reqList} accessibilityLiveRegion="polite">
          <RequirementRow
            label={t('auth.passwordMinChars', { count: WORKER_RECOVERY_PASSWORD_MIN_LENGTH })}
            state={lengthState}
          />
          <RequirementRow label={t('auth.passwordsMatch')} state={matchState} />
        </View>

        {error ? (
          <Text style={styles.error} accessibilityLiveRegion="polite">
            {error}
          </Text>
        ) : null}
        <Button
          label={t('auth.resetSubmit')}
          variant="primary"
          size="lg"
          loading={submitting}
          disabled={submitting}
          onPress={() => void onSubmitPassword()}
          style={styles.cta}
        />
        <Button
          label={t('auth.backToSignIn')}
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
