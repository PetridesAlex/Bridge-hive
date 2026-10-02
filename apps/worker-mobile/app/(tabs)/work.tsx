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
import { useAuth } from '@/providers/AuthProvider';
import {
  formatDayLabel,
  formatMoney,
  formatTimeRange,
  isoDateFromTimestamp,
} from '@/utils/format';

type WorkSegment = 'upcoming' | 'in_progress' | 'completed';

function segmentFor(status: string): WorkSegment {
  if (['accepted'].includes(status)) return 'upcoming';
  if (['checked_in', 'checked_out', 'submitted'].includes(status)) return 'in_progress';
  return 'completed';
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    accepted: 'Accepted',
    checked_in: 'Checked in',
    checked_out: 'Checked out',
    submitted: 'Timesheet submitted',
    approved: 'Approved',
    rejected: 'Rejected',
  };
  return map[status] ?? status.replace(/_/g, ' ');
}

function stepState(status: string, target: string): ProgressStepState {
  const order = ['accepted', 'checked_in', 'checked_out', 'submitted', 'approved'];
  if (status === 'rejected') return target === 'approved' ? 'rejected' : 'complete';
  const cur = order.indexOf(status);
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

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const filtered = useMemo(
    () => assignments.filter((a) => segmentFor(a.status) === segment),
    [assignments, segment],
  );

  const active = useMemo(
    () =>
      assignments.find((a) =>
        ['accepted', 'checked_in', 'checked_out'].includes(a.status),
      ) ?? null,
    [assignments],
  );

  const sticky = useMemo(() => {
    if (!active) return null;
    if (active.status === 'accepted') {
      return {
        label: 'Open shift to check in',
        onPress: () => router.push(`/shifts/${active.shift_id}`),
      };
    }
    if (active.status === 'checked_in') {
      return {
        label: 'Check out & submit timesheet',
        onPress: () => router.push(`/shifts/${active.shift_id}`),
      };
    }
    if (active.status === 'checked_out') {
      return {
        label: 'Submit timesheet',
        onPress: () => router.push(`/shifts/${active.shift_id}`),
      };
    }
    return null;
  }, [active]);

  return (
    <AppScreen scroll={false} edges={['top']}>
      <View>
        <ScreenHeader
          eyebrow="Assignments"
          title="Work"
          subtitle="Your accepted assignments and workday progress"
        />
        <SegmentedTabs
          tabs={[
            { key: 'upcoming', label: 'Upcoming' },
            { key: 'in_progress', label: 'In progress' },
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
        <ErrorState title="Could not load work" onRetry={refresh} />
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
                  ? 'No upcoming assignments'
                  : segment === 'in_progress'
                    ? 'Nothing in progress'
                    : 'No completed work yet'
              }
              description={
                segment === 'upcoming'
                  ? 'Claim an open shift to see it here.'
                  : 'Workday progress for your accepted shifts appears in these lists.'
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
}: {
  assignment: AssignmentWithShift;
  expanded: boolean;
  onToggle: () => void;
}) {
  const shift = assignment.shifts;
  const roleLabel = shift
    ? WORKER_ROLE_LABELS[shift.required_role as keyof typeof WORKER_ROLE_LABELS] ??
      shift.required_role
    : 'Shift';

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
                  : assignment.status === 'checked_in'
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
            statusLabel={stepState(assignment.status, 'accepted') === 'complete' || assignment.status === 'accepted' ? 'Done' : 'Pending'}
            state={
              assignment.status === 'accepted'
                ? 'in_progress'
                : stepState(assignment.status, 'accepted')
            }
            isCurrent={assignment.status === 'accepted'}
          />
          <ProgressStep
            step={2}
            title="Check-in"
            statusLabel={
              stepState(assignment.status, 'checked_in') === 'complete' ||
              assignment.status === 'checked_in'
                ? 'Done'
                : 'Pending'
            }
            state={
              assignment.status === 'checked_in'
                ? 'in_progress'
                : stepState(assignment.status, 'checked_in')
            }
            isCurrent={assignment.status === 'accepted'}
          />
          <ProgressStep
            step={3}
            title="Check-out & timesheet"
            statusLabel={
              ['submitted', 'approved', 'rejected'].includes(assignment.status)
                ? 'Submitted'
                : assignment.status === 'checked_in' || assignment.status === 'checked_out'
                  ? 'Ready'
                  : 'Pending'
            }
            state={
              assignment.status === 'checked_in' || assignment.status === 'checked_out'
                ? 'in_progress'
                : stepState(assignment.status, 'submitted')
            }
            isCurrent={
              assignment.status === 'checked_in' || assignment.status === 'checked_out'
            }
          />
          <ProgressStep
            step={4}
            title="Organization review"
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
                  : assignment.status === 'submitted'
                    ? 'under_review'
                    : 'not_started'
            }
            isCurrent={assignment.status === 'submitted'}
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
