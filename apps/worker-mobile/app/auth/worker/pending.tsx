import {
  documentProgressCounts,
  payoutAccountActionLabel,
  payoutSummaryLabel,
  WORKER_ACCOUNT_SETUP_PAYOUT_ROUTE,
  type CredentialSummary,
  type DocumentProgressCounts,
  type WorkerRole,
} from '@bridge-hive/domain';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { AuthShell } from '@/components/auth/AuthShell';
import { ProgressBar } from '@/components/ui/ProgressRing';
import { ProgressStep, type ProgressStepState } from '@/components/ui/ProgressStep';
import { colors, radii, shadows, spacing, typography } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { supabase } from '@/lib/supabase';
import {
  buildWorkerJourneySnapshot,
  type WorkerJourneyAccountStatus,
} from '@/lib/worker-journey';
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
  if (status === 'pending') return 'submitted';
  if (status === 'rejected' || status === 'failed' || status === 'suspended' || status === 'expired') {
    return 'action_required';
  }
  return 'not_started';
}

function payoutStepLabel(status: PayoutStatus): string {
  if (status === 'pending') return 'Submitted';
  return payoutSummaryLabel(status);
}

function SetupAction({
  label,
  icon,
  tone,
  busy = false,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone: 'navy' | 'teal';
  busy?: boolean;
  onPress: () => void;
}) {
  const reduced = useReducedMotion();
  const [hovered, setHovered] = useState(false);
  const scale = useSharedValue(1);
  const lift = useSharedValue(0);
  const nudge = useSharedValue(0);
  const spin = useSharedValue(0);

  useEffect(() => {
    if (busy && !reduced) {
      spin.value = withRepeat(
        withTiming(360, { duration: 700, easing: Easing.linear }),
        -1,
        false,
      );
      return;
    }
    spin.value = withTiming(0, { duration: reduced ? 0 : 180 });
  }, [busy, reduced, spin]);

  const motionStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: lift.value }, { scale: scale.value }],
  }));
  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: nudge.value }],
  }));
  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.value}deg` }],
  }));

  return (
    <Animated.View style={motionStyle}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ busy, disabled: busy }}
        disabled={busy}
        onPress={onPress}
        onHoverIn={() => {
          setHovered(true);
          if (!reduced) lift.value = withSpring(-2, { damping: 16, stiffness: 260 });
        }}
        onHoverOut={() => {
          setHovered(false);
          lift.value = withSpring(0, { damping: 16, stiffness: 240 });
        }}
        onPressIn={() => {
          if (reduced) return;
          scale.value = withSpring(0.98, { damping: 18, stiffness: 420 });
          nudge.value = withSpring(4, { damping: 14, stiffness: 320 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 14, stiffness: 260 });
          nudge.value = withSpring(0, { damping: 14, stiffness: 260 });
        }}
        style={styles.setupAction}
      >
        <LinearGradient
          pointerEvents="none"
          colors={['#FFFFFF', '#F3F7FB']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {hovered ? <View pointerEvents="none" style={styles.setupActionWash} /> : null}
        <LinearGradient
          pointerEvents="none"
          colors={
            tone === 'navy'
              ? [colors.navy, colors.navyLift]
              : [colors.tealStrong, '#0A6C78']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.setupMark}
        >
          <Animated.View style={icon === 'refresh' ? spinStyle : undefined}>
            <Ionicons name={icon} size={16} color={colors.white} />
          </Animated.View>
        </LinearGradient>
        <Text style={styles.setupLabel}>{busy ? 'Refreshing…' : label}</Text>
        <Animated.View style={chevronStyle}>
          <Ionicons name="chevron-forward" size={16} color={colors.navyLift} />
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

function accountStatusTone(status: WorkerJourneyAccountStatus): {
  icon: keyof typeof Ionicons.glyphMap;
  accent: string;
} {
  switch (status) {
    case 'fully_activated':
      return { icon: 'checkmark-circle', accent: colors.success };
    case 'action_required':
    case 'restricted':
      return { icon: 'alert-circle', accent: colors.error };
    case 'ready_to_submit':
      return { icon: 'send', accent: colors.yellow };
    case 'submitted':
    case 'under_review':
      return { icon: 'time', accent: colors.tealStrong };
    default:
      return { icon: 'compass', accent: colors.yellow };
  }
}

function AccountStatusCard({
  status,
  label,
  summary,
}: {
  status: WorkerJourneyAccountStatus;
  label: string;
  summary: string;
}) {
  const tone = accountStatusTone(status);
  return (
    <View accessibilityRole="summary" style={styles.accountCard}>
      <View style={styles.accountTop}>
        <Ionicons name={tone.icon} size={22} color={tone.accent} style={styles.accountIcon} />
        <View style={styles.accountCopy}>
          <Text style={styles.accountEyebrow}>Account status</Text>
          <Text style={styles.accountLabel}>{label}</Text>
          <Text style={styles.accountSummary}>{summary}</Text>
        </View>
      </View>
      <View style={styles.accountDivider} />
      <Text style={styles.accountFootText}>
        Document “Accepted” is not marketplace access. Shifts unlock only after
        administrator activation.
      </Text>
    </View>
  );
}

function NextStepCard({
  body,
  actionLabel,
  onAction,
}: {
  body: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View accessibilityRole="alert" style={styles.nextCard}>
      <View style={styles.nextInner}>
        <View style={styles.nextMark}>
          <Ionicons name="arrow-forward-circle" size={22} color={colors.tealStrong} />
        </View>
        <View style={styles.nextCopy}>
          <Text style={styles.nextEyebrow}>Next step</Text>
          <Text style={styles.nextBody}>{body}</Text>
        </View>
      </View>
      {actionLabel && onAction ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          onPress={onAction}
          style={({ pressed }) => [styles.nextCta, pressed && styles.nextCtaPressed]}
        >
          <Text style={styles.nextCtaText}>{actionLabel}</Text>
          <Ionicons name="arrow-forward" size={16} color={colors.white} />
        </Pressable>
      ) : null}
    </View>
  );
}

function ReviewAction({
  busy,
  onPress,
}: {
  busy: boolean;
  onPress: () => void;
}) {
  const reduced = useReducedMotion();
  const [hovered, setHovered] = useState(false);
  const scale = useSharedValue(1);
  const lift = useSharedValue(0);
  const nudge = useSharedValue(0);

  const motionStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: lift.value }, { scale: scale.value }],
  }));
  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: nudge.value }],
  }));

  return (
    <Animated.View style={motionStyle}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Submit for review"
        accessibilityState={{ busy, disabled: busy }}
        disabled={busy}
        onPress={onPress}
        onHoverIn={() => {
          setHovered(true);
          if (!reduced && !busy) lift.value = withSpring(-3, { damping: 16, stiffness: 260 });
        }}
        onHoverOut={() => {
          setHovered(false);
          lift.value = withSpring(0, { damping: 16, stiffness: 240 });
        }}
        onPressIn={() => {
          if (reduced || busy) return;
          scale.value = withSpring(0.98, { damping: 18, stiffness: 420 });
          nudge.value = withSpring(6, { damping: 14, stiffness: 320 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 14, stiffness: 260 });
          nudge.value = withSpring(0, { damping: 14, stiffness: 260 });
        }}
        style={styles.reviewAction}
      >
        <LinearGradient
          pointerEvents="none"
          colors={[colors.navy, '#0C3E56', colors.tealStrong]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {hovered ? <View pointerEvents="none" style={styles.reviewWash} /> : null}
        {busy ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <>
            <Text style={styles.reviewLabel}>Submit for review</Text>
            <Animated.View style={iconStyle}>
              <Ionicons name="arrow-forward" size={18} color={colors.yellow} />
            </Animated.View>
          </>
        )}
      </Pressable>
    </Animated.View>
  );
}

function SignOutAction({ onPress }: { onPress: () => void }) {
  const reduced = useReducedMotion();
  const [hovered, setHovered] = useState(false);
  const scale = useSharedValue(1);
  const lift = useSharedValue(0);
  const nudge = useSharedValue(0);

  const motionStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: lift.value }, { scale: scale.value }],
  }));
  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: nudge.value }],
  }));

  return (
    <Animated.View style={motionStyle}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Sign out"
        onPress={onPress}
        onHoverIn={() => {
          setHovered(true);
          if (!reduced) lift.value = withSpring(-3, { damping: 16, stiffness: 260 });
        }}
        onHoverOut={() => {
          setHovered(false);
          lift.value = withSpring(0, { damping: 16, stiffness: 240 });
        }}
        onPressIn={() => {
          if (reduced) return;
          scale.value = withSpring(0.97, { damping: 18, stiffness: 420 });
          nudge.value = withSpring(6, { damping: 14, stiffness: 320 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 14, stiffness: 260 });
          nudge.value = withSpring(0, { damping: 14, stiffness: 260 });
        }}
        style={styles.signOut}
      >
        <LinearGradient
          pointerEvents="none"
          colors={['#8E1B14', '#B42318', '#D1432F']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {hovered ? <View pointerEvents="none" style={styles.signOutWash} /> : null}
        <Text style={styles.signOutLabel}>Sign out</Text>
        <Animated.View style={iconStyle}>
          <Ionicons name="log-out-outline" size={18} color={colors.white} />
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

function SubmissionReadyNotice({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  const rise = useSharedValue(0);

  useEffect(() => {
    if (!visible) return;
    scale.value = reduced ? 1 : 0.94;
    rise.value = reduced ? 0 : 12;
    scale.value = withSpring(1, { damping: 14, stiffness: 220 });
    rise.value = withSpring(0, { damping: 16, stiffness: 220 });
  }, [visible, reduced, rise, scale]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: rise.value }, { scale: scale.value }],
  }));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.noticeOverlay}>
        <Animated.View accessibilityRole="alert" style={[styles.noticeCard, cardStyle]}>
          <LinearGradient
            pointerEvents="none"
            colors={['#F7FBFE', '#FFFFFF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            colors={[colors.navy, colors.tealStrong]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.noticeMark}
          >
            <Ionicons name="checkmark" size={26} color={colors.yellow} />
          </LinearGradient>
          <Text style={styles.noticeTitle}>Submissions are all set</Text>
          <Text style={styles.noticeBody}>
            Your package is with Bridge Hive for platform review. Final approval is an
            administrator action. You can still update payout details while you wait.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Continue"
            onPress={onClose}
            style={styles.noticeButton}
          >
            <LinearGradient
              pointerEvents="none"
              colors={[colors.navy, '#0C3E56', colors.tealStrong]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Text style={styles.noticeButtonLabel}>Continue</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

function payoutStepDescription(status: PayoutStatus): string {
  if (status === 'pending') {
    return 'Payout account submitted. Waiting for administrative approval. Only a masked IBAN is stored.';
  }
  if (status === 'verified') {
    return 'Payout account approved for platform use. Only a masked IBAN is stored.';
  }
  return 'Needed so organizations can pay approved gross shift amounts. Only a masked IBAN is stored.';
}

function credentialsProgressDescription(progress: DocumentProgressCounts): string {
  const uploaded = Math.max(0, progress.requiredTotal - progress.missing);
  const total = progress.requiredTotal;
  if (total === 0) return 'No documents required.';
  if (uploaded === total && progress.approved === total) {
    return `${uploaded} of ${total} documents uploaded and approved.`;
  }
  if (uploaded === total && progress.rejected > 0) {
    return `${uploaded} of ${total} documents uploaded. Some need correction.`;
  }
  if (uploaded === total) {
    return `${uploaded} of ${total} documents uploaded.`;
  }
  return `${uploaded} of ${total} documents uploaded. Missing ${progress.missing}.`;
}

function finalState(label: string): ProgressStepState {
  const lower = label.toLowerCase();
  if (lower.includes('approved') || lower.includes('verified') || lower.includes('marketplace ready')) {
    return 'approved';
  }
  if (lower.includes('reject') || lower.includes('suspended')) return 'rejected';
  if (
    lower.includes('review') ||
    lower.includes('submitted') ||
    lower.includes('administrative') ||
    lower.includes('awaiting') ||
    lower.includes('waiting')
  ) {
    return 'under_review';
  }
  return 'not_started';
}

/** Shorter badge copy for the final-review step. */
function finalStatusDisplay(label: string): string {
  switch (label) {
    case 'Waiting for document review':
      return 'Awaiting documents';
    case 'Waiting for payout approval':
      return 'Awaiting payout';
    case 'Ready for final administrative approval':
      return 'Ready for admin';
    case 'Approved for marketplace access':
      return 'Marketplace ready';
    case 'Suspended':
      return 'Suspended';
    default:
      return 'Not ready';
  }
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
  const [refreshing, setRefreshing] = useState(false);
  const [readyNotice, setReadyNotice] = useState(false);
  const [error, setError] = useState<string>();
  const readyNoticeSeen = useRef(false);
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

  useEffect(() => {
    const status = workerProfile?.verification_status;
    const submitted = status === 'submitted' || status === 'under_review';
    if (!submitted || readyNoticeSeen.current) return;
    readyNoticeSeen.current = true;
    setReadyNotice(true);
  }, [workerProfile?.verification_status]);

  useFocusEffect(
    useCallback(() => {
      void loadSetupState();
    }, [loadSetupState]),
  );

  if (!loading && !session) {
    return <Redirect href="/auth/worker/login" />;
  }

  if (!loading && accountRejectionReason) {
    return <Redirect href="/auth/worker/rejected" />;
  }

  if (!loading && isVerified) {
    return <Redirect href="/(tabs)" />;
  }

  if (
    !loading &&
    (workerProfile?.verification_status === 'suspended' ||
      workerProfile?.verification_status === 'rejected' ||
      workerProfile?.verification_status === 'expired')
  ) {
    return <Redirect href="/auth/worker/restricted" />;
  }

  const role = workerProfile?.worker_role as WorkerRole | null;
  const verificationStatus = workerProfile?.verification_status ?? 'draft';
  const packageSubmitted =
    verificationStatus === 'submitted' || verificationStatus === 'under_review';
  const journey = buildWorkerJourneySnapshot({
    role,
    verificationStatus,
    credentials,
    payoutStatus,
  });
  const canSubmitPackage = journey.canSubmitPackage;
  const docsLabel = journey.documentsLabel;
  const progress = documentProgressCounts({ role, credentials });
  const payoutLabel = payoutStepLabel(payoutStatus);
  const finalLabel = journey.finalLabel;
  const nextStep = journey.nextStep;
  const payoutButtonLabel = payoutAccountActionLabel(payoutStatus);
  const profileDone = Boolean(workerProfile?.worker_role);

  const onSubmitPackage = async () => {
    if (submitLock.current || submitting) return;
    submitLock.current = true;
    setSubmitting(true);
    setError(undefined);
    try {
      const result = await submitForReview();
      if (result.error) {
        setError(result.error);
        return;
      }
      readyNoticeSeen.current = true;
      setReadyNotice(true);
      await loadSetupState();
    } finally {
      setSubmitting(false);
      submitLock.current = false;
    }
  };

  const onRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await refreshProfile();
      await loadSetupState();
    } finally {
      setRefreshing(false);
    }
  };

  const shellTitle = packageSubmitted
    ? 'Your application is with BridgeHive'
    : 'Account Setup';
  const shellSubtitle = packageSubmitted
    ? 'Review is in progress. You can sign out and sign back in any time — shifts stay locked until activation.'
    : 'Follow each step below. Marketplace access requires a separate administrator activation.';

  const nextActionLabel = canSubmitPackage
    ? 'Submit application for review'
    : docsLabel === 'Complete' &&
        (payoutStatus == null ||
          payoutStatus === 'rejected' ||
          payoutStatus === 'failed')
      ? payoutButtonLabel
      : docsLabel === 'Missing' || docsLabel === 'Partially uploaded'
        ? 'Upload documents'
        : journey.accountStatus === 'action_required'
          ? 'Fix required items'
          : undefined;
  const nextActionHandler = canSubmitPackage
    ? () => void onSubmitPackage()
    : docsLabel === 'Complete' &&
        (payoutStatus == null ||
          payoutStatus === 'rejected' ||
          payoutStatus === 'failed')
      ? () => router.push(WORKER_ACCOUNT_SETUP_PAYOUT_ROUTE)
      : docsLabel === 'Missing' ||
          docsLabel === 'Partially uploaded' ||
          journey.accountStatus === 'action_required'
        ? () => router.push('/documents')
        : undefined;

  return (
    <AuthShell
      title={shellTitle}
      subtitle={shellSubtitle}
      showBack={false}
      centered={false}
    >
      <AccountStatusCard
        status={journey.accountStatus}
        label={journey.accountLabel}
        summary={journey.accountSummary}
      />

      <NextStepCard
        body={nextStep}
        actionLabel={nextActionLabel}
        onAction={nextActionHandler}
      />

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
          description={credentialsProgressDescription(progress)}
          statusLabel={docsLabel}
          state={docsState(docsLabel)}
          isCurrent={profileDone && docsState(docsLabel) !== 'approved' && !packageSubmitted}
          actionLabel="Manage credentials"
          onAction={() => router.push('/documents')}
        />
        <ProgressStep
          step={3}
          title="Payout account"
          description={payoutStepDescription(payoutStatus)}
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
          title="Final review"
          description="After documents and payout are approved, an administrator unlocks marketplace access."
          statusLabel={finalStatusDisplay(finalLabel)}
          state={finalState(finalLabel)}
          isCurrent={packageSubmitted || finalState(finalLabel) === 'under_review'}
          isLast
        />
      </View>

      {error ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}

      <View style={styles.laterBox}>
        <Ionicons name="log-out-outline" size={16} color={colors.tealStrong} />
        <Text style={styles.laterText}>
          Need to leave? Sign out safely and sign in later with the same email. Your
          progress is saved — you will return to Account Setup until activation.
        </Text>
      </View>

      <View style={styles.actions}>
        {canSubmitPackage ? (
          <ReviewAction busy={submitting} onPress={() => void onSubmitPackage()} />
        ) : null}
        <SetupAction
          label="View notifications"
          icon="notifications-outline"
          tone="navy"
          onPress={() => router.push('/notifications')}
        />
        <SetupAction
          label="Refresh status"
          icon="refresh"
          tone="teal"
          busy={refreshing}
          onPress={() => void onRefresh()}
        />
        <SignOutAction onPress={() => void signOut()} />
      </View>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel="Email support at support@bridgehive.app"
        onPress={() => {
          void Linking.openURL(
            `mailto:support@bridgehive.app?subject=${encodeURIComponent(
              packageSubmitted ? 'Profile review' : 'Account Setup',
            )}`,
          );
        }}
        style={styles.support}
      >
        <Ionicons name="mail-outline" size={14} color={colors.tealStrong} />
        <Text style={styles.supportText}>support@bridgehive.app</Text>
      </Pressable>
      <SubmissionReadyNotice visible={readyNotice} onClose={() => setReadyNotice(false)} />
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  /** Flat navy surface — no border or gradient; hierarchy comes from type and one hairline. */
  accountCard: {
    borderRadius: radii.xl,
    padding: spacing.lg,
    gap: spacing.md,
    backgroundColor: colors.navy,
    ...shadows.md,
  },
  accountTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  accountIcon: {
    marginTop: 2,
  },
  accountDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  accountCopy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  accountEyebrow: {
    fontFamily: typography.fonts.semibold,
    fontSize: 11,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: colors.yellow,
  },
  accountLabel: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 18,
    letterSpacing: -0.3,
    color: colors.white,
  },
  accountSummary: {
    fontFamily: typography.fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.88)',
  },
  accountFootText: {
    fontFamily: typography.fonts.regular,
    fontSize: 12,
    lineHeight: 17,
    color: 'rgba(255,255,255,0.68)',
  },
  laterBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: radii.lg,
    padding: spacing.md,
    backgroundColor: colors.tealSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(20, 169, 181, 0.28)',
  },
  laterText: {
    flex: 1,
    fontFamily: typography.fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.navy,
  },
  steps: {
    gap: spacing.sm,
  },
  error: {
    fontFamily: typography.fonts.medium,
    fontSize: 14,
    color: colors.error,
  },
  noticeOverlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 42, 67, 0.46)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  noticeCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: radii.xl,
    overflow: 'hidden',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
    backgroundColor: colors.white,
    ...shadows.lg,
  },
  noticeMark: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  noticeTitle: {
    fontFamily: typography.fonts.displayExtra,
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.4,
    color: colors.navy,
    textAlign: 'center',
  },
  noticeBody: {
    marginTop: spacing.sm,
    fontFamily: typography.fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  noticeButton: {
    marginTop: spacing.lg,
    alignSelf: 'stretch',
    minHeight: 48,
    borderRadius: radii.xl,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noticeButtonLabel: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 16,
    color: colors.white,
  },
  actions: { gap: spacing.sm },
  setupAction: {
    minHeight: 52,
    borderRadius: radii.xl,
    borderWidth: 0,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.white,
    ...shadows.md,
  },
  setupActionWash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(11, 42, 67, 0.04)',
  },
  setupMark: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setupLabel: {
    flex: 1,
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 15,
    color: colors.navy,
  },
  /** Flat soft-teal surface — no border, gradient or shadow. */
  nextCard: {
    borderRadius: radii.xl,
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.tealSoft,
  },
  nextInner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  nextMark: {
    marginTop: 1,
  },
  nextCopy: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  nextEyebrow: {
    fontFamily: typography.fonts.semibold,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.tealStrong,
  },
  nextBody: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: -0.2,
    color: colors.navy,
  },
  nextCta: {
    minHeight: 44,
    borderRadius: radii.full,
    backgroundColor: colors.navy,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  nextCtaPressed: {
    opacity: 0.9,
  },
  nextCtaText: {
    fontFamily: typography.fonts.semibold,
    fontSize: 14,
    color: colors.white,
  },
  reviewAction: {
    minHeight: 52,
    borderRadius: radii.xl,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.navy,
    ...shadows.lg,
  },
  reviewWash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  reviewLabel: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 16,
    color: colors.white,
  },
  signOut: {
    minHeight: 52,
    borderRadius: radii.xl,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: '#B42318',
    ...shadows.lg,
  },
  signOutWash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  signOutLabel: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 16,
    color: colors.white,
  },
  support: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    borderRadius: 999,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#D5E2EE',
  },
  supportText: {
    fontFamily: typography.fonts.medium,
    fontSize: 12,
    color: colors.navy,
  },
});
