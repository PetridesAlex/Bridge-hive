import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { WORKER_ROLE_LABELS } from '@bridge-hive/domain';

import { BillingRestrictionBanner } from '@/components/invoices/BillingRestrictionBanner';
import { AppReviewDemoBanner } from '@/components/review/AppReviewDemoBanner';
import { ShiftCard } from '@/components/shifts/ShiftCard';
import { AppScreen } from '@/components/ui/AppScreen';
import { Banner } from '@/components/ui/Banner';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { OfflineState } from '@/components/ui/OfflineState';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { useTabBarScrollInset } from '@/components/navigation/AnimatedTabBar';
import { colors, radii, spacing, typography } from '@/constants/theme';
import { useBillingRestriction } from '@/hooks/useBillingRestriction';
import { useShifts } from '@/hooks/useShifts';
import type { MarketplaceShift } from '@/lib/queries';
import { formatDayLabel, isoDateFromTimestamp } from '@/utils/format';

type Row =
  | { type: 'header'; key: string; title: string }
  | { type: 'shift'; key: string; shift: MarketplaceShift; first: boolean; last: boolean };

export default function ShiftsScreen() {
  const {
    shifts,
    loading,
    error,
    offline,
    refresh,
    workerRole,
    isVerified,
    isAppReviewDemo,
  } = useShifts();
  const { summary, isRestricted, refresh: refreshBilling } = useBillingRestriction(
    isVerified && !isAppReviewDemo,
  );
  const tabScrollInset = useTabBarScrollInset(spacing.xl);

  const roleLabel =
    workerRole && workerRole in WORKER_ROLE_LABELS
      ? WORKER_ROLE_LABELS[workerRole as keyof typeof WORKER_ROLE_LABELS]
      : 'Worker';

  const rows = useMemo(() => {
    const byDate = new Map<string, MarketplaceShift[]>();
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
          isVerified && !isAppReviewDemo ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open shift calendar"
              onPress={() => router.push('/shifts/calendar')}
              style={({ pressed }) => [styles.calCta, pressed && styles.calCtaPressed]}
            >
              <LinearGradient
                pointerEvents="none"
                colors={[colors.navy, '#0C3E56', colors.tealStrong]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[StyleSheet.absoluteFill, styles.calCtaFill]}
              />
              <Ionicons name="calendar" size={22} color={colors.white} />
              <View pointerEvents="none" style={styles.calCtaDot} />
            </Pressable>
          ) : undefined
        }
      />

      {isAppReviewDemo ? (
        <View style={styles.banner}>
          <AppReviewDemoBanner />
        </View>
      ) : null}

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
      ) : !isVerified && !isAppReviewDemo ? (
        <EmptyState
          title="Marketplace access pending"
          description="Complete verification, required credentials, and payout approval before open shifts appear."
          actionLabel="Continue setup"
          onAction={() => router.push('/auth/worker/pending')}
        />
      ) : isRestricted ? (
        <EmptyState
          title="New shift access paused"
          description="New shift access is paused because a commission invoice is overdue. You can still open already accepted assignments from My shifts."
          actionLabel="View invoices"
          onAction={() => router.push('/(tabs)/invoices')}
        />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => item.key}
          contentContainerStyle={[styles.list, { paddingBottom: tabScrollInset }]}
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
            return (
              <View style={[styles.groupItem, item.last && styles.groupItemLast]}>
                <ShiftCard
                  shift={item.shift}
                  organizationName={item.shift.organization_name ?? undefined}
                  locationName={
                    [item.shift.location_name, item.shift.ward_name]
                      .filter(Boolean)
                      .join(' · ') || undefined
                  }
                  onPress={() => router.push(`/shifts/${item.shift.id}`)}
                />
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
  calCta: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.full,
    shadowColor: colors.navy,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
  },
  calCtaPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  calCtaFill: {
    borderRadius: 24,
  },
  calCtaDot: {
    position: 'absolute',
    top: 11,
    right: 11,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.yellow,
  },
  loading: {
    gap: spacing.md,
  },
  list: {
    flexGrow: 0,
  },
  emptyWrap: {
    paddingTop: spacing.sm,
  },
  groupTitle: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: typography.size.md,
    color: colors.navy,
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
    letterSpacing: -0.2,
  },
  groupTitleSpaced: {
    marginTop: spacing.xl,
  },
  groupItem: {
    marginBottom: spacing.md,
  },
  groupItemLast: {
    marginBottom: spacing.lg,
  },
});
