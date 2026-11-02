import {
  WORKER_RECOVERY_REQUEST_SUCCESS_MESSAGE,
  isValidWorkerRecoveryEmail,
  normalizeWorkerRecoveryEmail,
  workerRecoveryResendCooldownMs,
  workerRecoveryResendCooldownSeconds,
} from '@bridge-hive/domain';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { AuthField } from '@/components/auth/AuthField';
import { AuthShell } from '@/components/auth/AuthShell';
import { Button } from '@/components/ui/Button';
import { APP_CONFIG } from '@/constants/config';
import { colors, radii, spacing, typography } from '@/constants/theme';
import { useTranslation } from '@/i18n/locale-provider';
import { useAuth } from '@/providers/AuthProvider';

export default function WorkerForgotPasswordScreen() {
  const { resetPassword, session, loading, homeRoute } = useAuth();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string>();
  const [success, setSuccess] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [now, setNow] = useState(Date.now());
  const submitLock = useRef(false);

  useEffect(() => {
    if (cooldownUntil <= Date.now()) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [cooldownUntil]);

  if (!loading && session) {
    return <Redirect href={homeRoute as never} />;
  }

  const cooldownLeftSec = workerRecoveryResendCooldownSeconds(cooldownUntil, now);
  const canSubmit =
    !submitting && cooldownLeftSec === 0 && isValidWorkerRecoveryEmail(email);

  const onSubmit = async () => {
    if (submitLock.current || !canSubmit) return;
    setError(undefined);
    setSuccess(undefined);

    if (!isValidWorkerRecoveryEmail(email)) {
      setError(t('auth.enterValidEmail'));
      return;
    }

    submitLock.current = true;
    setSubmitting(true);
    try {
      const result = await resetPassword(normalizeWorkerRecoveryEmail(email));
      if (result.error) {
        setError(result.error);
        return;
      }
      setSuccess(result.message ?? WORKER_RECOVERY_REQUEST_SUCCESS_MESSAGE);
      setCooldownUntil(Date.now() + workerRecoveryResendCooldownMs());
    } finally {
      setSubmitting(false);
      submitLock.current = false;
    }
  };

  return (
    <AuthShell
      title={t('auth.resetPasswordTitle')}
      subtitle={t('auth.resetPasswordSubtitle')}
      showBack
      centered
      footer={
        <View style={styles.footer}>
          <Pressable
            onPress={() => router.replace('/auth/worker/login')}
            accessibilityRole="link"
            accessibilityLabel={t('auth.backToSignIn')}
            hitSlop={10}
            style={styles.backLink}
          >
            <Text style={styles.backLinkText}>{t('auth.backToSignIn')}</Text>
          </Pressable>
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
        </View>
      }
    >
      <AuthField
        label={t('common.email')}
        icon="mail-outline"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
        placeholder={t('auth.emailPlaceholder')}
        accessibilityLabel={t('auth.recoveryEmailA11y')}
        editable={!submitting}
      />

      {error ? (
        <Text style={styles.error} accessibilityLiveRegion="polite" accessibilityRole="alert">
          {error}
        </Text>
      ) : null}

      {success ? (
        <View
          style={styles.successCard}
          accessibilityLiveRegion="polite"
          accessibilityRole="text"
        >
          <View style={styles.successIconWrap}>
            <Ionicons name="checkmark-circle" size={28} color={colors.tealStrong} />
          </View>
          <Text style={styles.successTitle}>{t('auth.checkEmailTitle')}</Text>
          <Text style={styles.success}>{success}</Text>
        </View>
      ) : null}

      <View style={styles.actions}>
        <Button
          label={
            cooldownLeftSec > 0
              ? t('auth.resendAvailableIn', { seconds: cooldownLeftSec })
              : success
                ? t('auth.resendInstructions')
                : t('auth.sendResetInstructions')
          }
          variant="primary"
          size="lg"
          loading={submitting}
          disabled={!canSubmit}
          onPress={() => void onSubmit()}
          style={styles.cta}
          accessibilityHint={t('auth.sendResetHint')}
        />
      </View>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: spacing.md,
  },
  cta: {
    borderRadius: radii.full,
    minHeight: 48,
  },
  error: {
    fontFamily: typography.fonts.regular,
    fontSize: 13,
    color: colors.error,
  },
  successCard: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceSubdued,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  successIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(20, 169, 181, 0.14)',
  },
  successTitle: {
    fontFamily: typography.fonts.semibold,
    fontSize: 16,
    color: colors.navy,
  },
  success: {
    fontFamily: typography.fonts.medium,
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  footer: {
    alignItems: 'center',
    gap: 2,
  },
  backLink: {
    minHeight: 44,
    justifyContent: 'center',
  },
  backLinkText: {
    fontFamily: typography.fonts.semibold,
    fontSize: 16,
    color: colors.tealStrong,
  },
  supportHit: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  support: {
    fontFamily: typography.fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
