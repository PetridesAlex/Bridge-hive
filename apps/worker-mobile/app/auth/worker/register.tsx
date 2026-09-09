import type { WorkerRole } from '@bridge-hive/domain';
import { Redirect, router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { AuthShell, AuthStepBar } from '@/components/auth/AuthShell';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { TextInput } from '@/components/ui/TextInput';
import { APP_CONFIG, WORKER_ROLE_LABELS } from '@/constants/config';
import { colors, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';

const STEPS = ['Account', 'Role', 'Review'] as const;

export default function WorkerRegisterScreen() {
  const { signUpWorker, session, loading, homeRoute } = useAuth();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+357 ');
  const [password, setPassword] = useState('');
  const [workerRole, setWorkerRole] = useState<WorkerRole>('registered_nurse');
  const [bio, setBio] = useState('');

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
    setSubmitting(true);
    const result = await signUpWorker({
      email,
      password,
      fullName,
      phone,
      workerRole,
      bio,
    });
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    if (result.needsEmailConfirm) {
      Alert.alert('Confirm your email', 'Check your inbox to activate your account, then sign in.');
      router.replace('/auth/worker/login');
      return;
    }
    router.replace('/auth/worker/pending');
  };

  return (
    <AuthShell
      title="Create worker account"
      subtitle="Nurses and ward assistants only."
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
          <Text style={styles.section}>Your role</Text>
          <View style={styles.chips}>
            {(Object.keys(WORKER_ROLE_LABELS) as WorkerRole[]).map((role) => (
              <Chip
                key={role}
                label={WORKER_ROLE_LABELS[role]}
                selected={workerRole === role}
                onPress={() => setWorkerRole(role)}
              />
            ))}
          </View>
          <TextInput
            label="Short bio (optional)"
            value={bio}
            onChangeText={setBio}
            multiline
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
        <Button label="Back" variant="secondary" onPress={back} />
        {step < STEPS.length ? (
          <Button label="Continue" variant="brand" onPress={next} />
        ) : (
          <Button label="Create account" variant="brand" loading={submitting} onPress={onSubmit} />
        )}
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
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
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
    color: 'rgba(255,255,255,0.6)',
  },
  footerLink: {
    fontFamily: typography.fonts.semibold,
    fontSize: 16,
    color: colors.yellow,
  },
});
