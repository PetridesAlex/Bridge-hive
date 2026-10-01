import {
  accountSetupNextStep,
  canSubmitWorkerVerificationPackage,
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
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AuthShell } from '@/components/auth/AuthShell';
import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressRing';
import { ProgressStep, type ProgressStepState } from '@/components/ui/ProgressStep';
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

function docsState(label: string): ProgressStepState {
  const lower = label.toLowerCase();
  if (lower.includes('approved') || lower.includes('complete')) return 'approved';
  if (lower.includes('reject') || lower.includes('action')) return 'action_required';
  if (lower.includes('review')) return 'under_review';
  if (lower.includes('submitted') || lower.includes('progress')) return 'in_progress';
  if (lower.includes('missing') || lower.includes('not started') || lower.includes('required')) {
    return 'not_started';
  }
  return 'in_progress';
}

function payoutState(status: PayoutStatus): ProgressStepState {
  if (status === 'verified') return 'approved';
  if (status === 'pending') return 'under_review';
  if (status === 'rejected' || status === 'failed' || status === 'suspended' || status === 'expired') {
    return 'action_required';
  }
  return 'not_started';
}

function finalState(label: string): ProgressStepState {
  const lower = label.toLowerCase();
  if (lower.includes('approved') || lower.includes('verified')) return 'approved';
  if (lower.includes('reject')) return 'rejected';
  if (lower.includes('review') || lower.includes('submitted') || lower.includes('administrative')) {
    return 'under_review';
  }
  return 'not_started';
}

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
  const [error, setError] = useState<string>();
  const [credentials, setCredentials] = useState<CredentialSummary[]>([]);
  const [payoutStatus, setPayoutStatus] = useState<PayoutStatus>(null);
  const submitLock = useRef(false);

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
  const packageSubmitted =
    verificationStatus === 'submitted' || verificationStatus === 'under_review';
  const canSubmitPackage = canSubmitWorkerVerificationPackage({
    role,
    credentials,
    verificationStatus,
  });
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
    canSubmitPackage,
    verificationStatus,
  });
  const payoutButtonLabel = payoutAccountActionLabel(payoutStatus);
  const profileDone = Boolean(workerProfile?.worker_role);

  const onSubmitPackage = async () => {
    if (submitLock.current || submitting) return;
    submitLock.current = true;
    setSubmitting(true);
    setError(undefined);
    setMessage(undefined);
    try {
      const result = await submitForReview();
      if (result.error) {
        setError(result.error);
        return;
      }
      setMessage('Package submitted for platform review. Final approval is an administrator action.');
      await loadSetupState();
    } finally {
      setSubmitting(false);
      submitLock.current = false;
    }
  };

  const onRefresh = async () => {
    await refreshProfile();
    await loadSetupState();
  };

  return (
    <AuthShell
      title="Account Setup"
      subtitle="Complete each step before marketplace access. Final approval is an administrator action."
      showBack={false}
      centered={false}
    >
      <Banner variant="info" title="Next step" body={nextStep} />

      {(() => {
        const doneCount = [
          profileDone,
          docsState(docsLabel) === 'approved' || packageSubmitted,
          payoutState(payoutStatus) === 'approved',
          finalState(finalLabel) === 'approved',
        ].filter(Boolean).length;
        return (
          <ProgressBar
            progress={doneCount / 4}
            label={`${doneCount} of 4 steps complete`}
          />
        );
      })()}

      <View style={styles.steps}>
        <ProgressStep
          step={1}
          title="Personal profile"
          description="Confirm your worker role and basic profile details."
          statusLabel={profileDone ? 'Complete' : 'In progress'}
          state={profileDone ? 'complete' : 'in_progress'}
          isCurrent={!profileDone}
        />
        <ProgressStep
          step={2}
          title="Required credentials"
          description={`${progress.approved} of ${progress.requiredTotal} approved. Missing ${progress.missing}.`}
          statusLabel={docsLabel}
          state={docsState(docsLabel)}
          isCurrent={profileDone && docsState(docsLabel) !== 'approved' && !packageSubmitted}
          actionLabel="Manage credentials"
          onAction={() => router.push('/documents')}
        />
        <ProgressStep
          step={3}
          title="Payout account"
          description="Needed so organizations can pay approved gross shift amounts. Only a masked IBAN is stored."
          statusLabel={payoutLabel}
          state={payoutState(payoutStatus)}
          isCurrent={
            profileDone &&
            (docsState(docsLabel) === 'approved' || packageSubmitted || canSubmitPackage) &&
            payoutState(payoutStatus) !== 'approved'
          }
          actionLabel={payoutButtonLabel}
          onAction={() => router.push(WORKER_ACCOUNT_SETUP_PAYOUT_ROUTE)}
        />
        <ProgressStep
          step={4}
          title="Final platform review"
          description="Marketplace access requires approved documents, an approved payout account, and a separate administrator action."
          statusLabel={finalLabel}
          state={finalState(finalLabel)}
          isCurrent={packageSubmitted || finalState(finalLabel) === 'under_review'}
          isLast
        />
      </View>

      {message ? (
        <Text style={styles.message} accessibilityLiveRegion="polite">
          {message}
        </Text>
      ) : null}
      {error ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}

      <View style={styles.actions}>
        {canSubmitPackage ? (
          <Button
            label="Submit for review"
            variant="primary"
            loading={submitting}
            onPress={() => void onSubmitPackage()}
          />
        ) : null}
        {packageSubmitted ? (
          <Text style={styles.hint}>
            Package is in the admin review queue. You can still update payout details while waiting.
          </Text>
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
  steps: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  message: {
    fontFamily: typography.fonts.medium,
    fontSize: 14,
    color: colors.success,
    marginTop: spacing.sm,
  },
  error: {
    fontFamily: typography.fonts.medium,
    fontSize: 14,
    color: colors.error,
    marginTop: spacing.sm,
  },
  hint: {
    fontFamily: typography.fonts.regular,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  actions: { gap: spacing.sm, marginTop: spacing.md },
  support: {
    fontFamily: typography.fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
