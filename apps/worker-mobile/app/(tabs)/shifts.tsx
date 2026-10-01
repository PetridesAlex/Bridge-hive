import React, { useMemo } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { WORKER_ROLE_LABELS } from '@bridge-hive/domain';

import { BillingRestrictionBanner } from '@/components/invoices/BillingRestrictionBanner';
import { ShiftCard } from '@/components/shifts/ShiftCard';
import { AppScreen } from '@/components/ui/AppScreen';
import { Banner } from '@/components/ui/Banner';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { IconButton } from '@/components/ui/IconButton';
import { ListGroupSeparator } from '@/components/ui/Card';
import { OfflineState } from '@/components/ui/OfflineState';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { colors, spacing, typography } from '@/constants/theme';
import { useBillingRestriction } from '@/hooks/useBillingRestriction';
import { useShifts } from '@/hooks/useShifts';
import type { Shift } from '@/lib/queries';
import { formatDayLabel, isoDateFromTimestamp } from '@/utils/format';

type Row =
  | { type: 'header'; key: string; title: string }
  | { type: 'shift'; key: string; shift: Shift; first: boolean; last: boolean };

export default function ShiftsScreen() {
  const { shifts, loading, error, offline, refresh, workerRole, isVerified } = useShifts();
  const { summary, isRestricted, refresh: refreshBilling } = useBillingRestriction(isVerified);

  const roleLabel =
    workerRole && workerRole in WORKER_ROLE_LABELS
      ? WORKER_ROLE_LABELS[workerRole as keyof typeof WORKER_ROLE_LABELS]
      : 'Worker';

  const rows = useMemo(() => {
    const byDate = new Map<string, Shift[]>();
    for (const shift of shifts) {
      const key = isoDateFromTimestamp(shift.starts_at);
      const list = byDate.get(key) ?? [];
      list.push(shift);
      byDate.set(key, list);
    }
    const out: Row[] = [];
    for (const [iso, list] of byDate) {
      out.push({ type: 'header', key: `h-${iso}`, title: formatDayLabel(iso) });
      list.forEach((shift, index) => {
        out.push({
          type: 'shift',
          key: shift.id,
          shift,
          first: index === 0,
          last: index === list.length - 1,
        });
      });
    }
    return out;
  }, [shifts]);

  const onRefresh = () => {
    void refresh();
    void refreshBilling();
  };

  return (
    <AppScreen scroll={false} edges={['top']}>
      <ScreenHeader
        eyebrow="Marketplace"
        title="Open shifts"
        subtitle="Find flexible shifts that match your role."
        right={
          isVerified ? (
            <IconButton
              icon="calendar-outline"
              accessibilityLabel="Open shift calendar"
              onPress={() => router.push('/shifts/calendar')}
              color={colors.tealStrong}
              backgroundColor={colors.tealSoft}
            />
          ) : undefined
        }
      />

      {offline ? (
        <Banner
          variant="warning"
          title="You appear to be offline"
          body="Pull to refresh when your connection returns."
          style={styles.banner}
        />
      ) : null}

      {isRestricted && summary ? (
        <View style={styles.banner}>
          <BillingRestrictionBanner summary={summary} />
        </View>
      ) : null}

      {loading && shifts.length === 0 ? (
        <View style={styles.loading}>
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : offline && shifts.length === 0 ? (
        <OfflineState onRetry={onRefresh} />
      ) : error && shifts.length === 0 ? (
        <ErrorState
          title="We couldn’t load shifts"
          description="This is a connection or server problem — not an empty marketplace."
          onRetry={onRefresh}
        />
      ) : !isVerified ? (
        <EmptyState
          title="Marketplace access pending"
          description="Complete verification, required credentials, and payout approval before open shifts appear."
          actionLabel="Continue setup"
          onAction={() => router.push('/auth/worker/pending')}
        />
      ) : isRestricted ? (
        <EmptyState
          title="New shift access paused"
          description="New shift access is paused because a commission invoice is overdue. You can still open already accepted assignments from Work."
          actionLabel="View invoices"
          onAction={() => router.push('/(tabs)/invoices')}
        />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <EmptyState
                title={`No open ${roleLabel} shifts are available right now.`}
                description="Published shifts disappear from this list when their acceptance window closes, they start, or they are filled."
                actionLabel="Refresh"
                onAction={onRefresh}
              />
            </View>
          }
          renderItem={({ item, index }) => {
            if (item.type === 'header') {
              return <Text style={[styles.groupTitle, index > 0 && styles.groupTitleSpaced]}>{item.title}</Text>;
            }
            const showTopRadius = item.first;
            const showBottomRadius = item.last;
            return (
              <View
                style={[
                  styles.groupItem,
                  showTopRadius && styles.groupTop,
                  showBottomRadius && styles.groupBottom,
                ]}
              >
                <ShiftCard
                  shift={item.shift}
                  onPress={() => router.push(`/shifts/${item.shift.id}`)}
                />
                {!item.last ? <ListGroupSeparator /> : null}
              </View>
            );
          }}
        />
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  banner: {
    marginBottom: spacing.md,
  },
  loading: {
    gap: spacing.md,
  },
  list: {
    paddingBottom: spacing.huge,
    flexGrow: 0,
  },
  emptyWrap: {
    paddingTop: spacing.sm,
  },
  groupTitle: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  groupTitleSpaced: {
    marginTop: spacing.lg,
  },
  groupItem: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  groupTop: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  groupBottom: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    marginBottom: spacing.sm,
  },
});
