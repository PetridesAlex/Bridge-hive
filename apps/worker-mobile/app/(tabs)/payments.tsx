import { payoutSummaryLabel } from '@bridge-hive/domain';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, usePathname } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
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
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { InvoiceCard } from '@/components/invoices/InvoiceCard';
import { MoneySummaryTile } from '@/components/payments/MoneySummaryTile';
import { PayoutCard } from '@/components/payments/PayoutCard';
import { AppReviewDemoBanner } from '@/components/review/AppReviewDemoBanner';
import { AppScreen } from '@/components/ui/AppScreen';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { StatusBadge, type StatusTone } from '@/components/ui/StatusBadge';
import { useTabBarScrollInset } from '@/components/navigation/AnimatedTabBar';
import { colors, motion, radii, spacing, typography } from '@/constants/theme';
import { useInvoices } from '@/hooks/useInvoices';
import { usePayouts } from '@/hooks/usePayouts';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useTranslation } from '@/i18n/locale-provider';
import { useAuth } from '@/providers/AuthProvider';

type MoneySegment = 'earnings' | 'invoices';

function payoutAccountTone(status: string | null | undefined): StatusTone {
  if (status === 'verified') return 'success';
  if (status === 'pending') return 'info';
  if (status === 'rejected' || status === 'failed' || status === 'suspended') return 'danger';
  return 'neutral';
}

function payoutAccountIcon(
  status: string | null | undefined,
): keyof typeof Ionicons.glyphMap {
  if (status === 'verified') return 'checkmark-circle';
  if (status === 'pending') return 'time';
  if (status === 'rejected' || status === 'failed' || status === 'suspended') {
    return 'alert-circle';
  }
  return 'card-outline';
}

function FinancesIntro({
  eyebrow,
  title,
  body,
  earningsLabel,
  invoicesLabel,
}: {
  eyebrow: string;
  title: string;
  body: string;
  earningsLabel: string;
  invoicesLabel: string;
}) {
  const reduced = useReducedMotion();
  const enter = useSharedValue(reduced ? 1 : 0);
  const wash = useSharedValue(0);
  const orb = useSharedValue(0);
  const rule = useSharedValue(reduced ? 1 : 0);

  useEffect(() => {
    if (reduced) {
      enter.value = 1;
      wash.value = 0.35;
      orb.value = 0.5;
      rule.value = 1;
      return;
    }
    enter.value = withTiming(1, {
      duration: motion.duration.slow,
      easing: Easing.out(Easing.cubic),
    });
    rule.value = withTiming(1, {
      duration: motion.duration.normal,
      easing: Easing.out(Easing.cubic),
    });
    wash.value = withRepeat(
      withTiming(1, { duration: 5200, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
    orb.value = withRepeat(
      withTiming(1, { duration: 6800, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [enter, orb, reduced, rule, wash]);

  const shellStyle = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [{ translateY: interpolate(enter.value, [0, 1], [10, 0]) }],
  }));
  const washStyle = useAnimatedStyle(() => ({
    opacity: interpolate(wash.value, [0, 1], [0.16, 0.4]),
    transform: [{ translateX: interpolate(wash.value, [0, 1], [-40, 70]) }],
  }));
  const orbStyle = useAnimatedStyle(() => ({
    opacity: interpolate(orb.value, [0, 1], [0.2, 0.45]),
    transform: [
      { translateX: interpolate(orb.value, [0, 1], [0, 14]) },
      { translateY: interpolate(orb.value, [0, 1], [0, -12]) },
      { scale: interpolate(orb.value, [0, 1], [0.94, 1.08]) },
    ],
  }));
  const ruleStyle = useAnimatedStyle(() => ({
    opacity: rule.value,
    transform: [{ scaleX: interpolate(rule.value, [0, 1], [0.2, 1]) }],
  }));

  return (
    <Animated.View style={[styles.intro, shellStyle]}>
      <LinearGradient
        pointerEvents="none"
        colors={['#071E33', '#0B2A43', '#0E4A5C', '#0F6B6B']}
        locations={[0, 0.34, 0.7, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View pointerEvents="none" style={[styles.introWash, washStyle]}>
        <LinearGradient
          colors={['transparent', 'rgba(255,255,255,0.16)', 'transparent']}
          start={{ x: 0, y: 0.2 }}
          end={{ x: 1, y: 0.8 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      <Animated.View pointerEvents="none" style={[styles.introOrb, orbStyle]} />
      <View pointerEvents="none" style={styles.introGlow} />

      <View style={styles.introHeader}>
        <LinearGradient
          colors={['#FFD25A', '#F08C00']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.introIcon}
        >
          <Ionicons name="swap-horizontal" size={16} color={colors.navy} />
        </LinearGradient>
        <View style={styles.introHeaderCopy}>
          <Text style={styles.introEyebrow}>{eyebrow}</Text>
          <Text style={styles.introTitle}>{title}</Text>
        </View>
      </View>
      <Animated.View style={[styles.introRule, ruleStyle]} />
      <Text style={styles.introBody}>{body}</Text>
      <View style={styles.introRails}>
        <View style={styles.introRail}>
          <View style={[styles.introRailDot, styles.introRailDotEarnings]} />
          <Text style={styles.introRailLabel}>{earningsLabel}</Text>
        </View>
        <View style={styles.introRail}>
          <View style={[styles.introRailDot, styles.introRailDotInvoices]} />
          <Text style={styles.introRailLabel}>{invoicesLabel}</Text>
        </View>
      </View>
    </Animated.View>
  );
}

function PayoutAccountCard({
  account,
  title,
  manageLabel,
  setupLabel,
  addIbanLabel,
}: {
  account: ReturnType<typeof usePayouts>['account'];
  title: string;
  manageLabel: string;
  setupLabel: string;
  addIbanLabel: string;
}) {
  const reduced = useReducedMotion();
  const enter = useSharedValue(reduced ? 1 : 0);
  const press = useSharedValue(1);
  const wash = useSharedValue(0);
  const nudge = useSharedValue(0);

  useEffect(() => {
    if (reduced) {
      enter.value = 1;
      wash.value = 0.35;
      return;
    }
    enter.value = withTiming(1, {
      duration: motion.duration.normal,
      easing: Easing.out(Easing.cubic),
    });
    wash.value = withRepeat(
      withTiming(1, { duration: 5600, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
    nudge.value = withRepeat(
      withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [enter, nudge, reduced, wash]);

  const shellStyle = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [
      { translateY: interpolate(enter.value, [0, 1], [10, 0]) },
      { scale: press.value },
    ],
  }));
  const washStyle = useAnimatedStyle(() => ({
    opacity: interpolate(wash.value, [0, 1], [0.14, 0.36]),
    transform: [{ translateX: interpolate(wash.value, [0, 1], [-36, 60]) }],
  }));
  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(nudge.value, [0, 1], [0, 3]) }],
  }));

  return (
    <Animated.View style={shellStyle}>
      <Pressable
        style={styles.accountCard}
        onPress={() => router.push('/profile/payout-setup')}
        onPressIn={() => {
          if (!reduced) press.value = withSpring(0.985, { damping: 18, stiffness: 380 });
        }}
        onPressOut={() => {
          if (!reduced) press.value = withSpring(1, { damping: 14, stiffness: 260 });
        }}
        accessibilityRole="button"
        accessibilityLabel={account ? manageLabel : setupLabel}
      >
        <LinearGradient
          pointerEvents="none"
          colors={['#071E33', '#0B2A43', '#0E4A5C', '#0F6B6B']}
          locations={[0, 0.34, 0.7, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Animated.View pointerEvents="none" style={[styles.accountWash, washStyle]}>
          <LinearGradient
            colors={['transparent', 'rgba(255,255,255,0.14)', 'transparent']}
            start={{ x: 0, y: 0.2 }}
            end={{ x: 1, y: 0.8 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
        <View pointerEvents="none" style={styles.accountGlow} />

        <LinearGradient
          colors={['#FFD25A', '#F08C00']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.accountIcon}
        >
          <Ionicons name="card-outline" size={18} color={colors.navy} />
        </LinearGradient>
        <View style={styles.accountCopy}>
          <Text style={styles.accountTitle}>{title}</Text>
          {account ? (
            <>
              <Text style={styles.accountIban} numberOfLines={1}>
                {account.masked_iban}
              </Text>
              <StatusBadge
                label={payoutSummaryLabel(account.status)}
                tone={payoutAccountTone(account.status)}
                icon={payoutAccountIcon(account.status)}
                style={styles.accountBadge}
              />
            </>
          ) : (
            <Text style={styles.accountValue}>{addIbanLabel}</Text>
          )}
        </View>
        <Animated.View style={[styles.accountChevron, chevronStyle]}>
          <Ionicons name="chevron-forward" size={16} color={colors.white} />
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

export default function MoneyScreen() {
  const { user, isAppReviewDemo } = useAuth();
  const { t } = useTranslation();
  const pathname = usePathname();
  const fromAccount = pathname.includes('/profile/');
  const invoiceBase = fromAccount ? '/profile/invoices' : '/invoices';
  const tabScrollInset = useTabBarScrollInset(spacing.xl);
  const { payouts, account, loading: payoutLoading, error: payoutError, refresh: refreshPayouts } =
    usePayouts(user?.id);
  const {
    invoices,
    allInvoices,
    loading: invoiceLoading,
    error: invoiceError,
    refresh: refreshInvoices,
  } = useInvoices(user?.id);
  const [segment, setSegment] = useState<MoneySegment>('earnings');

  const invoiceTotals = useMemo(() => {
    const open = allInvoices
      .filter((i) => i.status === 'open' || i.status === 'payment_processing')
      .reduce((sum, i) => sum + i.commission_amount_minor, 0);
    const pastDue = allInvoices
      .filter((i) => i.status === 'past_due')
      .reduce((sum, i) => sum + i.commission_amount_minor, 0);
    return { open, pastDue };
  }, [allInvoices]);

  const earningsTotal = useMemo(
    () => payouts.reduce((sum, p) => sum + (p.gross_amount_minor ?? 0), 0),
    [payouts],
  );

  const invoiceDue = invoiceTotals.open + invoiceTotals.pastDue;
  const invoiceHint =
    invoiceTotals.pastDue > 0
      ? t('payments.pastDuePayNow')
      : invoiceDue > 0
        ? t('payments.openCommissionDue')
        : t('payments.platformCommission');

  const onRefresh = () => {
    void refreshPayouts();
    void refreshInvoices();
  };

  const loading = payoutLoading || invoiceLoading;

  return (
    <AppScreen scroll={false} edges={['top']}>
      <ScreenHeader
        eyebrow={fromAccount ? undefined : t('payments.eyebrow')}
        title={t('payments.moneyTitle')}
        subtitle={t('payments.subtitle')}
        showBack={fromAccount}
        titleSize={fromAccount ? 'detail' : 'page'}
      />
      {isAppReviewDemo ? (
        <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }}>
          <AppReviewDemoBanner />
        </View>
      ) : null}

      <FinancesIntro
        eyebrow={t('payments.eyebrow')}
        title={t('payments.howPayWorks')}
        body={t('payments.howPayWorksBody')}
        earningsLabel={t('payments.title')}
        invoicesLabel={t('invoices.title')}
      />

      <View style={styles.summaries}>
        <MoneySummaryTile
          label={t('payments.title')}
          amountMinor={earningsTotal}
          hint={t('payments.paidByOrgs')}
          icon="wallet-outline"
          selected={segment === 'earnings'}
          delayMs={40}
          onPress={() => setSegment('earnings')}
          accessibilityLabel={`${t('payments.title')}. ${t('payments.paidByOrgs')}`}
        />
        <MoneySummaryTile
          label={t('invoices.title')}
          amountMinor={invoiceDue}
          hint={invoiceHint}
          icon={invoiceTotals.pastDue > 0 ? 'alert-circle-outline' : 'receipt-outline'}
          selected={segment === 'invoices'}
          emphasis={invoiceTotals.pastDue > 0 ? 'alert' : 'default'}
          delayMs={90}
          onPress={() => setSegment('invoices')}
          accessibilityLabel={`${t('invoices.title')}. ${invoiceHint}`}
        />
      </View>

      {segment === 'earnings' ? (
        <>
          <PayoutAccountCard
            account={account}
            title={t('payments.payoutAccount')}
            manageLabel={t('payments.managePayout')}
            setupLabel={t('payments.setupPayout')}
            addIbanLabel={t('payments.addIban')}
          />

          {payoutLoading && payouts.length === 0 ? (
            <SkeletonCard />
          ) : payoutError && payouts.length === 0 ? (
            <ErrorState title={t('payments.loadEarningsError')} onRetry={refreshPayouts} />
          ) : (
            <FlatList
              data={payouts}
              keyExtractor={(item) => item.id}
              contentContainerStyle={[styles.list, { paddingBottom: tabScrollInset }]}
              refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} />}
              ListEmptyComponent={
                <EmptyState
                  title={t('payments.emptyEarnings')}
                  description={t('payments.emptyEarningsBody')}
                />
              }
              renderItem={({ item }) => <PayoutCard payout={item} />}
            />
          )}
        </>
      ) : invoiceLoading && invoices.length === 0 ? (
        <SkeletonCard />
      ) : invoiceError && invoices.length === 0 ? (
        <ErrorState title={t('payments.loadInvoicesError')} onRetry={refreshInvoices} />
      ) : (
        <FlatList
          data={invoices}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.list, { paddingBottom: tabScrollInset }]}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <InvoiceEmptyPanel
              title={t('invoices.empty')}
              description={t('payments.emptyInvoicesBody')}
              actionLabel={t('payments.openFullList')}
              onAction={() => router.push('/(tabs)/invoices')}
            />
          }
          ListHeaderComponent={
            invoices.length > 0 ? (
              <InvoiceLedgerLink
                label={t('payments.openFullList')}
                onPress={() => router.push('/(tabs)/invoices')}
              />
            ) : null
          }
          renderItem={({ item }) => (
            <InvoiceCard
              invoice={item}
              onPress={() => router.push(`${invoiceBase}/${item.id}`)}
            />
          )}
        />
      )}
    </AppScreen>
  );
}

function InvoiceLedgerLink({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  const reduced = useReducedMotion();
  const press = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: press.value }],
  }));

  return (
    <Animated.View style={[styles.ledgerWrap, pressStyle]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
        onPressIn={() => {
          if (reduced) return;
          press.value = withSpring(0.98, { damping: 18, stiffness: 420 });
        }}
        onPressOut={() => {
          press.value = withSpring(1, { damping: 14, stiffness: 260 });
        }}
        style={styles.ledgerCard}
      >
        <LinearGradient
          pointerEvents="none"
          colors={['#0B2A43', '#0C3E56', '#0E5A66']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.ledgerIcon}>
          <Ionicons name="receipt-outline" size={16} color={colors.navy} />
        </View>
        <View style={styles.ledgerCopy}>
          <Text style={styles.ledgerEyebrow}>Invoice ledger</Text>
          <Text style={styles.ledgerLabel}>{label}</Text>
        </View>
        <View style={styles.ledgerChevron}>
          <Ionicons name="arrow-forward" size={14} color={colors.navy} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

function InvoiceEmptyPanel({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}) {
  const reduced = useReducedMotion();
  const breath = useSharedValue(reduced ? 0.5 : 0);
  const press = useSharedValue(1);

  useEffect(() => {
    if (reduced) {
      breath.value = 0.5;
      return;
    }
    breath.value = withRepeat(
      withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [breath, reduced]);

  const iconMotion = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(breath.value, [0, 1], [1, 1.05]) }],
    opacity: interpolate(breath.value, [0, 1], [0.9, 1]),
  }));

  const haloMotion = useAnimatedStyle(() => ({
    opacity: interpolate(breath.value, [0, 1], [0.16, 0.38]),
    transform: [{ scale: interpolate(breath.value, [0, 1], [0.92, 1.08]) }],
  }));

  const ctaMotion = useAnimatedStyle(() => ({
    transform: [{ scale: press.value }],
  }));

  return (
    <View style={styles.emptyCard} accessibilityRole="summary">
      <LinearGradient
        colors={['rgba(228,247,249,0.95)', colors.card, 'rgba(255,245,214,0.45)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.emptyRail} />

      <View style={styles.emptyIconStage}>
        <Animated.View
          pointerEvents="none"
          style={[styles.emptyHalo, haloMotion]}
        />
        <Animated.View style={[styles.emptyIconWrap, iconMotion]}>
          <LinearGradient
            colors={['#0B2A43', '#0C3E56', colors.tealStrong]}
            start={{ x: 0.15, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Ionicons name="receipt-outline" size={22} color={colors.white} />
        </Animated.View>
      </View>

      <Text style={styles.emptyEyebrow}>Commission invoices</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{description}</Text>

      <Animated.View style={[styles.emptyCtaWrap, ctaMotion]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          onPress={onAction}
          onPressIn={() => {
            if (reduced) return;
            press.value = withSpring(0.97, { damping: 18, stiffness: 420 });
          }}
          onPressOut={() => {
            press.value = withSpring(1, { damping: 14, stiffness: 260 });
          }}
          style={styles.emptyCta}
        >
          <LinearGradient
            pointerEvents="none"
            colors={['#0B2A43', '#0C3E56', colors.tealStrong]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Text style={styles.emptyCtaLabel}>{actionLabel}</Text>
          <View style={styles.emptyCtaIcon}>
            <Ionicons name="arrow-forward" size={14} color={colors.navy} />
          </View>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  intro: {
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: '#0B2A43',
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
    gap: spacing.sm,
  },
  introWash: {
    position: 'absolute',
    top: -20,
    bottom: -20,
    width: 130,
  },
  introOrb: {
    position: 'absolute',
    right: -40,
    top: -48,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(22, 166, 182, 0.28)',
  },
  introGlow: {
    position: 'absolute',
    left: -30,
    bottom: -50,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 210, 90, 0.10)',
  },
  introHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
  },
  introIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  introHeaderCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  introEyebrow: {
    fontFamily: typography.fonts.semibold,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.yellow,
  },
  introTitle: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.2,
    color: colors.white,
  },
  introRule: {
    width: 28,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.yellow,
    alignSelf: 'flex-start',
  },
  introBody: {
    fontFamily: typography.fonts.regular,
    fontSize: 14,
    lineHeight: 21,
    color: 'rgba(255,255,255,0.72)',
  },
  introRails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: 2,
  },
  introRail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: radii.full,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  introRailDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  introRailDotEarnings: {
    backgroundColor: colors.yellow,
  },
  introRailDotInvoices: {
    backgroundColor: colors.tealStrong,
  },
  introRailLabel: {
    fontFamily: typography.fonts.medium,
    fontSize: 12,
    color: 'rgba(255,255,255,0.88)',
  },
  summaries: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: '#0B2A43',
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.14)',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    overflow: 'hidden',
    minHeight: 94,
  },
  accountWash: {
    position: 'absolute',
    top: -16,
    bottom: -16,
    width: 120,
  },
  accountGlow: {
    position: 'absolute',
    right: -24,
    top: -36,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(22, 166, 182, 0.22)',
  },
  accountIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  accountCopy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  accountTitle: {
    fontFamily: typography.fonts.semibold,
    fontSize: 15,
    lineHeight: 20,
    color: colors.white,
  },
  accountIban: {
    fontFamily: typography.fonts.medium,
    fontSize: 13,
    letterSpacing: 0.4,
    color: 'rgba(255,255,255,0.72)',
  },
  accountBadge: {
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  accountValue: {
    fontFamily: typography.fonts.medium,
    fontSize: typography.size.sm,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.68)',
  },
  accountChevron: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  list: {
    paddingBottom: 0,
    gap: spacing.sm,
  },
  ledgerWrap: {
    marginBottom: spacing.sm,
  },
  ledgerCard: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radii.lg,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  ledgerIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.yellow,
  },
  ledgerCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  ledgerEyebrow: {
    fontFamily: typography.fonts.semibold,
    fontSize: 10,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    color: colors.yellow,
  },
  ledgerLabel: {
    fontFamily: typography.fonts.semibold,
    fontSize: 14,
    letterSpacing: -0.1,
    color: colors.white,
  },
  ledgerChevron: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.yellow,
  },
  emptyCard: {
    overflow: 'hidden',
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(11, 42, 67, 0.10)',
    minHeight: 210,
    paddingVertical: spacing.lg + 4,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    gap: 6,
    shadowColor: '#0B2A43',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 2,
  },
  emptyRail: {
    position: 'absolute',
    left: 0,
    top: 16,
    bottom: 16,
    width: 4,
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3,
    backgroundColor: colors.tealStrong,
  },
  emptyIconStage: {
    width: 68,
    height: 68,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  emptyHalo: {
    position: 'absolute',
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.teal,
  },
  emptyIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#0B2A43',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 3,
  },
  emptyEyebrow: {
    fontFamily: typography.fonts.semibold,
    fontSize: 11,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    color: colors.textSecondary,
  },
  emptyTitle: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.3,
    color: colors.navy,
    textAlign: 'center',
  },
  emptyBody: {
    fontFamily: typography.fonts.regular,
    fontSize: 14,
    lineHeight: 21,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 320,
    marginBottom: spacing.xs,
  },
  emptyCtaWrap: {
    marginTop: spacing.sm,
    alignSelf: 'stretch',
    maxWidth: 340,
  },
  emptyCta: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingLeft: 18,
    paddingRight: 12,
    borderRadius: radii.full,
    overflow: 'hidden',
  },
  emptyCtaLabel: {
    fontFamily: typography.fonts.semibold,
    fontSize: 15,
    letterSpacing: -0.1,
    color: colors.white,
  },
  emptyCtaIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.yellow,
  },
});
