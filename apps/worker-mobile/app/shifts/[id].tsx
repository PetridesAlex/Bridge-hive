import { useLocalSearchParams, router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/ui/AppScreen';
import { AssignmentTimeline } from '@/components/ui/AssignmentTimeline';
import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { DateTimeBlock } from '@/components/ui/DateTimeBlock';
import { EmptyState } from '@/components/ui/EmptyState';
import { KeyValueRow } from '@/components/ui/KeyValueRow';
import { ListGroup, ListGroupSeparator } from '@/components/ui/Card';
import { MoneyAmount } from '@/components/ui/MoneyAmount';
import { ProgressStep, type ProgressStepState } from '@/components/ui/ProgressStep';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { StickyActionBar } from '@/components/ui/StickyActionBar';
import { Surface } from '@/components/ui/Surface';
import { WORKER_ROLE_LABELS } from '@/constants/config';
import { colors, spacing, typography } from '@/constants/theme';
import { getMyAssignments, type ShiftAssignment } from '@/lib/queries';
import {
  assignmentActionErrorMessage,
  checkInAssignment,
  checkOutAssignment,
  claimErrorMessage,
  claimShift,
  getCheckInWindow,
  getWorkerShiftDetails,
  submitTimesheetRpc,
  type WorkerShiftDetails,
} from '@/lib/rpcs';
import { useAuth } from '@/providers/AuthProvider';
import { formatDurationMinutes, formatMoney } from '@/utils/format';

function assignmentStepState(
  status: string | undefined,
  target: string,
): ProgressStepState {
  const order = ['accepted', 'checked_in', 'checked_out', 'submitted', 'approved'];
  if (!status) return 'not_started';
  if (status === 'rejected') return 'rejected';
  const current = order.indexOf(status);
  const targetIdx = order.indexOf(target);
  if (current < 0 || targetIdx < 0) return 'not_started';
  if (current > targetIdx) return 'complete';
  if (current === targetIdx) return 'in_progress';
  return 'not_started';
}

function stepStatusLabel(
  assignmentStatus: string,
  target: string,
  extras?: string,
): string {
  const state = assignmentStepState(assignmentStatus, target);
  if (state === 'complete' || state === 'approved') return '';
  if (extras) return extras;
  if (state === 'in_progress') return 'Current';
  if (state === 'rejected') return 'Rejected';
  return 'Pending';
}

export default function ShiftDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, isVerified } = useAuth();
  const [shift, setShift] = useState<WorkerShiftDetails | null>(null);
  const [assignment, setAssignment] = useState<ShiftAssignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string>();
  const [nowTick, setNowTick] = useState(() => Date.now());
  const [notesExpanded, setNotesExpanded] = useState(false);

  const refresh = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(undefined);
    const detail = await getWorkerShiftDetails(id);
    if (detail.error || !detail.data) {
      setError(detail.error ?? 'Shift not found');
      setShift(null);
      setLoading(false);
      return;
    }
    setShift(detail.data);

    if (user?.id) {
      const mine = await getMyAssignments(user.id);
      const match = mine.data.find((a) => a.shift_id === id) ?? null;
      setAssignment(match);
    }
    setLoading(false);
  }, [id, user?.id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!shift || assignment?.status !== 'accepted') return;
    const idTimer = setInterval(() => setNowTick(Date.now()), 30_000);
    return () => clearInterval(idTimer);
  }, [shift, assignment?.status]);

  const checkInWindow = useMemo(() => {
    if (!shift) return null;
    return getCheckInWindow(shift.starts_at, shift.ends_at, new Date(nowTick));
  }, [shift, nowTick]);

  const onClaim = async () => {
    if (!id || !isVerified || claiming) return;
    setClaiming(true);
    const result = await claimShift(id);
    setClaiming(false);
    if (result.error) {
      Alert.alert('Claim failed', claimErrorMessage(result.error, shift?.required_role));
      return;
    }
    Alert.alert('Shift accepted.', 'This shift is now on your schedule.');
    void refresh();
  };

  const onCheckIn = async () => {
    if (!assignment) return;
    if (checkInWindow && !checkInWindow.isOpen) {
      const opensLabel = new Intl.DateTimeFormat(undefined, {
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }).format(checkInWindow.opensAt);
      Alert.alert(
        'Check-in not available',
        checkInWindow.isTooEarly
          ? `Check-in opens 30 minutes before the shift starts (${opensLabel}).`
          : 'This shift has already ended.',
      );
      return;
    }
    setActing(true);
    const result = await checkInAssignment(assignment.id);
    setActing(false);
    if (result.error) {
      Alert.alert('Check-in failed', assignmentActionErrorMessage(result.error));
      return;
    }
    void refresh();
  };

  const onCheckOut = async () => {
    if (!assignment) return;
    setActing(true);
    const statusResult = await checkOutAssignment(assignment.id);
    if (statusResult.error) {
      setActing(false);
      Alert.alert('Check-out failed', assignmentActionErrorMessage(statusResult.error));
      return;
    }

    const ts = await submitTimesheetRpc(assignment.id);
    setActing(false);
    if (ts.error) {
      Alert.alert('Timesheet error', assignmentActionErrorMessage(ts.error));
      return;
    }

    const minutes = ts.data?.submitted_minutes;
    Alert.alert(
      'Timesheet submitted',
      minutes != null
        ? `${minutes} minutes submitted for review.`
        : 'Your timesheet was submitted for review.',
    );
    void refresh();
  };

  if (loading) {
    return (
      <AppScreen edges={['top']} contentKind="detail">
        <ScreenHeader title="Shift details" showBack />
        <SkeletonCard lines={4} />
      </AppScreen>
    );
  }

  if (!shift) {
    return (
      <AppScreen edges={['top']} contentKind="detail">
        <ScreenHeader title="Shift details" showBack />
        <EmptyState
          title="Shift unavailable"
          description={error}
          actionLabel="Retry"
          onAction={refresh}
        />
      </AppScreen>
    );
  }

  const roleLabel =
    WORKER_ROLE_LABELS[shift.required_role as keyof typeof WORKER_ROLE_LABELS] ??
    shift.required_role;
  const canClaim = isVerified && shift.status === 'published' && !assignment;
  const canCheckIn = assignment?.status === 'accepted' && Boolean(checkInWindow?.isOpen);
  const showCheckInWaiting =
    assignment?.status === 'accepted' && Boolean(checkInWindow?.isTooEarly);
  const claimBlockedReason = !isVerified
    ? 'Complete account verification before claiming shifts.'
    : assignment
      ? undefined
      : shift.status !== 'published'
        ? 'This shift is no longer open for claims.'
        : undefined;

  const start = new Date(shift.starts_at);
  const end = new Date(shift.ends_at);
  const durationMin = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60_000));
  const notesLong = (shift.notes?.length ?? 0) > 160;
  const notesVisible =
    !shift.notes
      ? ''
      : notesExpanded || !notesLong
        ? shift.notes
        : `${shift.notes.slice(0, 160).trim()}…`;

  const primaryAction = canClaim
    ? {
        label: claiming ? 'Claiming shift…' : 'Claim shift',
        onPress: onClaim,
        loading: claiming,
        disabled: claiming,
      }
    : assignment?.status === 'accepted'
      ? {
          label: 'Check in',
          onPress: onCheckIn,
          loading: acting,
          disabled: !canCheckIn || acting,
        }
      : assignment?.status === 'checked_in'
        ? {
            label: 'Check out & submit timesheet',
            onPress: onCheckOut,
            loading: acting,
            disabled: acting,
          }
        : null;

  return (
    <AppScreen scroll={false} edges={['top']} contentKind="detail">
      <ScreenHeader title="Shift details" showBack titleSize="detail" />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          primaryAction ? styles.scrollSticky : null,
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.titleBlock}>
          <Text style={styles.shiftTitle}>{shift.title || roleLabel}</Text>
          <Text style={styles.orgLine}>{shift.organization_name}</Text>
          <View style={styles.badgeRow}>
            <StatusBadge label={roleLabel} tone="info" icon="medkit-outline" />
            {assignment ? (
              <StatusBadge
                label={assignment.status.replace(/_/g, ' ')}
                tone="accent"
                icon="briefcase-outline"
              />
            ) : (
              <StatusBadge label="Open" tone="accent" icon="calendar-outline" />
            )}
          </View>
        </View>

        <Surface variant="emphasis">
          <Text style={styles.heroLabel}>Schedule & pay</Text>
          <DateTimeBlock startsAt={shift.starts_at} endsAt={shift.ends_at} />
          <View style={styles.heroMeta}>
            <KeyValueRow label="Duration" value={formatDurationMinutes(durationMin)} />
            <KeyValueRow
              label="Hourly rate"
              value={`${formatMoney(shift.rate_minor, shift.currency)} / hour`}
              emphasize
            />
            <KeyValueRow label="Required role" value={roleLabel} />
          </View>
        </Surface>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Location</Text>
          <ListGroup>
            <View style={styles.groupPad}>
              <KeyValueRow label="Location" value={shift.location_name || '—'} />
            </View>
            {shift.ward_name ? (
              <>
                <ListGroupSeparator />
                <View style={styles.groupPad}>
                  <KeyValueRow label="Ward" value={shift.ward_name} />
                </View>
              </>
            ) : null}
          </ListGroup>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Pay</Text>
          <ListGroup>
            <View style={styles.groupPad}>
              <View style={styles.payRow}>
                <Text style={styles.payLabel}>Hourly rate</Text>
                <MoneyAmount
                  amountMinor={shift.rate_minor}
                  currency={shift.currency}
                  emphasize
                  accessibilityLabel={`${formatMoney(shift.rate_minor, shift.currency)} per hour`}
                />
              </View>
              <Text style={styles.hint}>
                Organizations pay approved gross amounts separately from Bridge Hive commission
                invoices.
              </Text>
            </View>
          </ListGroup>
        </View>

        {shift.notes ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Additional notes</Text>
            <Surface variant="subtle">
              <Text style={styles.notes}>{notesVisible}</Text>
              {notesLong ? (
                <Pressable
                  onPress={() => setNotesExpanded((v) => !v)}
                  accessibilityRole="button"
                  accessibilityLabel={notesExpanded ? 'Show less notes' : 'Show more notes'}
                  style={styles.notesToggle}
                >
                  <Text style={styles.notesToggleText}>
                    {notesExpanded ? 'Show less' : 'Show more'}
                  </Text>
                </Pressable>
              ) : null}
            </Surface>
          </View>
        ) : null}

        {assignment ? (
          <AssignmentTimeline>
            <ProgressStep
              step={1}
              title="Accepted"
              statusLabel={stepStatusLabel(assignment.status, 'accepted')}
              state={
                assignment.status === 'accepted'
                  ? 'in_progress'
                  : assignmentStepState(assignment.status, 'accepted')
              }
              isCurrent={assignment.status === 'accepted'}
            />
            <ProgressStep
              step={2}
              title="Check-in"
              statusLabel={stepStatusLabel(
                assignment.status,
                'checked_in',
                assignment.status === 'accepted'
                  ? checkInWindow?.isOpen
                    ? 'Available'
                    : showCheckInWaiting
                      ? 'Waiting'
                      : 'Closed'
                  : undefined,
              )}
              state={
                assignment.status === 'checked_in'
                  ? 'in_progress'
                  : assignmentStepState(assignment.status, 'checked_in')
              }
              isCurrent={assignment.status === 'accepted'}
            />
            <ProgressStep
              step={3}
              title="Check-out & timesheet"
              statusLabel={stepStatusLabel(
                assignment.status,
                'submitted',
                assignment.status === 'checked_in' ? 'Ready' : undefined,
              )}
              state={
                assignment.status === 'checked_in'
                  ? 'in_progress'
                  : assignmentStepState(assignment.status, 'submitted')
              }
              isCurrent={assignment.status === 'checked_in'}
            />
            <ProgressStep
              step={4}
              title="Organization review"
              statusLabel={
                assignment.status === 'approved'
                  ? ''
                  : assignment.status === 'rejected'
                    ? 'Rejected'
                    : assignment.status === 'submitted'
                      ? 'Under review'
                      : 'Pending'
              }
              state={
                assignment.status === 'approved'
                  ? 'approved'
                  : assignment.status === 'rejected'
                    ? 'rejected'
                    : assignment.status === 'submitted'
                      ? 'under_review'
                      : 'not_started'
              }
              isCurrent={assignment.status === 'submitted'}
              isLast
            />
          </AssignmentTimeline>
        ) : null}

        {showCheckInWaiting && checkInWindow ? (
          <Banner
            variant="info"
            title="Check-in opens soon"
            body={`Check-in opens 30 minutes before the shift starts (${new Intl.DateTimeFormat(
              undefined,
              { weekday: 'short', hour: '2-digit', minute: '2-digit' },
            ).format(checkInWindow.opensAt)}).`}
          />
        ) : null}

        {assignment?.status === 'accepted' && checkInWindow?.isTooLate ? (
          <Banner
            variant="warning"
            title="Check-in window closed"
            body="This shift has ended. Check-in is no longer available."
          />
        ) : null}

        {!canClaim && claimBlockedReason ? (
          <Banner
            variant="warning"
            title="Claim unavailable"
            body={claimBlockedReason}
            actionLabel={!isVerified ? 'Continue account setup' : 'View invoices'}
            onAction={() =>
              router.push(!isVerified ? '/auth/worker/pending' : '/(tabs)/invoices')
            }
          />
        ) : null}
      </ScrollView>

      {primaryAction ? (
        <StickyActionBar>
          <Button
            label={primaryAction.label}
            variant="primary"
            loading={primaryAction.loading}
            disabled={primaryAction.disabled}
            onPress={primaryAction.onPress}
          />
        </StickyActionBar>
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
  },
  scrollSticky: {
    paddingBottom: spacing.huge,
  },
  titleBlock: {
    gap: spacing.xs,
  },
  shiftTitle: {
    fontFamily: typography.fonts.display,
    fontSize: 24,
    lineHeight: 30,
    color: colors.navy,
    letterSpacing: -0.3,
  },
  orgLine: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
    color: colors.textSecondary,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  heroLabel: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.size.sm,
    color: colors.tealStrong,
    marginBottom: spacing.sm,
  },
  heroMeta: {
    marginTop: spacing.sm,
    gap: 0,
  },
  section: {
    gap: spacing.sm,
  },
  sectionLabel: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    paddingHorizontal: 2,
  },
  groupPad: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
  },
  payRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  payLabel: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.size.md,
    color: colors.textSecondary,
  },
  hint: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  notes: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.textSecondary,
  },
  notesToggle: {
    marginTop: spacing.sm,
    minHeight: 44,
    justifyContent: 'center',
  },
  notesToggleText: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.size.sm,
    color: colors.tealStrong,
  },
});
