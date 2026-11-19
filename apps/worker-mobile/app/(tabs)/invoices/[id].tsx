import {
  daysUntilDue,
  dueDateCopy,
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
import { router, useFocusEffect, useLocalSearchParams, usePathname } from 'expo-router';
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
import { ListGroup, ListGroupSeparator } from '@/components/ui/Card';
import { MoneyAmount } from '@/components/ui/MoneyAmount';
import { MoneySummary } from '@/components/ui/MoneySummary';
import { PremiumActionButton } from '@/components/ui/PremiumActionButton';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { StickyActionBar } from '@/components/ui/StickyActionBar';
import { type StatusTone } from '@/components/ui/StatusBadge';
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
import { invoiceListHref } from '@/lib/invoice-load';
import { navigateBack } from '@/lib/navigation';
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

function SectionCardHeader({
  icon,
  eyebrow,
  hint,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  eyebrow: string;
  hint?: string;
}) {
  return (
    <View style={styles.cardHeader}>
      <LinearGradient
        colors={[colors.navy, '#0C3E56', colors.tealStrong]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cardHeaderIcon}
      >
        <Ionicons name={icon} size={14} color={colors.white} />
      </LinearGradient>
      <View style={styles.cardHeaderCopy}>
        <Text style={styles.cardEyebrow}>{eyebrow}</Text>
        {hint ? (
          <Text style={styles.cardHint} numberOfLines={2}>
            {hint}
          </Text>
        ) : null}
      </View>
    </View>
  );
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

function iconForStatus(status: WorkerInvoiceStatus) {
  if (status === 'past_due') return 'alert-circle' as const;
  if (status === 'paid') return 'checkmark-circle' as const;
  if (status === 'payment_processing') return 'time' as const;
  return 'document-text' as const;
}

function invoiceStateLine(
  status: WorkerInvoiceStatus,
  dueAt: string,
  paidAt: string | null | undefined,
): string {
  if (status === 'paid' && paidAt) {
    return `Paid on ${formatShortDate(paidAt)}`;
  }
  if (status === 'past_due') {
    const days = Math.abs(daysUntilDue(dueAt));
    return days === 1 ? 'Past due by 1 day' : `Past due by ${days} days`;
  }
  return `Due ${formatShortDate(dueAt)} · ${dueDateCopy(dueAt)}`;
}

export default function InvoiceDetailScreen() {
  const tabScrollInset = useTabBarScrollInset(spacing.xl);
  const pathname = usePathname();
  const listHref = invoiceListHref(pathname);
  const goBackToList = useCallback(() => {
    navigateBack(listHref);
  }, [listHref]);
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
        <ScreenHeader title="Invoice details" showBack onBack={goBackToList} />
        <ActivityIndicator color={colors.navy} style={{ marginTop: spacing.xl }} />
      </AppScreen>
    );
  }

  if (uiState === 'sign_in_required') {
    return (
      <AppScreen edges={['top']} contentKind="detail">
        <ScreenHeader title="Invoice details" showBack onBack={goBackToList} />
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
        <ScreenHeader title="Invoice details" showBack onBack={goBackToList} />
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
        <ScreenHeader title="Invoice details" showBack onBack={goBackToList} />
        <EmptyState
          title="Invoice not found"
          description="This invoice is unavailable."
          actionLabel="Back to invoices"
          onAction={() => router.replace(listHref)}
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
  const grossLabel = formatMoney(invoice.gross_amount_minor, invoice.currency);
  const commissionContext = `Percentage of ${grossLabel} approved gross pay`;
  const shiftTitle = shift?.title?.trim() ?? '';
  const showShiftTitle = shiftTitle.length > 0 && shiftTitle.toLowerCase() !== 'shift';
  const shiftHeadline = showShiftTitle
    ? shiftTitle
    : shift?.starts_at
      ? formatDate(shift.starts_at)
      : 'Approved shift';
  const shiftFacts: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    value: string;
  }[] = [];
  if (orgName !== 'Organization') {
    shiftFacts.push({ icon: 'business-outline', label: 'Organization', value: orgName });
  }
  if (showShiftTitle && shift?.starts_at) {
    shiftFacts.push({
      icon: 'calendar-outline',
      label: 'Date',
      value: formatDate(shift.starts_at),
    });
  } else if (!showShiftTitle && shift?.starts_at) {
    shiftFacts.push({
      icon: 'calendar-outline',
      label: 'Shift date',
      value: formatDate(shift.starts_at),
    });
  }
  shiftFacts.push({
    icon: 'time-outline',
    label: 'Approved hours',
    value: hoursFromMinutes(invoice.approved_minutes ?? 0),
  });
  if (!isSandboxInvoice) {
    shiftFacts.push({
      icon: 'cash-outline',
      label: 'Hourly rate',
      value: `${formatMoney(invoice.rate_minor ?? 0, invoice.currency)} / hour`,
    });
  }

  return (
    <AppScreen scroll={false} edges={['top']} contentKind="detail">
      <ScreenHeader
        title="Invoice details"
        subtitle={invoice.invoice_number}
        showBack
        onBack={goBackToList}
        titleSize="detail"
      />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom: payable
              ? tabScrollInset + 88 + spacing.xxl
              : tabScrollInset,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
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
              pollTimedOut ? () => router.replace(listHref) : undefined
            }
          />
        ) : null}

        <MoneySummary
          label="Bridge Hive commission"
          amountMinor={invoice.commission_amount_minor}
          currency={invoice.currency}
          statusLabel={workerInvoiceStatusLabel(status)}
          statusTone={toneForStatus(status)}
          statusIcon={iconForStatus(status)}
          pulse={status === 'open' || status === 'payment_processing'}
          context={commissionContext}
          stateLine={invoiceStateLine(status, invoice.due_at, invoice.paid_at)}
        />

        <View style={styles.card}>
          <SectionCardHeader
            icon="briefcase"
            eyebrow="This shift"
            hint={shiftHeadline}
          />
          <View style={styles.facts}>
            {shiftFacts.map((fact, index) => (
              <FactRow
                key={fact.label}
                icon={fact.icon}
                label={fact.label}
                value={fact.value}
                last={index === shiftFacts.length - 1}
              />
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <SectionCardHeader icon="calculator-outline" eyebrow="Calculation" />
          <View style={styles.calcPad}>
            <KeyValueRow label="Approved gross pay" value={grossLabel} />
            <KeyValueRow label="Commission rate" value="%" />
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

        <View style={styles.note}>
          <LinearGradient
            pointerEvents="none"
            colors={[
              'rgba(11, 42, 67, 0.05)',
              'rgba(20, 169, 181, 0.10)',
              'rgba(224, 170, 24, 0.08)',
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            colors={[colors.navy, '#0C3E56', colors.tealStrong]}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.noteIcon}
          >
            <Ionicons name="shield-checkmark" size={15} color={colors.white} />
          </LinearGradient>
          <Text style={styles.noteText}>{WORKER_COMMISSION_EXPLAINER}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Invoice timeline</Text>
          <ListGroup>
            <View style={styles.groupPad}>
              <KeyValueRow label="Issued" value={formatShortDate(invoice.issued_at)} />
            </View>
            <ListGroupSeparator />
            <View style={styles.groupPad}>
              <KeyValueRow label="Due" value={formatShortDate(invoice.due_at)} />
            </View>
            {invoice.paid_at ? (
              <>
                <ListGroupSeparator />
                <View style={styles.groupPad}>
                  <KeyValueRow label="Paid" value={formatShortDate(invoice.paid_at)} />
                </View>
              </>
            ) : null}
          </ListGroup>
        </View>

        {status === 'paid' ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>
              {isSandboxInvoice ? 'TEST receipt' : 'Receipt'}
            </Text>
            <ListGroup>
              {isSandboxInvoice ? (
                <>
                  <View style={styles.groupPad}>
                    <KeyValueRow label="Type" value="TEST — sandbox only" emphasize />
                  </View>
                  <ListGroupSeparator />
                </>
              ) : null}
              <View style={styles.groupPad}>
                <KeyValueRow label="Invoice" value={invoice.invoice_number} />
              </View>
              <ListGroupSeparator />
              <View style={styles.groupPad}>
                <KeyValueRow
                  label="Amount paid"
                  value={formatMoney(invoice.commission_amount_minor, invoice.currency)}
                  emphasize
                />
              </View>
              <ListGroupSeparator />
              <View style={styles.groupPad}>
                <KeyValueRow
                  label="Paid on"
                  value={invoice.paid_at ? formatShortDate(invoice.paid_at) : '—'}
                />
              </View>
              <ListGroupSeparator />
              <View style={styles.groupPad}>
                <KeyValueRow
                  label="Payment reference"
                  value={
                    invoice.stripe_payment_intent_id
                      ? `…${invoice.stripe_payment_intent_id.slice(-4)}`
                      : '—'
                  }
                />
              </View>
            </ListGroup>
          </View>
        ) : null}

        <Pressable
          style={styles.helpRow}
          onPress={() =>
            Linking.openURL(
              `mailto:${APP_CONFIG.supportEmail}?subject=${encodeURIComponent('Commission invoice')}`,
            )
          }
          accessibilityRole="button"
          accessibilityLabel="Contact support"
        >
          <View style={styles.helpCopy}>
            <Text style={styles.helpTitle}>Need help with this invoice?</Text>
            <Text style={styles.helpAction}>Contact support</Text>
          </View>
        </Pressable>

        {payError && !payable ? <Text style={styles.error}>{payError}</Text> : null}
      </ScrollView>

      {payable ? (
        <StickyActionBar clearTabBar>
          {payError ? <Text style={styles.error}>{payError}</Text> : null}
          <PremiumActionButton
            label={payLabel}
            loading={paying}
            onPress={() => void onPay()}
            icon="card-outline"
          />
        </StickyActionBar>
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
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
    backgroundColor: colors.card,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(11, 42, 67, 0.08)',
    ...shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  cardHeaderIcon: {
    width: 32,
    height: 32,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeaderCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  cardEyebrow: {
    fontFamily: typography.fonts.bold,
    fontSize: 11,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    color: colors.tealStrong,
  },
  cardHint: {
    fontFamily: typography.fonts.semibold,
    fontSize: 14,
    lineHeight: 19,
    color: colors.navy,
    letterSpacing: -0.15,
  },
  facts: {
    paddingBottom: spacing.xs,
  },
  factRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
  },
  factRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(11, 42, 67, 0.07)',
  },
  factIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    backgroundColor: 'rgba(20, 169, 181, 0.10)',
  },
  factCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  factLabel: {
    fontFamily: typography.fonts.semibold,
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.textMuted,
  },
  factValue: {
    fontFamily: typography.fonts.medium,
    fontSize: 15,
    lineHeight: 20,
    color: colors.navy,
    letterSpacing: -0.15,
  },
  calcPad: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xs,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: 'rgba(11, 42, 67, 0.04)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(11, 42, 67, 0.08)',
  },
  totalLabel: {
    flex: 1,
    fontFamily: typography.fonts.semibold,
    fontSize: 14,
    color: colors.navy,
    letterSpacing: -0.1,
  },
  totalValue: {
    fontFamily: typography.fonts.displayExtra,
    fontSize: 22,
    lineHeight: 28,
    color: colors.navy,
    letterSpacing: -0.4,
  },
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(11, 42, 67, 0.08)',
    ...shadows.sm,
  },
  noteIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  noteText: {
    flex: 1,
    fontFamily: typography.fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.navy,
  },
  groupPad: {
    paddingHorizontal: spacing.lg,
  },
  helpRow: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    minHeight: 44,
  },
  helpCopy: {
    gap: 4,
  },
  helpTitle: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
  },
  helpAction: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.size.md,
    color: colors.tealStrong,
  },
  error: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.size.sm,
    color: colors.error,
  },
});
