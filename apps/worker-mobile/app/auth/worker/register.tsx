import type { WorkerRole } from '@bridge-hive/domain';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { AuthField } from '@/components/auth/AuthField';
import { AuthShell, AuthStepBar } from '@/components/auth/AuthShell';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { getWorkerRoleOptions } from '@/constants/workerRoleOptions';
import { colors, radii, spacing, typography } from '@/constants/theme';
import { useTranslation } from '@/i18n/locale-provider';
import { setPendingConfirmEmail } from '@/lib/pending-confirm-email';
import { useAuth } from '@/providers/AuthProvider';

const STEP_KEYS = ['stepAccount', 'stepRole', 'stepReview'] as const;
const STEP_COPY_KEYS = {
  stepAccount: { title: 'stepAccountTitle', body: 'stepAccountBody' },
  stepRole: { title: 'stepRoleTitle', body: 'stepRoleBody' },
  stepReview: { title: 'stepReviewTitle', body: 'stepReviewBody' },
} as const;

function goBackSafely() {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace('/auth/worker');
}

export default function WorkerRegisterScreen() {
  const { signUpWorker, session, loading, homeRoute } = useAuth();
  const { t } = useTranslation();
  const roleOptions = getWorkerRoleOptions(t);
  const params = useLocalSearchParams<{ email?: string }>();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();
  const submitLock = useRef(false);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+357 ');
  const [password, setPassword] = useState('');
  const [workerRole, setWorkerRole] = useState<WorkerRole>('registered_nurse');
  const [bio, setBio] = useState('');

  useEffect(() => {
    const fromQuery = typeof params.email === 'string' ? params.email.trim() : '';
    if (fromQuery) setEmail(fromQuery);
  }, [params.email]);

  if (!loading && session) {
    return <Redirect href={homeRoute as never} />;
  }

  const stepKey = STEP_KEYS[step - 1];
  const stepCopyKeys = STEP_COPY_KEYS[stepKey];
  const stepName = t(`auth.${stepKey}`);
  const stepCopy = {
    title: t(`auth.${stepCopyKeys.title}`),
    body: t(`auth.${stepCopyKeys.body}`),
  };

  const validateStep = (): boolean => {
    setError(undefined);
    if (step === 1) {
      if (!fullName.trim() || !email.trim() || password.length < 6) {
        setError(t('auth.enterNameEmailPassword'));
        return false;
      }
      if (!email.includes('@')) {
        setError(t('auth.enterValidEmail'));
        return false;
      }
      const digits = phone.replace(/\D/g, '');
      if (digits.length < 8) {
        setError(t('auth.enterValidPhone'));
        return false;
      }
    }
    return true;
  };

  const next = () => {
    if (!validateStep()) return;
    setStep((s) => Math.min(s + 1, STEP_KEYS.length));
  };

  const back = () => {
    if (step === 1) {
      goBackSafely();
      return;
    }
    setStep((s) => Math.max(s - 1, 1));
  };

  const onSubmit = async () => {
    if (!validateStep()) return;
    if (submitLock.current || submitting) return;
    submitLock.current = true;
    setSubmitting(true);
    try {
      const result = await signUpWorker({
        email,
        password,
        fullName,
        phone,
        workerRole,
        bio,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.needsEmailConfirm) {
        const address = email.trim().toLowerCase();
        setPendingConfirmEmail(address);
        router.replace('/auth/worker/check-email');
        Alert.alert(
          t('auth.confirmEmailAlertTitle'),
          t('auth.confirmEmailAlertBody', { email: address }),
        );
        return;
      }
      router.replace('/auth/worker/pending');
    } finally {
      setSubmitting(false);
      submitLock.current = false;
    }
  };

  return (
    <AuthShell
      title={t('auth.joinTitle')}
      subtitle={t('auth.registerSubtitle')}
      centered={false}
      tone="navy"
      footer={
        <View style={styles.footer}>
          <Text style={styles.footerText}>{t('auth.alreadyRegistered')}</Text>
          <Pressable
            onPress={() => router.push('/auth/worker/login')}
            accessibilityRole="link"
            accessibilityLabel={t('auth.signIn')}
            hitSlop={8}
            style={styles.footerLinkHit}
          >
            <Text style={styles.footerLink}>{t('auth.signIn')}</Text>
          </Pressable>
        </View>
      }
    >
      <AuthStepBar current={step} total={STEP_KEYS.length} tone="navy" />
      <View style={styles.stepHeader}>
        <Text style={styles.stepLabel}>
          {t('auth.stepOf', { step, total: STEP_KEYS.length, name: stepName })}
        </Text>
        <Text style={styles.stepTitle} accessibilityRole="header">
          {stepCopy.title}
        </Text>
        <Text style={styles.stepBody}>{stepCopy.body}</Text>
      </View>

      {step === 1 ? (
        <View style={styles.fields}>
          <AuthField
            tone="navy"
            label={t('auth.fullName')}
            icon="person-outline"
            value={fullName}
            onChangeText={setFullName}
            autoComplete="name"
            textContentType="name"
            placeholder={t('auth.fullNamePlaceholder')}
          />
          <AuthField
            tone="navy"
            label={t('common.email')}
            icon="mail-outline"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
            placeholder={t('auth.emailPlaceholder')}
          />
          <AuthField
            tone="navy"
            label={t('common.phone')}
            icon="call-outline"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
            placeholder="+357 ..."
          />
          <AuthField
            tone="navy"
            label={t('common.password')}
            icon="lock-closed-outline"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
            placeholder={t('auth.passwordMin')}
          />
          <Text style={styles.hint}>{t('auth.passwordMinHint')}</Text>
        </View>
      ) : null}

      {step === 2 ? (
        <View style={styles.fields}>
          {roleOptions.map((option) => {
            const selected = workerRole === option.role;
            return (
              <Pressable
                key={option.role}
                onPress={() => setWorkerRole(option.role)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={option.title}
                accessibilityHint={option.description}
                style={[styles.roleCard, selected && styles.roleCardSelected]}
              >
                <View style={[styles.roleIcon, selected && styles.roleIconSelected]}>
                  <Text style={styles.roleCheck}>{selected ? '✓' : ''}</Text>
                </View>
                <View style={styles.roleCopy}>
                  <Text style={styles.roleTitle}>{option.title}</Text>
                  <Text style={styles.roleBody}>{option.description}</Text>
                </View>
              </Pressable>
            );
          })}
          <AuthField
            tone="navy"
            label={t('auth.shortBioOptional')}
            icon="create-outline"
            value={bio}
            onChangeText={setBio}
            multiline
            placeholder={t('auth.shortBioPlaceholder')}
          />
        </View>
      ) : null}

      {step === 3 ? (
        <View style={styles.fields}>
          <View style={styles.reviewCard}>
            <Text style={styles.reviewLabel}>{t('auth.name')}</Text>
            <Text style={styles.reviewValue}>{fullName}</Text>
          </View>
          <View style={styles.reviewCard}>
            <Text style={styles.reviewLabel}>{t('common.email')}</Text>
            <Text style={styles.reviewValue}>{email}</Text>
          </View>
          <View style={styles.reviewCard}>
            <Text style={styles.reviewLabel}>{t('auth.role')}</Text>
            <Text style={styles.reviewValue}>{t(`roles.${workerRole}`)}</Text>
          </View>
          <Text style={styles.hint}>{t('auth.reviewHint')}</Text>
        </View>
      ) : null}

      {error ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          onPress={back}
          disabled={submitting}
          style={[styles.glassBtn, styles.glassSecondary, submitting && styles.btnDisabled]}
        >
          <Text style={styles.glassSecondaryLabel}>{t('common.back')}</Text>
        </Pressable>
        {step < STEP_KEYS.length ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.continue')}
            onPress={next}
            style={[styles.glassBtn, styles.glassPrimary]}
          >
            <Text style={styles.glassPrimaryLabel}>{t('common.continue')}</Text>
          </Pressable>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('auth.createAccount')}
            accessibilityState={{ busy: submitting, disabled: submitting }}
            onPress={() => void onSubmit()}
            disabled={submitting}
            style={[styles.glassBtn, styles.glassPrimary, submitting && styles.btnDisabled]}
          >
            <Text style={styles.glassPrimaryLabel}>
              {submitting ? t('auth.creating') : t('auth.createAccount')}
            </Text>
          </Pressable>
        )}
        {step === 1 ? <GoogleSignInButton glass /> : null}
      </View>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  stepHeader: {
    gap: 4,
  },
  stepLabel: {
    fontFamily: typography.fonts.semibold,
    fontSize: 12,
    color: 'rgba(20, 169, 181, 0.72)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  stepTitle: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 18,
    lineHeight: 24,
    color: '#D7EEF2',
    letterSpacing: -0.2,
  },
  stepBody: {
    fontFamily: typography.fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(184, 228, 234, 0.78)',
  },
  fields: { gap: spacing.md },
  roleCard: {
    flexDirection: 'row',
    gap: spacing.md,
    borderWidth: 1.5,
    borderColor: 'rgba(20, 169, 181, 0.28)',
    borderRadius: radii.lg,
    padding: spacing.md,
    backgroundColor: 'rgba(20, 169, 181, 0.08)',
    minHeight: 88,
    alignItems: 'flex-start',
  },
  roleCardSelected: {
    borderColor: 'rgba(228, 179, 52, 0.55)',
    backgroundColor: 'rgba(20, 169, 181, 0.18)',
  },
  roleIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(20, 169, 181, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  roleIconSelected: {
    backgroundColor: colors.tealStrong,
    borderColor: colors.tealStrong,
  },
  roleCheck: {
    color: colors.white,
    fontFamily: typography.fonts.bold,
    fontSize: 14,
  },
  roleCopy: { flex: 1, gap: 4, minWidth: 0 },
  roleTitle: {
    fontFamily: typography.fonts.semibold,
    fontSize: 16,
    color: '#D7EEF2',
  },
  roleBody: {
    fontFamily: typography.fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(184, 228, 234, 0.78)',
  },
  hint: {
    fontFamily: typography.fonts.regular,
    fontSize: 13,
    color: 'rgba(184, 228, 234, 0.72)',
    lineHeight: 18,
  },
  reviewCard: {
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(20, 169, 181, 0.28)',
    backgroundColor: 'rgba(20, 169, 181, 0.1)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 2,
  },
  reviewLabel: {
    fontFamily: typography.fonts.medium,
    fontSize: 12,
    color: 'rgba(20, 169, 181, 0.72)',
    letterSpacing: 0.2,
  },
  reviewValue: {
    fontFamily: typography.fonts.semibold,
    fontSize: 16,
    lineHeight: 22,
    color: '#D7EEF2',
  },
  error: {
    fontFamily: typography.fonts.regular,
    fontSize: 13,
    color: '#FF8A80',
  },
  actions: { gap: spacing.sm },
  glassBtn: {
    minHeight: 48,
    borderRadius: radii.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  glassSecondary: {
    backgroundColor: 'rgba(20, 169, 181, 0.12)',
    borderColor: 'rgba(20, 169, 181, 0.35)',
  },
  glassPrimary: {
    backgroundColor: 'rgba(11, 42, 67, 0.55)',
    borderColor: 'rgba(20, 169, 181, 0.45)',
  },
  glassSecondaryLabel: {
    fontFamily: typography.fonts.semibold,
    fontSize: 16,
    color: '#B8E4EA',
  },
  glassPrimaryLabel: {
    fontFamily: typography.fonts.bold,
    fontSize: 16,
    color: '#D7EEF2',
  },
  btnDisabled: {
    opacity: 0.55,
  },
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 6,
  },
  footerText: {
    fontFamily: typography.fonts.regular,
    fontSize: 14,
    color: 'rgba(184, 228, 234, 0.72)',
  },
  footerLinkHit: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  footerLink: {
    fontFamily: typography.fonts.semibold,
    fontSize: 16,
    color: '#B8E4EA',
  },
});
