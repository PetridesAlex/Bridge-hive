import {
  estimatedWorkerShiftPayMinor,
  openPositionsLabel,
  SHIFT_UNAVAILABLE_TITLE,
} from '@bridge-hive/domain';
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
import { TextInput } from '@/components/ui/TextInput';

import { WORKER_ROLE_LABELS } from '@/constants/config';
import { colors, spacing, typography } from '@/constants/theme';
import { getMyAssignments, type ShiftAssignment } from '@/lib/queries';
import {
  assignmentActionErrorMessage,
  canSubmitCompletedHours,
  claimErrorMessage,
  claimShift,
  getWorkerShiftDetails,
  scheduledWorkingMinutes,
  shiftHasEnded,
  submitTimesheetRpc,
  type WorkerShiftDetails,
} from '@/lib/rpcs';
import { clearPendingShiftRoute, peekPendingShiftRoute } from '@/lib/push/pending-shift';
import { useAuth } from '@/providers/AuthProvider';
import { formatDurationMinutes, formatMoney } from '@/utils/format';

function assignmentStepState(
  status: string | undefined,
  target: string,
): ProgressStepState {
  const order = ['accepted', 'submitted', 'approved'];
  if (!status) return 'not_started';
  if (status === 'rejected') return 'rejected';
  // Legacy in-flight check-in/out rows map to the submit step.
  const normalized =
    status === 'checked_in' || status === 'checked_out' ? 'accepted' : status;
  const current = order.indexOf(normalized);
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

function minutesToHoursMinutes(total: number): { hours: string; minutes: string } {
  const safe = Math.max(0, Math.floor(total));
  return {
    hours: String(Math.floor(safe / 60)),
    minutes: String(safe % 60),
  };
}

function parseCompletedMinutes(hoursText: string, minutesText: string): number | null {
  const hours = Number.parseInt(hoursText.trim() || '0', 10);
  const minutes = Number.parseInt(minutesText.trim() || '0', 10);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (hours < 0 || minutes < 0 || minutes > 59) return null;
  const total = hours * 60 + minutes;
  if (total < 1 || total > 1440) return null;
  return total;
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
  const [actionError, setActionError] = useState<string>();
  const [actionSuccess, setActionSuccess] = useState<string>();
  const [nowTick, setNowTick] = useState(() => Date.now());
  const [notesExpanded, setNotesExpanded] = useState(false);
  const [hoursText, setHoursText] = useState('0');
  const [minutesText, setMinutesText] = useState('0');
  const [hoursPrefillKey, setHoursPrefillKey] = useState<string | null>(null);

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
    const pending = peekPendingShiftRoute();
    if (pending && id && pending.endsWith(String(id).toLowerCase())) {
      clearPendingShiftRoute();
    }
  }, [id]);

  useEffect(() => {
    if (!shift || !canSubmitCompletedHours(assignment?.status)) return;
    const idTimer = setInterval(() => setNowTick(Date.now()), 30_000);
    return () => clearInterval(idTimer);
  }, [shift, assignment?.status]);

  useEffect(() => {
    if (!shift || !assignment) return;
    const key = `${assignment.id}:${shift.starts_at}:${shift.ends_at}:${shift.break_minutes}`;
    if (hoursPrefillKey === key) return;
    const pref = minutesToHoursMinutes(
      scheduledWorkingMinutes(shift.starts_at, shift.ends_at, shift.break_minutes),
    );
    setHoursText(pref.hours);
    setMinutesText(pref.minutes);
    setHoursPrefillKey(key);
  }, [assignment, shift, hoursPrefillKey]);

  const ended = useMemo(() => {
    if (!shift) return false;
    return shiftHasEnded(shift.ends_at, new Date(nowTick));
  }, [shift, nowTick]);

  const onClaim = async () => {
    if (!id || !isVerified || claiming) return;
    setClaiming(true);
    setActionError(undefined);
    setActionSuccess(undefined);
    const result = await claimShift(id);
    setClaiming(false);
    if (result.error) {
      const message = claimErrorMessage(result.error, shift?.required_role);
      setActionError(message);
      Alert.alert('Claim failed', message);
      return;
    }
    setActionSuccess('Shift accepted. It is now on My shifts.');
    Alert.alert('Shift accepted.', 'This shift is now on your schedule.');
    void refresh();
  };

  const onSubmitHours = async () => {
    if (!assignment) return;
    const total = parseCompletedMinutes(hoursText, minutesText);
    if (total == null) {
      const message = 'Enter completed time between 1 minute and 24 hours.';
      setActionError(message);
      Alert.alert('Invalid hours', message);
      return;
    }
    if (!ended) {
      const message = 'You can submit completed hours after the scheduled end time.';
      setActionError(message);
      Alert.alert('Shift not ended', message);
      return;
    }
    setActing(true);
    setActionError(undefined);
    setActionSuccess(undefined);
    const ts = await submitTimesheetRpc(assignment.id, total);
    setActing(false);
    if (ts.error) {
      const message = assignmentActionErrorMessage(ts.error);
      setActionError(message);
      Alert.alert('Timesheet error', message);
      return;
    }

    const minutes = ts.data?.submitted_minutes ?? total;
    const message = `${minutes} minutes submitted for organization review.`;
    setActionSuccess(message);
    Alert.alert('Hours submitted', message);
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
    if (error) {
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
    return (
      <AppScreen edges={['top']} contentKind="detail">
        <ScreenHeader title="Shift details" showBack />
        <EmptyState
          title={SHIFT_UNAVAILABLE_TITLE}
          description="It may be filled, withdrawn, or no longer open for your role."
        />
      </AppScreen>
    );
  }

  const roleLabel =
    WORKER_ROLE_LABELS[shift.required_role as keyof typeof WORKER_ROLE_LABELS] ??
    shift.required_role;
  const openPositions = shift.open_positions ?? 0;
  const canClaim =
    isVerified &&
    shift.status === 'published' &&
    !assignment &&
    openPositions > 0;
  const canComplete =
    canSubmitCompletedHours(assignment?.status) && ended;
  const claimBlockedReason = !isVerified
    ? 'Complete account verification before claiming shifts.'
    : assignment
      ? undefined
      : shift.status !== 'published'
        ? 'This shift is no longer open for claims.'
        : openPositions < 1
          ? 'All positions on this shift are filled.'
          : undefined;

  const start = new Date(shift.starts_at);
  const end = new Date(shift.ends_at);
  const durationMin = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60_000));
  const estimatedPayMinor = estimatedWorkerShiftPayMinor({
    rateMinor: shift.rate_minor,
    startsAtIso: shift.starts_at,
    endsAtIso: shift.ends_at,
    breakMinutes: shift.break_minutes,
  });
  const notesLong = (shift.notes?.length ?? 0) > 160;
  const notesVisible =
    !shift.notes
      ? ''
      : notesExpanded || !notesLong
        ? shift.notes
        : `${shift.notes.slice(0, 160).trim()}…`;

  const endLabel = new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(end);

  const primaryAction = canClaim
    ? {
        label: claiming ? 'Claiming shift…' : 'Claim shift',
        onPress: onClaim,
        loading: claiming,
        disabled: claiming,
      }
    : canComplete
      ? {
          label: acting ? 'Submitting…' : 'Submit completed hours',
          onPress: onSubmitHours,
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
            ) : openPositions > 0 ? (
              <StatusBadge label="Open" tone="accent" icon="calendar-outline" />
            ) : (
              <StatusBadge label="Full" tone="neutral" icon="calendar-outline" />
            )}
          </View>
        </View>

        <Surface>
          <Text style={styles.heroLabel}>When & where</Text>
          <DateTimeBlock startsAt={shift.starts_at} endsAt={shift.ends_at} />
          <View style={styles.heroMeta}>
            <KeyValueRow label="Location" value={shift.location_name} />
            {shift.ward_name ? (
              <KeyValueRow label="Ward" value={shift.ward_name} />
            ) : null}
            <KeyValueRow label="Duration" value={formatDurationMinutes(durationMin)} />
            {shift.break_minutes > 0 ? (
              <KeyValueRow
                label="Break"
                value={formatDurationMinutes(shift.break_minutes)}
              />
            ) : null}
            <KeyValueRow
              label="Positions"
              value={
                shift.status === 'published'
                  ? openPositionsLabel(openPositions)
                  : `${shift.required_positions ?? 1}`
              }
            />
          </View>
        </Surface>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Your pay</Text>
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
              {estimatedPayMinor > 0 ? (
                <View style={[styles.payRow, { marginTop: spacing.sm }]}>
                  <Text style={styles.payLabel}>Est. for this assignment</Text>
                  <MoneyAmount
                    amountMinor={estimatedPayMinor}
                    currency={shift.currency}
                    emphasize
                    accessibilityLabel={`${formatMoney(estimatedPayMinor, shift.currency)} estimated for this assignment`}
                  />
                </View>
              ) : null}
              <Text style={styles.hint}>
                Estimated gross uses the scheduled length minus break. Organizations pay
                approved gross amounts separately from Bridge Hive commission invoices.
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
                assignment.status === 'accepted' ||
                assignment.status === 'checked_in' ||
                assignment.status === 'checked_out'
                  ? 'in_progress'
                  : assignmentStepState(assignment.status, 'accepted')
              }
              isCurrent={canSubmitCompletedHours(assignment.status) && !ended}
            />
            <ProgressStep
              step={2}
              title="Submit hours"
              statusLabel={stepStatusLabel(
                assignment.status,
                'submitted',
                canSubmitCompletedHours(assignment.status)
                  ? ended
                    ? 'Ready'
                    : 'After shift end'
                  : undefined,
              )}
              state={
                canSubmitCompletedHours(assignment.status) && ended
                  ? 'in_progress'
                  : assignmentStepState(assignment.status, 'submitted')
              }
              isCurrent={canSubmitCompletedHours(assignment.status) && ended}
            />
            <ProgressStep
              step={3}
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
            />
            <ProgressStep
              step={4}
              title="Approved"
              statusLabel={
                assignment.status === 'approved'
                  ? ''
                  : assignment.status === 'rejected'
                    ? 'Rejected'
                    : 'Pending'
              }
              state={
                assignment.status === 'approved'
                  ? 'approved'
                  : assignment.status === 'rejected'
                    ? 'rejected'
                    : 'not_started'
              }
              isCurrent={assignment.status === 'approved'}
              isLast
            />
          </AssignmentTimeline>
        ) : null}

        {canSubmitCompletedHours(assignment?.status) && !ended ? (
          <Banner
            variant="info"
            title="Complete shift after the end time"
            body={`Submit completed hours after ${endLabel}. No invoice is created until the organization approves.`}
          />
        ) : null}

        {canComplete ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Completed hours</Text>
            <Surface variant="subtle">
              <View style={styles.hoursRow}>
                <TextInput
                  label="Hours"
                  value={hoursText}
                  onChangeText={setHoursText}
                  keyboardType="number-pad"
                  containerStyle={styles.hoursField}
                />
                <TextInput
                  label="Minutes"
                  value={minutesText}
                  onChangeText={setMinutesText}
                  keyboardType="number-pad"
                  helpText="0–59"
                  containerStyle={styles.hoursField}
                />
              </View>
              <Text style={styles.hint}>
                Prefill uses the scheduled length minus break. Adjust if your completed
                time differs before submitting.
              </Text>
            </Surface>
          </View>
        ) : null}

        {!canClaim && claimBlockedReason ? (
          <Banner
            variant="warning"
            title="Claim unavailable"
            body={claimBlockedReason}
            actionLabel={
              !isVerified
                ? 'Continue account setup'
                : shift.status !== 'published'
                  ? 'View invoices'
                  : undefined
            }
            onAction={
              !isVerified
                ? () => router.push('/auth/worker/pending')
                : shift.status !== 'published'
                  ? () => router.push('/(tabs)/invoices')
                  : undefined
            }
          />
        ) : null}

        {actionError ? (
          <Banner
            variant="danger"
            title="Could not complete action"
            body={actionError}
            actionLabel={
              actionError.toLowerCase().includes('conflicts')
                ? 'Open My shifts'
                : undefined
            }
            onAction={
              actionError.toLowerCase().includes('conflicts')
                ? () => router.push('/(tabs)/work')
                : undefined
            }
          />
        ) : null}

        {actionSuccess ? (
          <Banner variant="success" title="Done" body={actionSuccess} />
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
  hoursRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  hoursField: {
    flex: 1,
  },
});
