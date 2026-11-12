import {
  daysUntilDue,
  isWorkerInvoicePayable,
  normalizeRouteParam,
  PAYMENT_CONFIRMATION_PENDING,
  PAYMENT_CONFIRMATION_SLOW,
  PENDING_CONFIRMATION_MAX_MS,
  PENDING_CONFIRMATION_POLL_MS,
  resolveInvoiceDetailUiState,
  WORKER_COMMISSION_EXPLAINER,
  workerInvoiceStatusLabel,
  type WorkerInvoiceStatus,
} from '@bridge-hive/domain';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  type AppStateStatus,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTabBarScrollInset } from '@/components/navigation/AnimatedTabBar';
import { AppReviewDemoBanner } from '@/components/review/AppReviewDemoBanner';
import { AppScreen } from '@/components/ui/AppScreen';
import { Banner } from '@/components/ui/Banner';
import { EmptyState } from '@/components/ui/EmptyState';
import { KeyValueRow } from '@/components/ui/KeyValueRow';
import { MoneyAmount } from '@/components/ui/MoneyAmount';
import { PremiumActionButton } from '@/components/ui/PremiumActionButton';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { StatusBadge, type StatusTone } from '@/components/ui/StatusBadge';
import { APP_CONFIG } from '@/constants/config';
import {
  getPaymentSheetReturnUrl,
  isSandboxPaymentsBuild,
  isStripePaymentsConfigured,
  isStripeTestPublishableKey,
  STRIPE_MERCHANT_COUNTRY_CODE,
} from '@/constants/stripe';
import { colors, shadows, spacing, typography } from '@/constants/theme';
import { useInvoice } from '@/hooks/useInvoice';
import { isAppReviewDemoInvoiceId } from '@/lib/app-review-demo';
import {
  startWorkerInvoiceCheckout,
  startWorkerInvoicePaymentSheet,
} from '@/lib/invoices';
import { useStripe } from '@/lib/stripe-native';
import { useAuth } from '@/providers/AuthProvider';
import { formatDate, formatMoney, formatShortDate } from '@/utils/format';

function hoursFromMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function toneForStatus(status: WorkerInvoiceStatus): StatusTone {
  if (status === 'past_due') return 'danger';
  if (status === 'paid') return 'success';
  if (status === 'payment_processing') return 'warning';
  if (status === 'void' || status === 'uncollectible') return 'neutral';
  return 'info';
}

function iconForStatus(status: WorkerInvoiceStatus) {
  if (status === 'past_due') return 'alert-circle' as const;
  if (status === 'paid') return 'checkmark-circle' as const;
  if (status === 'payment_processing') return 'time' as const;
  return 'document-text' as const;
}

function dueChipCopy(
  status: WorkerInvoiceStatus,
  dueAt: string,
  paidAt: string | null | undefined,
): string {
  if (status === 'paid' && paidAt) {
    return `Paid ${formatShortDate(paidAt)}`;
  }
  const days = daysUntilDue(dueAt);
  if (days > 1) return `Due ${formatShortDate(dueAt)} · ${days} days left`;
  if (days === 1) return `Due ${formatShortDate(dueAt)} · 1 day left`;
  if (days === 0) return 'Due today';
  if (days === -1) return '1 day overdue';
  return `${Math.abs(days)} days overdue`;
}

function FactRow({
  icon,
  label,
  value,
  last = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.factRow, !last && styles.factRowBorder]}>
      <View style={styles.factIcon}>
        <Ionicons name={icon} size={15} color={colors.tealStrong} />
      </View>
      <View style={styles.factCopy}>
        <Text style={styles.factLabel}>{label}</Text>
        <Text style={styles.factValue} numberOfLines={2}>
          {value}
        </Text>
      </View>
    </View>
  );
}

export default function InvoiceDetailScreen() {
  const tabScrollInset = useTabBarScrollInset(spacing.xl);
  const params = useLocalSearchParams<{
    id: string | string[];
    payment_status?: string | string[];
  }>();
  const id = normalizeRouteParam(params.id);
  const paymentStatus = normalizeRouteParam(params.payment_status);
  const {
    user,
    loading: authLoading,
    isAppReviewDemo,
    isPaymentSandboxTester,
    canPerformLiveMarketplaceActions,
  } = useAuth();
  const { invoice, loading, error, refresh } = useInvoice(id, user?.id, {
    authLoading,
  });
  const demoInvoice = isAppReviewDemo || isAppReviewDemoInvoiceId(id);
  const sandboxBuild = isSandboxPaymentsBuild();
  const stripeConfigured = isStripePaymentsConfigured();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string>();
  const [pendingHint, setPendingHint] = useState(paymentStatus === 'pending');
  const [pollTimedOut, setPollTimedOut] = useState(false);
  const pollStartedAt = useRef<number | null>(null);

  useEffect(() => {
    if (paymentStatus === 'pending') {
      setPendingHint(true);
      setPollTimedOut(false);
      pollStartedAt.current = Date.now();
    }
  }, [paymentStatus]);

  useEffect(() => {
    if (invoice?.status === 'paid') {
      setPendingHint(false);
      setPollTimedOut(false);
    }
  }, [invoice?.status]);

  useEffect(() => {
    if (!pendingHint || !user?.id) return;
    if (!invoice?.id) return;
    if (invoice.status === 'paid' || invoice.status === 'void') return;
    if (pollTimedOut) return;

    if (pollStartedAt.current == null) {
      pollStartedAt.current = Date.now();
    }

    const interval = setInterval(() => {
      const elapsed = Date.now() - (pollStartedAt.current ?? Date.now());
      if (elapsed >= PENDING_CONFIRMATION_MAX_MS) {
        setPollTimedOut(true);
        clearInterval(interval);
        return;
      }
      void refresh();
    }, PENDING_CONFIRMATION_POLL_MS);

    return () => clearInterval(interval);
  }, [
    pendingHint,
    user?.id,
    invoice?.id,
    invoice?.status,
    pollTimedOut,
    refresh,
  ]);

  useFocusEffect(
    useCallback(() => {
      if (user?.id && id) {
        void refresh();
      }
    }, [user?.id, id, refresh]),
  );

  useEffect(() => {
    const onChange = (state: AppStateStatus) => {
      if (state === 'active' && user?.id && id) {
        void refresh();
      }
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, [user?.id, id, refresh]);

  const uiState = useMemo(
    () =>
      resolveInvoiceDetailUiState({
        authLoading,
        hasSession: Boolean(user?.id),
        invoiceId: id,
        invoiceLoading: loading,
        hasInvoice: Boolean(invoice),
        error,
        paymentStatusPending: pendingHint,
        invoiceStatus: invoice?.status,
        pollTimedOut,
      }),
    [
      authLoading,
      user?.id,
      id,
      loading,
      invoice,
      error,
      pendingHint,
      pollTimedOut,
    ],
  );

  const enterPendingConfirmation = () => {
    setPendingHint(true);
    setPollTimedOut(false);
    pollStartedAt.current = Date.now();
  };

  const onPayWithPaymentSheet = async () => {
    if (!invoice) return;
    if (sandboxBuild) {
      if (!isPaymentSandboxTester || isAppReviewDemo) {
        setPayError(
          'Sandbox payments require a server-authorized payment test account.',
        );
        return;
      }
    } else if (!canPerformLiveMarketplaceActions) {
      return;
    }
    if (!stripeConfigured) {
      setPayError('Payment is temporarily unavailable. Please try again later.');
      return;
    }

    setPaying(true);
    setPayError(undefined);

    const bootstrap = await startWorkerInvoicePaymentSheet(invoice.id);
    if (bootstrap.error || !bootstrap.data) {
      setPaying(false);
      setPayError(bootstrap.error ?? 'Payment is temporarily unavailable.');
      return;
    }

    const googlePayTestEnv =
      sandboxBuild ||
      bootstrap.data.publishableKeyMode === 'test' ||
      (bootstrap.data.publishableKeyMode == null && isStripeTestPublishableKey());

    const { error: initError } = await initPaymentSheet({
      merchantDisplayName: 'Bridge Hive',
      customerId: bootstrap.data.customerId,
      customerSessionClientSecret: bootstrap.data.customerSessionClientSecret,
      paymentIntentClientSecret: bootstrap.data.paymentIntentClientSecret,
      allowsDelayedPaymentMethods: false,
      returnURL: getPaymentSheetReturnUrl(invoice.id),
      applePay: {
        merchantCountryCode: STRIPE_MERCHANT_COUNTRY_CODE,
      },
      googlePay: {
        merchantCountryCode: STRIPE_MERCHANT_COUNTRY_CODE,
        testEnv: googlePayTestEnv,
      },
    });

    if (initError) {
      setPaying(false);
      setPayError(initError.message || 'Payment is temporarily unavailable.');
      return;
    }

    const { error: presentError } = await presentPaymentSheet();
    setPaying(false);

    if (presentError) {
      if (presentError.code === 'Canceled') {
        return;
      }
      setPayError(presentError.message || 'Payment was not completed.');
      return;
    }

    // Client success is not authority for paid — wait for webhook confirmation.
    enterPendingConfirmation();
    void refresh();
  };

  const onPayWithHostedCheckout = async () => {
    if (!invoice) return;
    if (sandboxBuild) {
      if (!isPaymentSandboxTester || isAppReviewDemo) {
        setPayError(
          'Sandbox payments require a server-authorized payment test account.',
        );
        return;
      }
    } else if (!canPerformLiveMarketplaceActions) {
      return;
    }
    setPaying(true);
    setPayError(undefined);
    const result = await startWorkerInvoiceCheckout(invoice.id);
    setPaying(false);
    if (result.error || !result.url) {
      setPayError(result.error ?? 'Payment is temporarily unavailable.');
      return;
    }
    if (Platform.OS === 'web') {
      window.location.assign(result.url);
      return;
    }
    await Linking.openURL(result.url);
    enterPendingConfirmation();
  };

  const onPay = async () => {
    if (Platform.OS === 'web' || !stripeConfigured) {
      await onPayWithHostedCheckout();
      return;
    }
    await onPayWithPaymentSheet();
  };

  if (uiState === 'auth_loading' || uiState === 'invoice_loading') {
    return (
      <AppScreen edges={['top']} contentKind="detail">
        <ScreenHeader title="Invoice details" showBack onBack={() => router.back()} />
        <ActivityIndicator color={colors.navy} style={{ marginTop: spacing.xl }} />
      </AppScreen>
    );
  }

  if (uiState === 'sign_in_required') {
    return (
      <AppScreen edges={['top']} contentKind="detail">
        <ScreenHeader title="Invoice details" showBack onBack={() => router.back()} />
        <EmptyState
          title="Sign in again"
          description="Your session is not available on this page. Sign in to view your invoice and payment status."
          actionLabel="Sign in again"
          onAction={() => router.replace('/auth/worker/login')}
        />
      </AppScreen>
    );
  }

  if (uiState === 'query_error' || uiState === 'offline') {
    return (
      <AppScreen edges={['top']} contentKind="detail">
        <ScreenHeader title="Invoice details" showBack onBack={() => router.back()} />
        <EmptyState
          title="Could not load invoice"
          description={error ?? 'Check your connection and try again.'}
          actionLabel="Retry"
          onAction={() => void refresh()}
        />
      </AppScreen>
    );
  }

  if (
    uiState === 'invoice_not_found' ||
    uiState === 'authorization_denied' ||
    !invoice
  ) {
    return (
      <AppScreen edges={['top']} contentKind="detail">
        <ScreenHeader title="Invoice details" showBack onBack={() => router.back()} />
        <EmptyState
          title="Invoice not found"
          description="This invoice is unavailable."
          actionLabel="Back to invoices"
          onAction={() => router.replace('/(tabs)/invoices')}
        />
      </AppScreen>
    );
  }

  const status = invoice.status as WorkerInvoiceStatus;
  const orgName =
    invoice.organizations?.display_name ??
    invoice.organizations?.legal_name ??
    'Organization';
  const shift = invoice.shift_assignments?.shifts;
  const isSandboxInvoice = Boolean(
    invoice.is_sandbox || invoice.label === 'TEST' || sandboxBuild,
  );
  const payable = sandboxBuild
    ? isPaymentSandboxTester &&
      !isAppReviewDemo &&
      isWorkerInvoicePayable(status)
    : canPerformLiveMarketplaceActions && isWorkerInvoicePayable(status);
  const showPendingBanner =
    (uiState === 'payment_confirmation_pending' ||
      (pendingHint && status !== 'paid' && pollTimedOut)) &&
    status !== 'paid';
  const payLabel = `Pay ${formatMoney(invoice.commission_amount_minor, invoice.currency)}`;
  const shiftTitle = shift?.title?.trim() ?? '';
  const showShiftTitle = shiftTitle.length > 0 && shiftTitle.toLowerCase() !== 'shift';

  const dueLine = dueChipCopy(status, invoice.due_at, invoice.paid_at);
  const heroWash =
    status === 'past_due'
      ? (['rgba(180, 35, 24, 0.10)', 'rgba(255, 255, 255, 0)'] as const)
      : status === 'paid'
        ? (['rgba(20, 108, 67, 0.10)', 'rgba(255, 255, 255, 0)'] as const)
        : (['rgba(11, 42, 67, 0.05)', 'rgba(20, 169, 181, 0.12)', 'rgba(255, 255, 255, 0)'] as const);
  const facts: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    value: string;
  }[] = [];
  if (orgName !== 'Organization') {
    facts.push({ icon: 'business-outline', label: 'Organization', value: orgName });
  }
  const shiftHeadline = showShiftTitle
    ? shiftTitle
    : shift?.starts_at
      ? formatDate(shift.starts_at)
      : 'Approved shift';
  if (showShiftTitle && shift?.starts_at) {
    facts.push({ icon: 'calendar-outline', label: 'Date', value: formatDate(shift.starts_at) });
  }
  facts.push({
    icon: 'time-outline',
    label: 'Approved hours',
    value: hoursFromMinutes(invoice.approved_minutes ?? 0),
  });
  if (!isSandboxInvoice) {
    facts.push({
      icon: 'cash-outline',
      label: 'Hourly rate',
      value: `${formatMoney(invoice.rate_minor ?? 0, invoice.currency)} / hour`,
    });
  }
  return (
    <AppScreen scroll={false} edges={['top']} contentKind="detail">
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: tabScrollInset },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader
          title="Commission invoice"
          subtitle={invoice.invoice_number}
          showBack
          onBack={() => router.back()}
          titleSize="detail"
          motion={false}
          style={styles.scrollingHeader}
        />
        {demoInvoice ? <AppReviewDemoBanner /> : null}
        {demoInvoice ? (
          <Banner
            variant="info"
            title="APP REVIEW DEMO — NOT A REAL INVOICE"
            body="Checkout and payment are disabled on demonstration accounts."
          />
        ) : null}
        {isSandboxInvoice && !demoInvoice ? (
          <Banner
            variant="warning"
            title="TEST PAYMENT — SANDBOX ONLY"
            body="This invoice is isolated from live billing. Paying it never settles a real commission invoice, clears real debt, or changes marketplace standing."
          />
        ) : null}
        {showPendingBanner ? (
          <Banner
            variant="warning"
            title={PAYMENT_CONFIRMATION_PENDING}
            body={
              pollTimedOut
                ? PAYMENT_CONFIRMATION_SLOW
                : 'Status updates after payment confirmation. This page does not mark the invoice paid from the return link alone.'
            }
            actionLabel="Refresh status"
            onAction={() => void refresh()}
            secondaryActionLabel={pollTimedOut ? 'Back to invoices' : undefined}
            onSecondaryAction={
              pollTimedOut ? () => router.replace('/(tabs)/invoices') : undefined
            }
          />
        ) : null}

        <View style={styles.heroCard}>
          <LinearGradient
            pointerEvents="none"
            colors={heroWash}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.heroTop}>
            <Text style={styles.heroEyebrow}>
              {status === 'paid' ? 'Commission paid' : 'Commission to pay'}
            </Text>
            <StatusBadge
              label={workerInvoiceStatusLabel(status)}
              tone={toneForStatus(status)}
              icon={iconForStatus(status)}
              pulse={status === 'open' || status === 'payment_processing'}
            />
          </View>

          <View style={styles.heroAmountRow}>
            <MoneyAmount
              amountMinor={invoice.commission_amount_minor}
              currency={invoice.currency}
              emphasize
              style={styles.heroAmount}
            />
            <View
              style={styles.heroRateMark}
              accessibilityRole="text"
              accessibilityLabel="Platform commission rate"
            >
              <Text style={styles.percentIcon}>%</Text>
            </View>
          </View>

          <View style={styles.heroMeta}>
            <Text style={styles.heroMetaText}>
              Issued {formatShortDate(invoice.issued_at)}
            </Text>
            <View style={styles.heroMetaDot} />
            <Text
              style={[styles.heroMetaText, status === 'past_due' && styles.heroMetaAlert]}
            >
              {dueLine}
            </Text>
          </View>
        </View>

        <View style={styles.note}>
          <LinearGradient
            pointerEvents="none"
            colors={['#071E33', '#0B2A43', '#0E4A5C']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            pointerEvents="none"
            colors={[
              'rgba(255,255,255,0.10)',
              'rgba(20, 169, 181, 0.18)',
              'rgba(224, 170, 24, 0.10)',
              'transparent',
            ]}
            locations={[0, 0.35, 0.7, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.noteIcon}>
            <Ionicons name="shield-checkmark" size={15} color={colors.yellow} />
          </View>
          <Text style={styles.noteText}>{WORKER_COMMISSION_EXPLAINER}</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderIcon}>
              <Ionicons name="briefcase" size={14} color={colors.white} />
            </View>
            <View style={styles.cardHeaderCopy}>
              <Text style={styles.cardEyebrow}>This shift</Text>
              <Text style={styles.cardHint} numberOfLines={2}>
                {shiftHeadline}
              </Text>
            </View>
          </View>
          <View style={styles.facts}>
            {facts.map((fact, index) => (
              <FactRow
                key={fact.label}
                icon={fact.icon}
                label={fact.label}
                value={fact.value}
                last={index === facts.length - 1}
              />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Calculation</Text>
          <View style={styles.card}>
            <View style={styles.calcPad}>
              <KeyValueRow
                label="Commission rate"
                value={
                  <Text
                    style={styles.percentIconInline}
                    accessibilityLabel="Platform commission rate"
                  >
                    %
                  </Text>
                }
              />
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>You pay Bridge Hive</Text>
              <MoneyAmount
                amountMinor={invoice.commission_amount_minor}
                currency={invoice.currency}
                emphasize
                style={styles.totalValue}
              />
            </View>
          </View>
        </View>

        {status === 'paid' ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>
              {isSandboxInvoice ? 'Test receipt' : 'Receipt'}
            </Text>
            <View style={styles.card}>
              <View style={styles.calcPad}>
                {isSandboxInvoice ? (
                  <KeyValueRow label="Type" value="TEST — sandbox only" emphasize />
                ) : null}
                <KeyValueRow label="Invoice" value={invoice.invoice_number} />
                <KeyValueRow
                  label="Amount paid"
                  value={formatMoney(invoice.commission_amount_minor, invoice.currency)}
                  emphasize
                />
                <KeyValueRow
                  label="Paid on"
                  value={invoice.paid_at ? formatShortDate(invoice.paid_at) : '—'}
                />
                <KeyValueRow
                  label="Payment reference"
                  value={
                    invoice.stripe_payment_intent_id
                      ? `…${invoice.stripe_payment_intent_id.slice(-4)}`
                      : '—'
                  }
                />
              </View>
            </View>
          </View>
        ) : null}

        <View style={styles.actionsBlock}>
          <Pressable
            style={styles.helpRow}
            onPress={() =>
              Linking.openURL(
                `mailto:${APP_CONFIG.supportEmail}?subject=${encodeURIComponent(`Commission invoice ${invoice.invoice_number}`)}`,
              )
            }
            accessibilityRole="button"
            accessibilityLabel="Contact support about this invoice"
          >
            <View style={styles.helpIcon}>
              <Ionicons name="chatbubble-ellipses-outline" size={16} color={colors.tealStrong} />
            </View>
            <View style={styles.helpCopy}>
              <Text style={styles.helpTitle}>Need help with this invoice?</Text>
              <Text style={styles.helpAction}>Contact support</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </Pressable>

          {payable ? (
            <View style={styles.payInline}>
              {payError ? <Text style={styles.error}>{payError}</Text> : null}
              <PremiumActionButton
                label={payLabel}
                loading={paying}
                onPress={() => void onPay()}
                icon="card-outline"
                accessibilityHint="Starts secure checkout for this commission invoice"
                style={styles.payButton}
              />
            </View>
          ) : null}

          {payError && !payable ? <Text style={styles.error}>{payError}</Text> : null}
        </View>
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
  },
  scrollingHeader: {
    marginBottom: 0,
  },
  heroCard: {
    gap: spacing.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.92)',
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(11, 42, 67, 0.10)',
    ...shadows.sm,
    shadowOpacity: 0.05,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  heroEyebrow: {
    flex: 1,
    fontFamily: typography.fonts.semibold,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.tealStrong,
  },
  heroAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
  },
  heroAmount: {
    fontFamily: typography.fonts.displayExtra,
    fontSize: 36,
    lineHeight: 40,
    color: colors.navy,
    letterSpacing: -0.7,
  },
  heroRateMark: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(20, 169, 181, 0.12)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(20, 169, 181, 0.28)',
  },
  percentIcon: {
    fontFamily: typography.fonts.displayExtra,
    fontSize: 15,
    lineHeight: 18,
    color: colors.tealStrong,
  },
  percentIconInline: {
    fontFamily: typography.fonts.displayExtra,
    fontSize: 18,
    lineHeight: 22,
    color: colors.navy,
  },
  heroMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  heroMetaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(11, 42, 67, 0.28)',
  },
  heroMetaText: {
    fontFamily: typography.fonts.medium,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  heroMetaAlert: {
    color: colors.error,
  },
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.md,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: colors.navy,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 210, 90, 0.22)',
    ...(Platform.OS === 'web'
      ? ({ backdropFilter: 'blur(16px) saturate(1.35)' } as object)
      : null),
  },
  noteIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 210, 90, 0.28)',
  },
  noteText: {
    flex: 1,
    fontFamily: typography.fonts.medium,
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(255, 255, 255, 0.92)',
    letterSpacing: -0.1,
  },
  section: {
    gap: spacing.sm,
  },
  sectionLabel: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: typography.size.sm,
    color: colors.navy,
    letterSpacing: -0.1,
    paddingHorizontal: 2,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(11, 42, 67, 0.10)',
    ...shadows.sm,
    shadowOpacity: 0.05,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md + 2,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(11, 42, 67, 0.08)',
  },
  cardHeaderIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.navy,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 210, 90, 0.22)',
  },
  cardHeaderCopy: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  cardEyebrow: {
    fontFamily: typography.fonts.bold,
    fontSize: 11,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: colors.tealStrong,
  },
  cardHint: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 16,
    lineHeight: 21,
    color: colors.navy,
    letterSpacing: -0.2,
  },
  facts: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: 'rgba(11, 42, 67, 0.03)',
  },
  factRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    paddingVertical: 10,
    paddingHorizontal: spacing.sm,
  },
  factRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(11, 42, 67, 0.07)',
  },
  factIcon: {
    width: 32,
    height: 32,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(20, 169, 181, 0.14)',
    flexShrink: 0,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(20, 169, 181, 0.22)',
  },
  factCopy: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  factLabel: {
    fontFamily: typography.fonts.medium,
    fontSize: 11,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    color: colors.textSecondary,
  },
  factValue: {
    fontFamily: typography.fonts.semibold,
    fontSize: 15,
    lineHeight: 20,
    color: colors.navy,
  },
  calcPad: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: 'rgba(11, 42, 67, 0.035)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(11, 42, 67, 0.08)',
  },
  totalLabel: {
    fontFamily: typography.fonts.semibold,
    fontSize: 15,
    color: colors.navy,
    flex: 1,
  },
  totalValue: {
    fontFamily: typography.fonts.display,
    fontSize: 18,
    color: colors.navy,
  },
  actionsBlock: {
    gap: spacing.md,
  },
  helpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 56,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(11, 42, 67, 0.10)',
    ...shadows.sm,
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
  },
  payInline: {
    gap: spacing.sm,
    alignItems: 'center',
  },
  payButton: {
    width: 'auto',
    alignSelf: 'center',
    minWidth: 188,
    maxWidth: 240,
  },
  helpIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(20, 169, 181, 0.14)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(20, 169, 181, 0.22)',
  },
  helpCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  helpTitle: {
    fontFamily: typography.fonts.semibold,
    fontSize: 15,
    color: colors.navy,
  },
  helpAction: {
    fontFamily: typography.fonts.medium,
    fontSize: 13,
    color: colors.tealStrong,
  },
  error: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.size.sm,
    color: colors.error,
  },
});
