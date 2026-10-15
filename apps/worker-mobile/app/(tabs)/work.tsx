import { WORKER_ROLE_LABELS } from '@bridge-hive/domain';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppScreen } from '@/components/ui/AppScreen';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { ProgressStep, type ProgressStepState } from '@/components/ui/ProgressStep';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { StickyActionBar } from '@/components/ui/StickyActionBar';
import { Button } from '@/components/ui/Button';
import { colors, radii, spacing, typography } from '@/constants/theme';
import { useAssignments } from '@/hooks/useAssignments';
import type { AssignmentWithShift } from '@/lib/queries';
import { canSubmitCompletedHours, shiftHasEnded } from '@/lib/rpcs';
import { useAuth } from '@/providers/AuthProvider';
import {
  formatDayLabel,
  formatMoney,
  formatTimeRange,
  isoDateFromTimestamp,
} from '@/utils/format';

type WorkSegment = 'upcoming' | 'to_submit' | 'completed';

function segmentFor(assignment: AssignmentWithShift, now = new Date()): WorkSegment {
  const status = assignment.status;
  if (status === 'approved' || status === 'rejected') return 'completed';
  if (status === 'submitted') return 'to_submit';
  if (canSubmitCompletedHours(status)) {
    const endsAt = assignment.shifts?.ends_at;
    if (endsAt && shiftHasEnded(endsAt, now)) return 'to_submit';
    return 'upcoming';
  }
  return 'completed';
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    accepted: 'Accepted',
    checked_in: 'Accepted',
    checked_out: 'Accepted',
    submitted: 'Hours submitted',
    approved: 'Approved',
    rejected: 'Rejected',
  };
  return map[status] ?? status.replace(/_/g, ' ');
}

function stepState(status: string, target: string): ProgressStepState {
  const order = ['accepted', 'submitted', 'approved'];
  if (status === 'rejected') return target === 'approved' ? 'rejected' : 'complete';
  const normalized =
    status === 'checked_in' || status === 'checked_out' ? 'accepted' : status;
  const cur = order.indexOf(normalized);
  const tgt = order.indexOf(target);
  if (cur < 0 || tgt < 0) return 'not_started';
  if (cur > tgt) return 'complete';
  if (cur === tgt) return 'in_progress';
  return 'not_started';
}

export default function WorkScreen() {
  const { user } = useAuth();
  const { assignments, loading, error, refresh } = useAssignments(user?.id);
  const [segment, setSegment] = useState<WorkSegment>('upcoming');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [nowTick, setNowTick] = useState(() => Date.now());

  useFocusEffect(
    useCallback(() => {
      void refresh();
      setNowTick(Date.now());
    }, [refresh]),
  );

  const now = useMemo(() => new Date(nowTick), [nowTick]);

  const filtered = useMemo(
    () => assignments.filter((a) => segmentFor(a, now) === segment),
    [assignments, segment, now],
  );

  const active = useMemo(() => {
    const needingSubmit = assignments.find(
      (a) =>
        canSubmitCompletedHours(a.status) &&
        a.shifts?.ends_at &&
        shiftHasEnded(a.shifts.ends_at, now),
    );
    if (needingSubmit) return needingSubmit;
    return (
      assignments.find((a) => canSubmitCompletedHours(a.status)) ?? null
    );
  }, [assignments, now]);

  const sticky = useMemo(() => {
    if (!active) return null;
    const ended =
      active.shifts?.ends_at != null && shiftHasEnded(active.shifts.ends_at, now);
    if (canSubmitCompletedHours(active.status) && ended) {
      return {
        label: 'Submit completed hours',
        onPress: () => router.push(`/shifts/${active.shift_id}`),
      };
    }
    if (canSubmitCompletedHours(active.status)) {
      return {
        label: 'Open my shift',
        onPress: () => router.push(`/shifts/${active.shift_id}`),
      };
    }
    return null;
  }, [active, now]);

  return (
    <AppScreen scroll={false} edges={['top']}>
      <View>
        <ScreenHeader
          eyebrow="Assignments"
          title="My shifts"
          subtitle="Accepted shifts — submit hours after each scheduled end"
        />
        <SegmentedTabs
          tabs={[
            { key: 'upcoming', label: 'Upcoming' },
            { key: 'to_submit', label: 'To submit' },
            { key: 'completed', label: 'Completed' },
          ]}
          activeKey={segment}
          onChange={(key) => setSegment(key as WorkSegment)}
        />
      </View>

      {loading && assignments.length === 0 ? (
        <View style={styles.stack}>
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : error && assignments.length === 0 ? (
        <ErrorState title="Could not load shifts" onRetry={refresh} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
          ListEmptyComponent={
            <EmptyState
              title={
                segment === 'upcoming'
                  ? 'No upcoming shifts'
                  : segment === 'to_submit'
                    ? 'Nothing to submit'
                    : 'No completed shifts yet'
              }
              description={
                segment === 'upcoming'
                  ? 'Claim an open shift to see it here.'
                  : segment === 'to_submit'
                    ? 'After a shift ends, submit completed hours for organization review.'
                    : 'Approved and rejected assignments appear here.'
              }
              actionLabel={segment === 'upcoming' ? 'Browse shifts' : undefined}
              onAction={
                segment === 'upcoming' ? () => router.push('/(tabs)/shifts') : undefined
              }
            />
          }
          renderItem={({ item }) => (
            <AssignmentRow
              assignment={item}
              expanded={expandedId === item.id}
              onToggle={() =>
                setExpandedId((id) => (id === item.id ? null : item.id))
              }
              now={now}
            />
          )}
        />
      )}

      {sticky ? (
        <StickyActionBar>
          <Button label={sticky.label} variant="primary" onPress={sticky.onPress} />
        </StickyActionBar>
      ) : null}
    </AppScreen>
  );
}

function AssignmentRow({
  assignment,
  expanded,
  onToggle,
  now,
}: {
  assignment: AssignmentWithShift;
  expanded: boolean;
  onToggle: () => void;
  now: Date;
}) {
  const shift = assignment.shifts;
  const roleLabel = shift
    ? WORKER_ROLE_LABELS[shift.required_role as keyof typeof WORKER_ROLE_LABELS] ??
      shift.required_role
    : 'Shift';
  const ended = shift?.ends_at != null && shiftHasEnded(shift.ends_at, now);
  const awaitingSubmit = canSubmitCompletedHours(assignment.status);

  return (
    <View style={styles.card}>
      <Pressable
        onPress={() => router.push(`/shifts/${assignment.shift_id}`)}
        accessibilityRole="button"
        accessibilityLabel={`${roleLabel}, ${statusLabel(assignment.status)}`}
        style={styles.cardPress}
      >
        <View style={styles.cardTop}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={styles.cardTitle}>{shift?.title?.trim() || roleLabel}</Text>
            {shift ? (
              <Text style={styles.cardMeta}>
                {formatDayLabel(isoDateFromTimestamp(shift.starts_at))} ·{' '}
                {formatTimeRange(shift.starts_at, shift.ends_at)}
              </Text>
            ) : null}
            {shift ? (
              <Text style={styles.cardPay}>
                {formatMoney(shift.rate_minor, shift.currency)}/hr
              </Text>
            ) : null}
          </View>
          <StatusBadge
            label={statusLabel(assignment.status)}
            tone={
              assignment.status === 'rejected'
                ? 'danger'
                : assignment.status === 'approved'
                  ? 'success'
                  : awaitingSubmit && ended
                    ? 'accent'
                    : 'info'
            }
            icon="time-outline"
          />
        </View>
      </Pressable>

      <Pressable onPress={onToggle} accessibilityRole="button" accessibilityLabel="Toggle timeline">
        <Text style={styles.timelineToggle}>{expanded ? 'Hide progress' : 'Show progress'}</Text>
      </Pressable>

      {expanded ? (
        <View style={styles.timeline}>
          <ProgressStep
            step={1}
            title="Accepted"
            statusLabel={
              stepState(assignment.status, 'accepted') === 'complete' ||
              awaitingSubmit
                ? 'Done'
                : 'Pending'
            }
            state={
              awaitingSubmit
                ? 'in_progress'
                : stepState(assignment.status, 'accepted')
            }
            isCurrent={awaitingSubmit && !ended}
          />
          <ProgressStep
            step={2}
            title="Submit hours"
            statusLabel={
              ['submitted', 'approved', 'rejected'].includes(assignment.status)
                ? 'Submitted'
                : awaitingSubmit && ended
                  ? 'Ready'
                  : 'After end'
            }
            state={
              awaitingSubmit && ended
                ? 'in_progress'
                : stepState(assignment.status, 'submitted')
            }
            isCurrent={awaitingSubmit && ended}
          />
          <ProgressStep
            step={3}
            title="Organization review"
            statusLabel={
              assignment.status === 'approved'
                ? 'Approved'
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
                ? 'Approved'
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
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.md,
  },
  list: {
    paddingBottom: spacing.huge,
    gap: spacing.sm,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  cardPress: {
    padding: spacing.md,
  },
  cardTop: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  cardTitle: {
    fontFamily: typography.fonts.semibold,
    fontSize: 15,
    color: colors.text,
  },
  cardMeta: {
    fontFamily: typography.fonts.regular,
    fontSize: 13,
    color: colors.textSecondary,
  },
  cardPay: {
    fontFamily: typography.fonts.semibold,
    fontSize: 14,
    color: colors.navy,
  },
  timelineToggle: {
    fontFamily: typography.fonts.medium,
    fontSize: 13,
    color: colors.tealStrong,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  timeline: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
});
