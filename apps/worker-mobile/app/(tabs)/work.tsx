import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { AppReviewDemoBanner } from '@/components/review/AppReviewDemoBanner';
import { AppScreen } from '@/components/ui/AppScreen';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { PremiumActionButton } from '@/components/ui/PremiumActionButton';
import { StickyActionBar } from '@/components/ui/StickyActionBar';
import { useTabBarScrollInset } from '@/components/navigation/AnimatedTabBar';
import { AssignmentCard } from '@/components/work/AssignmentCard';
import { colors, radii, spacing, typography } from '@/constants/theme';
import {
  WORK_SEGMENTS,
  type WorkSegment,
} from '@/constants/workSegments';
import { useAssignments } from '@/hooks/useAssignments';
import { useTranslation } from '@/i18n/locale-provider';
import type { AssignmentWithShift } from '@/lib/queries';
import { canSubmitCompletedHours, shiftHasEnded } from '@/lib/rpcs';
import { useAuth } from '@/providers/AuthProvider';

function segmentFor(assignment: AssignmentWithShift, now = new Date()): WorkSegment {
  const status = assignment.status;
  if (status === 'approved' || status === 'rejected' || status === 'submitted') {
    return 'completed';
  }
  if (canSubmitCompletedHours(status)) {
    const endsAt = assignment.shifts?.ends_at;
    if (endsAt && shiftHasEnded(endsAt, now)) return 'to_submit';
    return 'upcoming';
  }
  return 'completed';
}

export default function WorkScreen() {
  const { user, isAppReviewDemo } = useAuth();
  const { t } = useTranslation();
  const { assignments, loading, error, refresh } = useAssignments(user?.id);
  const tabScrollInset = useTabBarScrollInset(spacing.xl);
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

  const counts = useMemo(() => {
    const next = { upcoming: 0, to_submit: 0, completed: 0 };
    for (const assignment of assignments) {
      next[segmentFor(assignment, now)] += 1;
    }
    return next;
  }, [assignments, now]);

  const filtered = useMemo(
    () => assignments.filter((a) => segmentFor(a, now) === segment),
    [assignments, segment, now],
  );

  const theme = WORK_SEGMENTS[segment];
  const segmentLabel =
    segment === 'upcoming'
      ? t('work.upcoming')
      : segment === 'to_submit'
        ? t('work.toSubmit')
        : t('work.completed');
  const segmentDescription =
    segment === 'upcoming'
      ? t('work.upcomingDesc')
      : segment === 'to_submit'
        ? t('work.toSubmitDesc')
        : t('work.completedDesc');

  const active = useMemo(() => {
    const needingSubmit = assignments.find(
      (a) =>
        canSubmitCompletedHours(a.status) &&
        a.shifts?.ends_at &&
        shiftHasEnded(a.shifts.ends_at, now),
    );
    if (needingSubmit) return needingSubmit;
    return assignments.find((a) => canSubmitCompletedHours(a.status)) ?? null;
  }, [assignments, now]);

  const sticky = useMemo(() => {
    if (!active) return null;
    const ended =
      active.shifts?.ends_at != null && shiftHasEnded(active.shifts.ends_at, now);
    if (canSubmitCompletedHours(active.status) && ended) {
      return {
        label: t('work.submitHours'),
        icon: 'checkmark-circle-outline' as const,
        onPress: () => router.push(`/shifts/${active.shift_id}`),
      };
    }
    if (canSubmitCompletedHours(active.status)) {
      return {
        label: t('work.openMyShift'),
        icon: 'arrow-forward' as const,
        onPress: () => router.push(`/shifts/${active.shift_id}`),
      };
    }
    return null;
  }, [active, now, t]);

  return (
    <AppScreen scroll={false} edges={['top']}>
      <View>
        <ScreenHeader
          eyebrow={t('work.eyebrow')}
          title={t('work.title')}
          subtitle={t('work.subtitle')}
        />
        {isAppReviewDemo ? (
          <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }}>
            <AppReviewDemoBanner />
          </View>
        ) : null}
        <SegmentedTabs
          tabs={[
            {
              key: 'upcoming',
              label: t('work.upcoming'),
              icon: WORK_SEGMENTS.upcoming.icon,
              iconFocused: WORK_SEGMENTS.upcoming.iconFocused,
              badge: counts.upcoming,
              accentColor: WORK_SEGMENTS.upcoming.accent,
              accentGradient: WORK_SEGMENTS.upcoming.gradient,
            },
            {
              key: 'to_submit',
              label: t('work.toSubmit'),
              icon: WORK_SEGMENTS.to_submit.icon,
              iconFocused: WORK_SEGMENTS.to_submit.iconFocused,
              badge: counts.to_submit,
              accentColor: WORK_SEGMENTS.to_submit.accent,
              accentGradient: WORK_SEGMENTS.to_submit.gradient,
            },
            {
              key: 'completed',
              label: t('work.completed'),
              icon: WORK_SEGMENTS.completed.icon,
              iconFocused: WORK_SEGMENTS.completed.iconFocused,
              badge: counts.completed,
              accentColor: WORK_SEGMENTS.completed.accent,
              accentGradient: WORK_SEGMENTS.completed.gradient,
            },
          ]}
          activeKey={segment}
          onChange={(key) => setSegment(key as WorkSegment)}
        />

        <View
          style={[
            styles.legend,
            { backgroundColor: theme.accentSoft, borderColor: theme.border },
          ]}
        >
          <LinearGradient
            colors={theme.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.legendIcon}
          >
            <Ionicons name={theme.iconFocused} size={16} color={colors.white} />
          </LinearGradient>
          <View style={styles.legendCopy}>
            <Text style={[styles.legendTitle, { color: theme.accent }]}>
              {segmentLabel}
              {counts[segment] > 0 ? ` · ${counts[segment]}` : ''}
            </Text>
            <Text style={styles.legendBody}>{segmentDescription}</Text>
          </View>
        </View>
      </View>

      {loading && assignments.length === 0 ? (
        <View style={styles.stack}>
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : error && assignments.length === 0 ? (
        <ErrorState title={t('work.loadError')} onRetry={refresh} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.list, { paddingBottom: tabScrollInset }]}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
          ListEmptyComponent={
            <EmptyState
              title={
                segment === 'upcoming'
                  ? t('work.emptyUpcoming')
                  : segment === 'to_submit'
                    ? t('work.emptyToSubmit')
                    : t('work.emptyCompleted')
              }
              description={segmentDescription}
              actionLabel={segment === 'upcoming' ? t('shifts.browse') : undefined}
              onAction={
                segment === 'upcoming' ? () => router.push('/(tabs)/shifts') : undefined
              }
            />
          }
          renderItem={({ item }) => (
            <AssignmentCard
              assignment={item}
              segment={segment}
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
          <PremiumActionButton
            label={sticky.label}
            onPress={sticky.onPress}
            icon={sticky.icon}
          />
        </StickyActionBar>
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.md,
  },
  list: {
    gap: spacing.md,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  legendIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  legendTitle: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 14,
    letterSpacing: -0.1,
  },
  legendBody: {
    fontFamily: typography.fonts.regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textSecondary,
  },
});
