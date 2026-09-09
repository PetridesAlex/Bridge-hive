import { useLocalSearchParams, router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
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
import {
  submitTimesheet,
  updateAssignmentStatus,
  getMyAssignments,
  type ShiftAssignment,
} from '@/lib/queries';
import {
  claimErrorMessage,
  claimShift,
  getWorkerShiftDetails,
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
    setActing(true);
    const result = await updateAssignmentStatus(assignment.id, {
      status: 'checked_in',
      check_in_at: new Date().toISOString(),
    });
    setActing(false);
    if (result.error) {
      Alert.alert('Check-in failed', result.error);
      return;
    }
    void refresh();
  };

  const onCheckOut = async () => {
    if (!assignment || !shift) return;
    setActing(true);
    const checkOutAt = new Date().toISOString();
    const statusResult = await updateAssignmentStatus(assignment.id, {
      status: 'checked_out',
      check_out_at: checkOutAt,
    });
    if (statusResult.error) {
      setActing(false);
      Alert.alert('Check-out failed', statusResult.error);
      return;
    }

    const start = new Date(assignment.check_in_at ?? shift.starts_at).getTime();
    const end = new Date(checkOutAt).getTime();
    const submittedMinutes = Math.max(
      0,
      Math.round((end - start) / 60000) - shift.break_minutes,
    );

    const ts = await submitTimesheet({
      assignmentId: assignment.id,
      submittedMinutes,
      breakMinutes: shift.break_minutes,
    });
    if (ts.error) {
      setActing(false);
      Alert.alert('Timesheet error', ts.error);
      return;
    }

    const submitted = await updateAssignmentStatus(assignment.id, { status: 'submitted' });
    setActing(false);
    if (submitted.error) {
      Alert.alert('Timesheet saved', 'Assignment status could not be updated: ' + submitted.error);
    } else {
      Alert.alert('Timesheet submitted', `${submittedMinutes} minutes submitted for review.`);
    }
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
      </View>

      <View style={styles.actions}>
        {canClaim ? (
          <Button label="Claim shift" variant="brand" loading={claiming} onPress={onClaim} />
        ) : null}
        {assignment?.status === 'accepted' ? (
          <Button label="Check in" variant="brand" loading={acting} onPress={onCheckIn} />
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
  actions: { gap: spacing.sm, marginTop: spacing.xl },
});
