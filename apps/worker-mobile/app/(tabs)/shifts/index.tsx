import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { WORKER_ROLE_LABELS, WORKER_ROLE_LABELS_EL } from '@bridge-hive/domain';

import { BillingRestrictionBanner } from '@/components/invoices/BillingRestrictionBanner';
import { AppReviewDemoBanner } from '@/components/review/AppReviewDemoBanner';
import { ShiftCard } from '@/components/shifts/ShiftCard';
import { ShiftDayHeader } from '@/components/shifts/ShiftDayHeader';
import { AppScreen } from '@/components/ui/AppScreen';
import { Banner } from '@/components/ui/Banner';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { OfflineState } from '@/components/ui/OfflineState';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { useTabBarScrollInset } from '@/components/navigation/AnimatedTabBar';
import { colors, radii, spacing } from '@/constants/theme';
import { useBillingRestriction } from '@/hooks/useBillingRestriction';
import { useShifts } from '@/hooks/useShifts';
import { useTranslation } from '@/i18n/locale-provider';
import type { MarketplaceShift } from '@/lib/queries';
import { isoDateFromTimestamp } from '@/utils/format';

type Row =
  | { type: 'header'; key: string; iso: string; count: number; group: number }
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
  const { t, language } = useTranslation();
  const { summary, isRestricted, refresh: refreshBilling } = useBillingRestriction(
    isVerified && !isAppReviewDemo,
  );
  const tabScrollInset = useTabBarScrollInset(spacing.xl);

  const roleLabels = language === 'el' ? WORKER_ROLE_LABELS_EL : WORKER_ROLE_LABELS;
  const roleLabel =
    workerRole && workerRole in roleLabels
      ? roleLabels[workerRole as keyof typeof roleLabels]
      : t('roles.worker');

  const rows = useMemo(() => {
    const byDate = new Map<string, MarketplaceShift[]>();
    for (const shift of shifts) {
      const key = isoDateFromTimestamp(shift.starts_at);
      const list = byDate.get(key) ?? [];
      list.push(shift);
      byDate.set(key, list);
    }
    const out: Row[] = [];
    const dates = [...byDate.keys()].sort();
    dates.forEach((iso, group) => {
      const list = byDate.get(iso) ?? [];
      out.push({ type: 'header', key: `h-${iso}`, iso, count: list.length, group });
      list.forEach((shift, index) => {
        out.push({
          type: 'shift',
          key: shift.id,
          shift,
          first: index === 0,
          last: index === list.length - 1,
        });
      });
    });
    return out;
  }, [shifts]);

  const onRefresh = () => {
    void refresh();
    void refreshBilling();
  };

  const showFeed =
    !(loading && shifts.length === 0) &&
    !(offline && shifts.length === 0) &&
    !(error && shifts.length === 0) &&
    (isVerified || isAppReviewDemo) &&
    !isRestricted;

  const pageChrome = useMemo(
    () => (
      <View>
        <ScreenHeader
          motion={false}
          eyebrow={t('shifts.eyebrow')}
          title={t('shifts.openTitle')}
          subtitle={t('shifts.subtitle')}
          right={
            isVerified && !isAppReviewDemo ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('shifts.openCalendar')}
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
            title={t('shifts.offlineTitle')}
            body={t('shifts.offlineBody')}
            style={styles.banner}
          />
        ) : null}
        {isRestricted && summary ? (
          <View style={styles.banner}>
            <BillingRestrictionBanner summary={summary} />
          </View>
        ) : null}
      </View>
    ),
    [isAppReviewDemo, isRestricted, isVerified, offline, summary, t],
  );

  return (
    <AppScreen scroll={false} edges={['top']}>
      {showFeed ? null : pageChrome}

      {loading && shifts.length === 0 ? (
        <View style={styles.loading}>
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : offline && shifts.length === 0 ? (
        <OfflineState onRetry={onRefresh} />
      ) : error && shifts.length === 0 ? (
        <ErrorState
          title={t('shifts.loadError')}
          description={t('shifts.loadErrorBody')}
          onRetry={onRefresh}
        />
      ) : !isVerified && !isAppReviewDemo ? (
        <EmptyState
          title={t('shifts.pendingTitle')}
          description={t('shifts.pendingBody')}
          actionLabel={t('shifts.continueSetup')}
          onAction={() => router.push('/auth/worker/pending')}
        />
      ) : isRestricted ? (
        <EmptyState
          title={t('shifts.pausedTitle')}
          description={t('shifts.pausedBody')}
          actionLabel={t('shifts.viewInvoices')}
          onAction={() => router.push('/(tabs)/invoices')}
        />
      ) : (
        <FlatList
          style={styles.listFlex}
          data={rows}
          keyExtractor={(item) => item.key}
          ListHeaderComponent={pageChrome}
          contentContainerStyle={[styles.list, { paddingBottom: tabScrollInset }]}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
          initialNumToRender={8}
          windowSize={7}
          removeClippedSubviews={false}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <EmptyState
                title={t('shifts.emptyRole', { role: roleLabel })}
                description={t('shifts.emptyBody')}
                icon="calendar-outline"
                actionLabel={t('shifts.refresh')}
                actionIcon="refresh"
                actionLoading={loading}
                onAction={onRefresh}
              />
            </View>
          }
          renderItem={({ item, index }) => {
            if (item.type === 'header') {
              return (
                <View style={[styles.groupHeader, index > 0 && styles.groupHeaderSpaced]}>
                  <ShiftDayHeader iso={item.iso} count={item.count} index={item.group} />
                </View>
              );
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
  listFlex: {
    flex: 1,
  },
  list: {
    flexGrow: 1,
  },
  emptyWrap: {
    paddingTop: spacing.sm,
  },
  groupHeader: {
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  groupHeaderSpaced: {
    marginTop: spacing.lg,
  },
  groupItem: {
    marginBottom: spacing.sm,
  },
  groupItemLast: {
    marginBottom: spacing.md,
  },
});
