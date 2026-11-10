import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, usePathname } from 'expo-router';
import React, { useEffect, useMemo } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { InvoiceCard } from '@/components/invoices/InvoiceCard';
import { useTabBarScrollInset } from '@/components/navigation/AnimatedTabBar';
import { AppReviewDemoBanner } from '@/components/review/AppReviewDemoBanner';
import { AppScreen } from '@/components/ui/AppScreen';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { MoneyAmount } from '@/components/ui/MoneyAmount';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { colors, radii, shadows, spacing, typography } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { type InvoiceFilter, useInvoices } from '@/hooks/useInvoices';
import { useTranslation } from '@/i18n/locale-provider';
import { useAuth } from '@/providers/AuthProvider';

export default function InvoicesScreen() {
  const { user, isAppReviewDemo } = useAuth();
  const { t } = useTranslation();
  const pathname = usePathname();
  const fromAccount = pathname.includes('/profile/');
  const invoiceBase = fromAccount ? '/profile/invoices' : '/invoices';
  const tabScrollInset = useTabBarScrollInset(spacing.xl);
  const reduced = useReducedMotion();
  const { invoices, allInvoices, loading, error, refresh, filter, setFilter } =
    useInvoices(user?.id);

  const totals = useMemo(() => {
    const open = allInvoices
      .filter((i) => i.status === 'open' || i.status === 'payment_processing')
      .reduce((sum, i) => sum + i.commission_amount_minor, 0);
    const pastDue = allInvoices
      .filter((i) => i.status === 'past_due')
      .reduce((sum, i) => sum + i.commission_amount_minor, 0);
    const paid = allInvoices
      .filter((i) => i.status === 'paid')
      .reduce((sum, i) => sum + i.commission_amount_minor, 0);
    return { open, pastDue, paid };
  }, [allInvoices]);

  const filterTabs = useMemo(
    () => [
      { key: 'all', label: t('invoices.filterAll') },
      {
        key: 'open',
        label: t('invoices.filterOpen'),
        accentGradient: [colors.navy, '#0C3E56', colors.tealStrong] as const,
      },
      {
        key: 'past_due',
        label: t('invoices.filterPastDue'),
        accentGradient: ['#8F1A12', colors.error] as const,
        accentColor: colors.error,
      },
      {
        key: 'paid',
        label: t('invoices.filterPaid'),
        accentGradient: ['#146C43', colors.success] as const,
        accentColor: colors.success,
      },
    ],
    [t],
  );

  return (
    <AppScreen scroll={false} edges={['top']}>
      <ScreenHeader
        eyebrow={fromAccount ? undefined : t('invoices.eyebrow')}
        title={t('invoices.title')}
        subtitle={t('invoices.subtitle')}
        showBack={fromAccount}
        titleSize={fromAccount ? 'detail' : 'page'}
      />
      {isAppReviewDemo ? <AppReviewDemoBanner /> : null}

      <FlatList
        data={loading && invoices.length === 0 ? [] : invoices}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: tabScrollInset }]}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            <CommissionExplainer
              title={t('invoices.separateTitle')}
              body={t('invoices.separateBody')}
              reduced={reduced}
            />
            <View style={styles.metrics}>
              <MetricTile
                label={t('invoices.open')}
                amountMinor={totals.open}
                icon="document-text"
                tone="open"
                delay={40}
                reduced={reduced}
                active={filter === 'open'}
                onPress={() => setFilter('open')}
              />
              <MetricTile
                label={t('invoices.pastDue')}
                amountMinor={totals.pastDue}
                icon="alert-circle"
                tone="danger"
                delay={90}
                reduced={reduced}
                active={filter === 'past_due'}
                onPress={() => setFilter('past_due')}
                emphasize={totals.pastDue > 0}
              />
              <MetricTile
                label={t('invoices.paid')}
                amountMinor={totals.paid}
                icon="checkmark-circle"
                tone="paid"
                delay={140}
                reduced={reduced}
                active={filter === 'paid'}
                onPress={() => setFilter('paid')}
              />
            </View>
            <SegmentedTabs
              tabs={filterTabs}
              activeKey={filter}
              onChange={(key) => setFilter(key as InvoiceFilter)}
            />
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.skeletons}>
              <SkeletonCard />
              <SkeletonCard />
            </View>
          ) : error ? (
            <ErrorState title={t('invoices.loadError')} onRetry={refresh} />
          ) : (
            <EmptyState
              title={t('invoices.empty')}
              description={t('invoices.emptyBody')}
              icon="receipt-outline"
            />
          )
        }
        renderItem={({ item, index }) => (
          <Animated.View
            entering={
              reduced
                ? undefined
                : FadeInDown.delay(Math.min(index, 6) * 45)
                    .duration(360)
                    .springify()
                    .damping(17)
            }
          >
            <InvoiceCard
              invoice={item}
              onPress={() => router.push(`${invoiceBase}/${item.id}`)}
            />
          </Animated.View>
        )}
      />
    </AppScreen>
  );
}

function CommissionExplainer({
  title,
  body,
  reduced,
}: {
  title: string;
  body: string;
  reduced: boolean;
}) {
  const enter = useSharedValue(reduced ? 1 : 0);

  useEffect(() => {
    if (reduced) {
      enter.value = 1;
      return;
    }
    enter.value = withTiming(1, { duration: 480, easing: Easing.out(Easing.cubic) });
  }, [enter, reduced]);

  const shellStyle = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [{ translateY: interpolate(enter.value, [0, 1], [8, 0]) }],
  }));

  return (
    <Animated.View style={[styles.explainer, shellStyle]} accessibilityRole="summary">
      <LinearGradient
        pointerEvents="none"
        colors={[
          'rgba(11, 42, 67, 0.06)',
          'rgba(20, 169, 181, 0.10)',
          'rgba(224, 170, 24, 0.06)',
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <LinearGradient
        colors={[colors.navy, '#0C3E56', colors.tealStrong]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.explainerIcon}
      >
        <Ionicons name="shield-checkmark" size={16} color={colors.white} />
      </LinearGradient>
      <View style={styles.explainerCopy}>
        <Text style={styles.explainerEyebrow}>{title}</Text>
        <View style={styles.explainerRule} />
        <Text style={styles.explainerBody}>{body}</Text>
      </View>
    </Animated.View>
  );
}

type MetricTone = 'open' | 'danger' | 'paid';

const METRIC_TONE: Record<
  MetricTone,
  { mark: [string, string]; soft: string; label: string }
> = {
  open: {
    mark: [colors.navy, colors.tealStrong],
    soft: colors.tealSoft,
    label: colors.tealStrong,
  },
  danger: {
    mark: ['#8F1A12', colors.error],
    soft: colors.errorLight,
    label: colors.error,
  },
  paid: {
    mark: ['#146C43', colors.success],
    soft: '#D5F0DF',
    label: colors.success,
  },
};

function MetricTile({
  label,
  amountMinor,
  icon,
  tone,
  delay,
  reduced,
  active,
  onPress,
  emphasize,
}: {
  label: string;
  amountMinor: number;
  icon: keyof typeof Ionicons.glyphMap;
  tone: MetricTone;
  delay: number;
  reduced: boolean;
  active: boolean;
  onPress: () => void;
  emphasize?: boolean;
}) {
  const enter = useSharedValue(reduced ? 1 : 0);
  const palette = METRIC_TONE[tone];

  useEffect(() => {
    if (reduced) {
      enter.value = 1;
      return;
    }
    enter.value = withDelay(
      delay,
      withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) }),
    );
  }, [delay, enter, reduced]);

  const shellStyle = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [{ translateY: interpolate(enter.value, [0, 1], [10, 0]) }],
  }));

  return (
    <Animated.View style={[styles.metricShell, shellStyle]}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        accessibilityLabel={`${label} ${amountMinor / 100}`}
        style={({ pressed }) => [
          styles.metric,
          emphasize && amountMinor > 0 ? styles.metricEmphasize : null,
          active ? styles.metricActive : null,
          pressed && styles.metricPressed,
        ]}
      >
        <LinearGradient
          pointerEvents="none"
          colors={[palette.soft, 'rgba(255,255,255,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.metricTop}>
          <LinearGradient
            colors={palette.mark}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.metricMark}
          >
            <Ionicons name={icon} size={12} color={colors.white} />
          </LinearGradient>
          <Text style={[styles.metricLabel, { color: palette.label }]} numberOfLines={1}>
            {label}
          </Text>
        </View>
        <MoneyAmount amountMinor={amountMinor} emphasize />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.md,
    paddingTop: spacing.xs,
  },
  headerBlock: {
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  skeletons: {
    gap: spacing.md,
  },
  explainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.xl,
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadows.sm,
  },
  explainerIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  explainerCopy: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  explainerEyebrow: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: typography.size.md,
    color: colors.navy,
  },
  explainerRule: {
    width: 28,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.tealStrong,
  },
  explainerBody: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.textSecondary,
  },
  metrics: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  metricShell: {
    flex: 1,
    minWidth: 0,
  },
  metric: {
    minHeight: 78,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    gap: 8,
    overflow: 'hidden',
    ...shadows.sm,
  },
  metricActive: {
    borderColor: colors.tealStrong,
    ...shadows.md,
  },
  metricEmphasize: {
    borderColor: colors.error,
  },
  metricPressed: {
    opacity: 0.92,
  },
  metricTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metricMark: {
    width: 22,
    height: 22,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricLabel: {
    flex: 1,
    fontFamily: typography.fonts.semibold,
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});
