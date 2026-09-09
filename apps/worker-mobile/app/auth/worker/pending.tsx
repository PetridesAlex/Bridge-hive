import { Redirect, router } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AuthShell } from '@/components/auth/AuthShell';
import { Button } from '@/components/ui/Button';
import { APP_CONFIG } from '@/constants/config';
import { colors, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';

export default function WorkerPendingScreen() {
  const {
    session,
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

  if (!loading && !session) {
    return <Redirect href="/welcome" />;
  }

  if (!loading && accountRejectionReason) {
    return <Redirect href="/auth/worker/rejected" />;
  }

  if (!loading && isVerified) {
    return <Redirect href="/(tabs)" />;
  }

  const verificationStatus = workerProfile?.verification_status ?? 'draft';
  const onboardingDone = workerProfile?.onboarding_status === 'completed';

  // User-friendly verification labels
  const getVerificationLabel = (status: string): string => {
    switch (status) {
      case 'draft':
        return 'Not submitted';
      case 'submitted':
        return 'Pending review';
      case 'under_review':
        return 'Under review';
      case 'verified':
        return 'Verified';
      case 'rejected':
        return 'Rejected';
      case 'suspended':
        return 'Suspended';
      case 'expired':
        return 'Expired';
      default:
        return status.replace(/_/g, ' ');
    }
  };

  // Status-driven screen title
  const getTitle = (status: string): string => {
    switch (status) {
      case 'draft':
        return 'Verification required';
      case 'submitted':
        return 'Verification pending';
      case 'under_review':
        return 'Verification in progress';
      case 'rejected':
        return 'Verification rejected';
      case 'suspended':
        return 'Account suspended';
      case 'expired':
        return 'Credentials expired';
      default:
        return 'Verification pending';
    }
  };

  // Status-driven subtitle
  const getSubtitle = (status: string): string => {
    switch (status) {
      case 'draft':
        return 'Upload and submit credentials before marketplace access can be reviewed.';
      case 'submitted':
        return 'Your credentials were received and are awaiting review.';
      case 'under_review':
        return 'Bridge Hive is reviewing your credentials.';
      case 'rejected':
        return 'Your credentials were rejected. Please review the reason below.';
      case 'suspended':
        return 'Your account has been suspended. Contact support for details.';
      case 'expired':
        return 'Your credentials have expired. Please upload updated documents.';
      default:
        return 'Marketplace access requires platform verification.';
    }
  };

  // Status-driven body text
  const getBodyText = (status: string): string => {
    switch (status) {
      case 'draft':
        return 'Upload the required credentials and submit them for verification.';
      case 'submitted':
        return 'You will be notified when verification review begins.';
      case 'under_review':
        return 'You will be notified when verification is complete.';
      case 'rejected':
        return 'Review the rejection reason and upload corrected credentials.';
      case 'suspended':
        return 'Contact Bridge Hive support to resolve this issue.';
      case 'expired':
        return 'Upload updated credentials to continue working on the platform.';
      default:
        return 'You cannot mark yourself as verified. A Bridge Hive verifier will review your credentials.';
    }
  };

  const onSubmitReview = async () => {
    setSubmitting(true);
    const result = await submitForReview();
    setSubmitting(false);
    if (result.error) {
      setMessage(result.error);
      return;
    }
    setMessage('Onboarding marked complete. A platform verifier will review your credentials.');
  };

  return (
    <AuthShell
      title={getTitle(verificationStatus)}
      subtitle={getSubtitle(verificationStatus)}
      showBack={false}
      centered={false}
    >
      <View style={styles.statusSection}>
        <Text style={styles.statusLabel}>Onboarding</Text>
        <Text style={styles.statusValue}>{onboardingDone ? 'Complete' : 'In progress'}</Text>
      </View>
      <View style={styles.statusSection}>
        <Text style={styles.statusLabel}>Verification</Text>
        <Text style={styles.statusValue}>{getVerificationLabel(verificationStatus)}</Text>
      </View>
      <Text style={styles.body}>{getBodyText(verificationStatus)}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}

      <View style={styles.actions}>
        <Button
          label="Upload credentials"
          variant="brand"
          onPress={() => router.push('/documents')}
        />
        {!onboardingDone ? (
          <Button
            label="Mark onboarding complete"
            variant="secondary"
            loading={submitting}
            onPress={onSubmitReview}
          />
        ) : null}
        <Button label="Refresh status" variant="ghost" onPress={() => void refreshProfile()} />
        <Button label="Sign out" variant="ghost" onPress={() => void signOut()} />
      </View>
      <Text style={styles.support}>Support: {APP_CONFIG.supportEmail}</Text>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  statusSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  statusLabel: {
    fontFamily: typography.fonts.semibold,
    fontSize: 14,
    color: colors.text,
  },
  statusValue: {
    fontFamily: typography.fonts.medium,
    fontSize: 14,
    color: colors.navyLift,
    textTransform: 'capitalize',
  },
  body: {
    fontFamily: typography.fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  message: {
    fontFamily: typography.fonts.medium,
    fontSize: 14,
    color: colors.success,
  },
  actions: { gap: spacing.sm, marginTop: spacing.sm },
  support: {
    fontFamily: typography.fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
