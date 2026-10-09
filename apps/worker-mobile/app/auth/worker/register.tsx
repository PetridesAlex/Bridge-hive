import type { WorkerRole } from '@bridge-hive/domain';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AuthShell, AuthStepBar } from '@/components/auth/AuthShell';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { Button } from '@/components/ui/Button';
import { TextInput } from '@/components/ui/TextInput';
import { APP_CONFIG, WORKER_ROLE_LABELS } from '@/constants/config';
import { WORKER_ROLE_OPTIONS } from '@/constants/workerRoleOptions';
import { colors, radii, spacing, typography } from '@/constants/theme';
import { setPendingConfirmEmail } from '@/lib/pending-confirm-email';
import { useAuth } from '@/providers/AuthProvider';

const STEPS = ['Account', 'Role', 'Review'] as const;

export default function WorkerRegisterScreen() {
  const { signUpWorker, session, loading, homeRoute } = useAuth();
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

  const validateStep = (): boolean => {
    setError(undefined);
    if (step === 1) {
      if (!fullName.trim() || !email.trim() || password.length < 6) {
        setError('Enter your name, email, and a password of at least 6 characters.');
        return false;
      }
      if (!email.includes('@')) {
        setError('Enter a valid email address.');
        return false;
      }
      const digits = phone.replace(/\D/g, '');
      if (digits.length < 8) {
        setError('Enter a valid phone number including country code.');
        return false;
      }
    }
    return true;
  };

  const next = () => {
    if (!validateStep()) return;
    setStep((s) => Math.min(s + 1, STEPS.length));
  };

  const back = () => {
    if (step === 1) {
      router.back();
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
        setPendingConfirmEmail(email.trim().toLowerCase());
        router.replace('/auth/worker/check-email');
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
      title="Join Bridge Hive"
      subtitle="Create a worker account for nurses, ward assistants, and physiotherapists across Cyprus."
      centered={false}
      footer={
        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account?</Text>
          <Pressable onPress={() => router.push('/auth/worker/login')}>
            <Text style={styles.footerLink}>Sign in</Text>
          </Pressable>
        </View>
      }
    >
      <AuthStepBar current={step} total={STEPS.length} />
      <Text style={styles.stepLabel}>{STEPS[step - 1]}</Text>

      {step === 1 ? (
        <View style={styles.fields}>
          <TextInput label="Full name" value={fullName} onChangeText={setFullName} />
          <TextInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TextInput label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <TextInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <Text style={styles.hint}>Market: {APP_CONFIG.countryCode} · {APP_CONFIG.timezone}</Text>
        </View>
      ) : null}

      {step === 2 ? (
        <View style={styles.fields}>
          <Text style={styles.section}>Choose your professional role</Text>
          <Text style={styles.hint}>
            Selection uses a clear label and description — not color alone. This value is sent to
            the server unchanged.
          </Text>
          {WORKER_ROLE_OPTIONS.map((option) => {
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
          <TextInput
            label="Short bio (optional)"
            value={bio}
            onChangeText={setBio}
            multiline
            helpText="Optional context for organizations reviewing your profile."
          />
        </View>
      ) : null}

      {step === 3 ? (
        <View style={styles.fields}>
          <Text style={styles.review}>Name: {fullName}</Text>
          <Text style={styles.review}>Email: {email}</Text>
          <Text style={styles.review}>Role: {WORKER_ROLE_LABELS[workerRole]}</Text>
          <Text style={styles.hint}>
            After signup you will upload credentials. Marketplace access requires platform
            verification — you cannot self-verify.
          </Text>
        </View>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.actions}>
        <Button label="Back" variant="secondary" onPress={back} disabled={submitting} />
        {step < STEPS.length ? (
          <Button label="Continue" variant="primary" onPress={next} />
        ) : (
          <Button
            label="Create account"
            variant="primary"
            loading={submitting}
            onPress={() => void onSubmit()}
          />
        )}
        {step === 1 ? (
          <GoogleSignInButton onSuccess={() => router.replace('/')} />
        ) : null}
      </View>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  stepLabel: {
    fontFamily: typography.fonts.semibold,
    fontSize: 13,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  fields: { gap: spacing.md },
  section: {
    fontFamily: typography.fonts.semibold,
    fontSize: 15,
    color: colors.text,
  },
  roleCard: {
    flexDirection: 'row',
    gap: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.md,
    backgroundColor: colors.card,
    minHeight: 88,
    alignItems: 'flex-start',
  },
  roleCardSelected: {
    borderColor: colors.tealStrong,
    backgroundColor: colors.tealSoft,
  },
  roleIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
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
    color: colors.text,
  },
  roleBody: {
    fontFamily: typography.fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  hint: {
    fontFamily: typography.fonts.regular,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  review: {
    fontFamily: typography.fonts.medium,
    fontSize: 15,
    color: colors.text,
  },
  error: {
    fontFamily: typography.fonts.regular,
    fontSize: 13,
    color: colors.error,
  },
  actions: { gap: spacing.sm, marginTop: spacing.sm },
  footer: {
    marginTop: spacing.xxl,
    alignItems: 'center',
    gap: 6,
  },
  footerText: {
    fontFamily: typography.fonts.regular,
    fontSize: 14,
    color: colors.textMuted,
  },
  footerLink: {
    fontFamily: typography.fonts.semibold,
    fontSize: 16,
    color: colors.tealStrong,
  },
});
