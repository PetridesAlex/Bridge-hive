import type { WorkerRole } from '@bridge-hive/domain';
import { Redirect, router } from 'expo-router';
import React, { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AuthShell } from '@/components/auth/AuthShell';
import { Button } from '@/components/ui/Button';
import { TextInput } from '@/components/ui/TextInput';
import { WORKER_ROLE_OPTIONS } from '@/constants/workerRoleOptions';
import { colors, radii, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';

export default function WorkerChooseRoleScreen() {
  const {
    session,
    loading,
    workerProfile,
    profile,
    user,
    accountRejectionReason,
    homeRoute,
    completeWorkerRoleSetup,
    signOut,
  } = useAuth();
  const [workerRole, setWorkerRole] = useState<WorkerRole>('registered_nurse');
  const [fullName, setFullName] = useState(
    () =>
      profile?.full_name?.trim() ||
      (typeof user?.user_metadata?.full_name === 'string'
        ? user.user_metadata.full_name
        : typeof user?.user_metadata?.name === 'string'
          ? user.user_metadata.name
          : ''),
  );
  const [phone, setPhone] = useState(() => profile?.phone?.trim() || '+357 ');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();
  const lock = useRef(false);

  if (!loading && !session) {
    return <Redirect href="/welcome" />;
  }
  if (!loading && accountRejectionReason) {
    return <Redirect href="/auth/worker/rejected" />;
  }
  if (!loading && workerProfile) {
    return <Redirect href={homeRoute as never} />;
  }

  const onContinue = async () => {
    if (lock.current || submitting) return;
    lock.current = true;
    setSubmitting(true);
    setError(undefined);
    try {
      const result = await completeWorkerRoleSetup({
        workerRole,
        fullName,
        phone,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      router.replace('/auth/worker/pending');
    } finally {
      setSubmitting(false);
      lock.current = false;
    }
  };

  return (
    <AuthShell
      title="Choose your role"
      subtitle="Welcome to Bridge Hive. Choose your professional role, confirm your details, then complete Account Setup before claiming shifts."
      showBack={false}
      centered={false}
    >
      <View style={styles.fields}>
        <TextInput label="Full name" value={fullName} onChangeText={setFullName} />
        <TextInput
          label="Phone"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />
        <Text style={styles.section}>Professional role</Text>
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
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button
          label="Continue to Account Setup"
          variant="primary"
          loading={submitting}
          onPress={() => void onContinue()}
        />
        <Button label="Sign out" variant="ghost" onPress={() => void signOut()} />
      </View>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
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
  error: {
    fontFamily: typography.fonts.regular,
    fontSize: 13,
    color: colors.error,
  },
});
