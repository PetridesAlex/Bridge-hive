import {
  accountSetupNextStep,
  documentProgressCounts,
  documentsSummaryLabel,
  finalApprovalSummaryLabel,
  payoutAccountActionLabel,
  payoutSummaryLabel,
  WORKER_ACCOUNT_SETUP_PAYOUT_ROUTE,
  type CredentialSummary,
  type WorkerRole,
} from '@bridge-hive/domain';
import { Redirect, router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AuthShell } from '@/components/auth/AuthShell';
import { Button } from '@/components/ui/Button';
import { APP_CONFIG } from '@/constants/config';
import { colors, spacing, typography } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';

type PayoutStatus =
  | 'pending'
  | 'verified'
  | 'rejected'
  | 'failed'
  | 'suspended'
  | 'expired'
  | null;

export default function WorkerAccountSetupScreen() {
  const {
    session,
    user,
    loading,
    isVerified,
    workerProfile,
    accountRejectionReason,
    submitForReview,
    signOut,
    refreshProfile,
  } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string>();
  const [credentials, setCredentials] = useState<CredentialSummary[]>([]);
  const [payoutStatus, setPayoutStatus] = useState<PayoutStatus>(null);

  const loadSetupState = useCallback(async () => {
    if (!user?.id) return;
    const [credResult, payoutResult] = await Promise.all([
      supabase
        .from('credentials')
        .select('credential_type, status, storage_path, storage_paths')
        .eq('worker_id', user.id),
      supabase
        .from('payout_accounts')
        .select('status')
        .eq('worker_id', user.id)
        .maybeSingle(),
    ]);
    setCredentials(
      (credResult.data ?? []).map((row) => ({
        credentialType: row.credential_type,
        status: row.status as CredentialSummary['status'],
        hasFile:
          Boolean(row.storage_path) ||
          (Array.isArray(row.storage_paths) && row.storage_paths.length > 0),
      })),
    );
    setPayoutStatus((payoutResult.data?.status as PayoutStatus) ?? null);
  }, [user?.id]);

  useEffect(() => {
    void loadSetupState();
  }, [loadSetupState, workerProfile?.verification_status]);

  if (!loading && !session) {
    return <Redirect href="/welcome" />;
  }

  if (!loading && accountRejectionReason) {
    return <Redirect href="/auth/worker/rejected" />;
  }

  if (!loading && isVerified) {
    return <Redirect href="/(tabs)" />;
  }

  const role = workerProfile?.worker_role as WorkerRole | null;
  const verificationStatus = workerProfile?.verification_status ?? 'draft';
  const onboardingDone = workerProfile?.onboarding_status === 'completed';
  const docsLabel = documentsSummaryLabel({ role, credentials });
  const progress = documentProgressCounts({ role, credentials });
  const payoutLabel = payoutSummaryLabel(payoutStatus);
  const finalLabel = finalApprovalSummaryLabel({
    verificationStatus,
    accountStatus: undefined,
    documentsLabel: docsLabel,
    payoutStatus,
  });
  const nextStep = accountSetupNextStep({
    documentsLabel: docsLabel,
    payoutStatus,
    finalLabel,
  });
  const payoutButtonLabel = payoutAccountActionLabel(payoutStatus);

  const onSubmitReview = async () => {
    setSubmitting(true);
    const result = await submitForReview();
    setSubmitting(false);
    if (result.error) {
      setMessage(result.error);
      return;
    }
    setMessage('Onboarding marked complete. Continue with documents and payout setup.');
  };

  const onRefresh = async () => {
    await refreshProfile();
    await loadSetupState();
  };

  return (
    <AuthShell
      title="Account Setup"
      subtitle="Complete documents and payout account before marketplace access."
      showBack={false}
      centered={false}
    >
      <View style={styles.nextCard}>
        <Text style={styles.nextLabel}>Next step</Text>
        <Text style={styles.nextValue}>{nextStep}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Documents</Text>
        <Text style={styles.cardStatus}>{docsLabel}</Text>
        <Text style={styles.cardMeta}>
          {progress.approved} of {progress.requiredTotal} approved
        </Text>
        <Text style={styles.cardMeta}>
          Missing {progress.missing} · Submitted {progress.submitted} · Under review{' '}
          {progress.underReview} · Rejected {progress.rejected}
        </Text>
        <Button
          label="Manage credentials"
          variant="brand"
          onPress={() => router.push('/documents')}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Payout account</Text>
        <Text style={styles.cardStatus}>{payoutLabel}</Text>
        <Text style={styles.cardMeta}>
          Required for marketplace approval. Separate from professional credentials.
        </Text>
        <Button
          label={payoutButtonLabel}
          variant="secondary"
          onPress={() => router.push(WORKER_ACCOUNT_SETUP_PAYOUT_ROUTE)}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Final approval</Text>
        <Text style={styles.cardStatus}>{finalLabel}</Text>
        <Text style={styles.cardMeta}>
          Marketplace access requires approved documents, an approved payout account, and a
          separate administrator action.
        </Text>
      </View>

      {message ? <Text style={styles.message}>{message}</Text> : null}

      <View style={styles.actions}>
        {!onboardingDone ? (
          <Button
            label="Mark onboarding complete"
            variant="secondary"
            loading={submitting}
            onPress={() => void onSubmitReview()}
          />
        ) : null}
        <Button
          label="View notifications"
          variant="ghost"
          onPress={() => router.push('/notifications')}
        />
        <Button label="Refresh status" variant="ghost" onPress={() => void onRefresh()} />
        <Button label="Sign out" variant="ghost" onPress={() => void signOut()} />
      </View>
      <Text style={styles.support}>Support: {APP_CONFIG.supportEmail}</Text>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  nextCard: {
    backgroundColor: colors.blueLight,
    borderRadius: 14,
    padding: spacing.md,
    gap: 4,
    marginBottom: spacing.sm,
  },
  nextLabel: {
    fontFamily: typography.fonts.semibold,
    fontSize: 12,
    color: colors.navyLift,
    textTransform: 'uppercase',
  },
  nextValue: {
    fontFamily: typography.fonts.medium,
    fontSize: 15,
    color: colors.navy,
    lineHeight: 21,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  cardTitle: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 16,
    color: colors.text,
  },
  cardStatus: {
    fontFamily: typography.fonts.semibold,
    fontSize: 15,
    color: colors.navyLift,
  },
  cardMeta: {
    fontFamily: typography.fonts.regular,
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
  },
  message: {
    fontFamily: typography.fonts.medium,
    fontSize: 14,
    color: colors.success,
    marginBottom: spacing.sm,
  },
  actions: { gap: spacing.sm, marginTop: spacing.xs },
  support: {
    fontFamily: typography.fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
