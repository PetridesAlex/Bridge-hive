import {
  WORKER_CONFIRM_RESEND_COOLDOWN_MS,
  workerConfirmRequestAcceptedCopy,
} from '@bridge-hive/domain';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AuthShell } from '@/components/auth/AuthShell';
import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { TextInput } from '@/components/ui/TextInput';
import { APP_CONFIG } from '@/constants/config';
import { colors, spacing, typography } from '@/constants/theme';
import { useTranslation } from '@/i18n/locale-provider';
import {
  clearPendingConfirmEmail,
  getPendingConfirmEmail,
  setPendingConfirmEmail,
} from '@/lib/pending-confirm-email';
import { useAuth } from '@/providers/AuthProvider';

export default function WorkerCheckEmailScreen() {
  const params = useLocalSearchParams<{ email?: string }>();
  const { resendSignupConfirmation } = useAuth();
  const { t } = useTranslation();
  const [email, setEmail] = useState(() => getPendingConfirmEmail() ?? '');
  const [editing, setEditing] = useState(false);
  const [draftEmail, setDraftEmail] = useState(email);
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();
  const [resending, setResending] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [now, setNow] = useState(Date.now());
  const resendLock = useRef(false);

  // Strip legacy ?email= from the URL into memory, then clear the query.
  useEffect(() => {
    const fromQuery = typeof params.email === 'string' ? params.email.trim().toLowerCase() : '';
    if (fromQuery) {
      setPendingConfirmEmail(fromQuery);
      setEmail(fromQuery);
      setDraftEmail(fromQuery);
      router.replace('/auth/worker/check-email');
      return;
    }
    const stored = getPendingConfirmEmail();
    if (stored) {
      setEmail(stored);
      setDraftEmail(stored);
    }
  }, [params.email]);

  useEffect(() => {
    if (cooldownUntil <= Date.now()) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [cooldownUntil]);

  const cooldownLeftSec = Math.max(0, Math.ceil((cooldownUntil - now) / 1000));
  const canResend = Boolean(email.includes('@')) && cooldownLeftSec === 0 && !resending;

  const onSaveEmail = () => {
    const next = draftEmail.trim().toLowerCase();
    if (!next.includes('@')) {
      setError(t('auth.enterValidEmail'));
      return;
    }
    setPendingConfirmEmail(next);
    setEmail(next);
    setEditing(false);
    setError(undefined);
    setMessage(t('auth.addressUpdated'));
  };

  const onResend = async () => {
    if (!canResend || resendLock.current) return;
    resendLock.current = true;
    setResending(true);
    setError(undefined);
    setMessage(undefined);
    try {
      const result = await resendSignupConfirmation(email);
      if (result.error) {
        setError(result.error);
        return;
      }
      setCooldownUntil(Date.now() + WORKER_CONFIRM_RESEND_COOLDOWN_MS);
      setMessage(
        'Confirmation request accepted again. Check your inbox and spam. Delivery is not guaranteed by this screen.',
      );
    } finally {
      setResending(false);
      resendLock.current = false;
    }
  };

  return (
    <AuthShell
      title={t('auth.confirmEmailTitle')}
      subtitle={t('auth.confirmEmailSubtitle')}
      showBack={false}
      centered
    >
      <View style={styles.body}>
        <Banner
          variant="info"
          icon="mail"
          title={t('auth.invitationSent')}
          body={
            email
              ? t('auth.invitationBodyWithEmail', { email })
              : t('auth.invitationBody')
          }
        />
        <Text style={styles.copy}>{workerConfirmRequestAcceptedCopy(false)}</Text>
        {email ? (
          <Text style={styles.hint}>{t('auth.requestAssociatedWith', { email })}</Text>
        ) : (
          <Text style={styles.hint}>{t('auth.enterRegisterEmail')}</Text>
        )}
        {editing ? (
          <View style={styles.editBlock}>
            <TextInput
              label={t('common.email')}
              value={draftEmail}
              onChangeText={setDraftEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <Button label={t('auth.saveAddress')} variant="secondary" onPress={onSaveEmail} />
            <Button
              label={t('common.cancel')}
              variant="ghost"
              onPress={() => {
                setEditing(false);
                setDraftEmail(email);
                setError(undefined);
              }}
            />
          </View>
        ) : null}
      </View>

      {message ? <Text style={styles.message}>{message}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.actions}>
        <Button
          label={
            cooldownLeftSec > 0
              ? t('auth.resendAvailableIn', { seconds: cooldownLeftSec })
              : t('auth.resendConfirmation')
          }
          variant="primary"
          loading={resending}
          disabled={!canResend}
          onPress={() => void onResend()}
        />
        {!editing ? (
          <Button
            label={t('auth.wrongEmailEdit')}
            variant="secondary"
            onPress={() => {
              setEditing(true);
              setDraftEmail(email);
            }}
          />
        ) : null}
        <Button
          label={t('auth.continueToSignIn')}
          variant="ghost"
          onPress={() => {
            clearPendingConfirmEmail();
            router.replace('/auth/worker/login');
          }}
        />
        <Button
          label={t('auth.backToRegistration')}
          variant="ghost"
          onPress={() => {
            router.replace({
              pathname: '/auth/worker/register',
              params: email ? { email } : {},
            } as never);
          }}
        />
      </View>
      <Text style={styles.support}>
        {t('auth.supportLabel', { email: APP_CONFIG.supportEmail })}
      </Text>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing.sm, width: '100%' },
  copy: {
    fontFamily: typography.fonts.regular,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    textAlign: 'center',
  },
  hint: {
    fontFamily: typography.fonts.regular,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    textAlign: 'center',
  },
  editBlock: { gap: spacing.sm, marginTop: spacing.sm },
  message: {
    fontFamily: typography.fonts.medium,
    fontSize: 14,
    color: colors.success,
    textAlign: 'center',
  },
  error: {
    fontFamily: typography.fonts.medium,
    fontSize: 14,
    color: colors.error,
    textAlign: 'center',
  },
  actions: { gap: spacing.sm, width: '100%' },
  support: {
    fontFamily: typography.fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
