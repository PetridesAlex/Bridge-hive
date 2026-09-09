import { useLocalSearchParams, router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppScreen } from '@/components/ui/AppScreen';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
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
import {
  formatDayLabel,
  formatMoney,
  formatTimeRange,
  isoDateFromTimestamp,
} from '@/utils/format';

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

  // Refresh check-in window affordance while waiting to open.
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
    if (!id || !isVerified) return;
    setClaiming(true);
    const result = await claimShift(id);
    setClaiming(false);
    if (result.error) {
      Alert.alert('Claim failed', claimErrorMessage(result.error));
      return;
    }
    Alert.alert('Shift claimed', 'This shift is now on your schedule.');
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
      <AppScreen>
        <ScreenHeader title="Shift" showBack />
        <ActivityIndicator color={colors.navy} style={{ marginTop: spacing.xxxl }} />
      </AppScreen>
    );
  }

  if (!shift) {
    return (
      <AppScreen>
        <ScreenHeader title="Shift" showBack />
        <EmptyState title="Shift unavailable" description={error} actionLabel="Retry" onAction={refresh} />
      </AppScreen>
    );
  }

  const roleLabel =
    WORKER_ROLE_LABELS[shift.required_role as keyof typeof WORKER_ROLE_LABELS] ??
    shift.required_role;
  const canClaim = isVerified && shift.status === 'published' && !assignment;
  const canCheckIn =
    assignment?.status === 'accepted' && Boolean(checkInWindow?.isOpen);
  const showCheckInWaiting =
    assignment?.status === 'accepted' && Boolean(checkInWindow?.isTooEarly);

  return (
    <AppScreen>
      <ScreenHeader title={shift.title || roleLabel} showBack subtitle={shift.organization_name} />
      <View style={styles.card}>
        <Text style={styles.label}>Location</Text>
        <Text style={styles.value}>
          {shift.location_name}
          {shift.ward_name ? ` · ${shift.ward_name}` : ''}
        </Text>
        <Text style={styles.label}>When</Text>
        <Text style={styles.value}>
          {formatDayLabel(isoDateFromTimestamp(shift.starts_at))} ·{' '}
          {formatTimeRange(shift.starts_at, shift.ends_at)}
        </Text>
        <Text style={styles.label}>Rate</Text>
        <Text style={styles.value}>{formatMoney(shift.rate_minor, shift.currency)} / hour</Text>
        <Text style={styles.label}>Role</Text>
        <Text style={styles.value}>{roleLabel}</Text>
        {shift.notes ? (
          <>
            <Text style={styles.label}>Notes</Text>
            <Text style={styles.value}>{shift.notes}</Text>
          </>
        ) : null}
        {assignment ? (
          <>
            <Text style={styles.label}>Your assignment</Text>
            <Text style={styles.value}>{assignment.status.replace(/_/g, ' ')}</Text>
          </>
        ) : null}
        {showCheckInWaiting && checkInWindow ? (
          <>
            <Text style={styles.label}>Check-in</Text>
            <Text style={styles.hint}>
              Opens 30 minutes before the shift starts (
              {formatDayLabel(isoDateFromTimestamp(checkInWindow.opensAt.toISOString()))}{' '}
              at{' '}
              {new Intl.DateTimeFormat(undefined, {
                hour: '2-digit',
                minute: '2-digit',
              }).format(checkInWindow.opensAt)}
              ).
            </Text>
          </>
        ) : null}
        {assignment?.status === 'accepted' && checkInWindow?.isTooLate ? (
          <>
            <Text style={styles.label}>Check-in</Text>
            <Text style={styles.hint}>This shift has ended. Check-in is no longer available.</Text>
          </>
        ) : null}
      </View>

      <View style={styles.actions}>
        {canClaim ? (
          <Button label="Claim shift" variant="brand" loading={claiming} onPress={onClaim} />
        ) : null}
        {assignment?.status === 'accepted' ? (
          <Button
            label="Check in"
            variant="brand"
            loading={acting}
            disabled={!canCheckIn}
            onPress={onCheckIn}
          />
        ) : null}
        {assignment?.status === 'checked_in' ? (
          <Button
            label="Check out & submit timesheet"
            variant="brand"
            loading={acting}
            onPress={onCheckOut}
          />
        ) : null}
        {assignment ? (
          <Button label="Back to home" variant="secondary" onPress={() => router.push('/(tabs)')} />
        ) : null}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: {
    fontFamily: typography.fonts.semibold,
    fontSize: 12,
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginTop: spacing.sm,
  },
  value: {
    fontFamily: typography.fonts.medium,
    fontSize: 16,
    color: colors.text,
    textTransform: 'capitalize',
  },
  hint: {
    fontFamily: typography.fonts.regular,
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 20,
    textTransform: 'none',
  },
  actions: { gap: spacing.sm, marginTop: spacing.xl },
});
