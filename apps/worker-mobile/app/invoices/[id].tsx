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

import { AppScreen } from '@/components/ui/AppScreen';
import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { KeyValueRow } from '@/components/ui/KeyValueRow';
import { ListGroup, ListGroupSeparator } from '@/components/ui/Card';
import { MoneySummary } from '@/components/ui/MoneySummary';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { StickyActionBar } from '@/components/ui/StickyActionBar';
import { Surface } from '@/components/ui/Surface';
import { type StatusTone } from '@/components/ui/StatusBadge';
import { APP_CONFIG } from '@/constants/config';
import { colors, spacing, typography } from '@/constants/theme';
import { useInvoice } from '@/hooks/useInvoice';
import { startWorkerInvoiceCheckout } from '@/lib/invoices';
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
  const params = useLocalSearchParams<{
    id: string | string[];
    payment_status?: string | string[];
  }>();
  const id = normalizeRouteParam(params.id);
  const paymentStatus = normalizeRouteParam(params.payment_status);
  const { user, loading: authLoading } = useAuth();
  const { invoice, loading, error, refresh } = useInvoice(id, user?.id, {
    authLoading,
  });
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

  const onPay = async () => {
    if (!invoice) return;
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
    } else {
      await Linking.openURL(result.url);
      setPendingHint(true);
      setPollTimedOut(false);
      pollStartedAt.current = Date.now();
    }
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
          onAction={() => router.replace('/welcome')}
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
  const payable = isWorkerInvoicePayable(status);
  const showPendingBanner =
    (uiState === 'payment_confirmation_pending' ||
      (pendingHint && status !== 'paid' && pollTimedOut)) &&
    status !== 'paid';
  const payLabel = `Pay ${formatMoney(invoice.commission_amount_minor, invoice.currency)}`;
  const commissionContext = `${(invoice.commission_rate_bps / 100).toFixed(0)}% of ${formatMoney(
    invoice.gross_amount_minor,
    invoice.currency,
  )} approved gross pay`;

  return (
    <AppScreen scroll={false} edges={['top']} contentKind="detail">
      <ScreenHeader
        title="Invoice details"
        subtitle={invoice.invoice_number}
        showBack
        onBack={() => router.back()}
        titleSize="detail"
      />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          payable ? styles.contentWithSticky : null,
        ]}
        showsVerticalScrollIndicator={false}
      >
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

        <MoneySummary
          label="Bridge Hive commission"
          amountMinor={invoice.commission_amount_minor}
          currency={invoice.currency}
          statusLabel={workerInvoiceStatusLabel(status)}
          statusTone={toneForStatus(status)}
          statusIcon={iconForStatus(status)}
          context={commissionContext}
          stateLine={invoiceStateLine(status, invoice.due_at, invoice.paid_at)}
        />

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Shift</Text>
          <ListGroup>
            <View style={styles.groupPad}>
              <KeyValueRow label="Shift" value={shift?.title?.trim() || 'Shift'} />
            </View>
            <ListGroupSeparator />
            <View style={styles.groupPad}>
              <KeyValueRow label="Organization" value={orgName} />
            </View>
            <ListGroupSeparator />
            <View style={styles.groupPad}>
              <KeyValueRow
                label="Shift date"
                value={shift?.starts_at ? formatDate(shift.starts_at) : '—'}
              />
            </View>
            <ListGroupSeparator />
            <View style={styles.groupPad}>
              <KeyValueRow
                label="Approved hours"
                value={hoursFromMinutes(invoice.approved_minutes)}
              />
            </View>
            <ListGroupSeparator />
            <View style={styles.groupPad}>
              <KeyValueRow
                label="Hourly rate"
                value={`${formatMoney(invoice.rate_minor, invoice.currency)} / hour`}
              />
            </View>
          </ListGroup>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Calculation</Text>
          <ListGroup>
            <View style={styles.groupPad}>
              <KeyValueRow
                label="Approved gross pay"
                value={formatMoney(invoice.gross_amount_minor, invoice.currency)}
              />
            </View>
            <ListGroupSeparator />
            <View style={styles.groupPad}>
              <KeyValueRow
                label="Commission rate"
                value={`${(invoice.commission_rate_bps / 100).toFixed(2)}%`}
              />
            </View>
            <View style={styles.finalDivider} />
            <View style={styles.groupPad}>
              <KeyValueRow
                label="Bridge Hive commission"
                value={formatMoney(invoice.commission_amount_minor, invoice.currency)}
                emphasize
              />
            </View>
          </ListGroup>
        </View>

        <Surface variant="tinted">
          <Text style={styles.explainer}>{WORKER_COMMISSION_EXPLAINER}</Text>
        </Surface>

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
        <StickyActionBar>
          {payError ? <Text style={styles.error}>{payError}</Text> : null}
          <Button
            label={payLabel}
            variant="primary"
            loading={paying}
            onPress={() => void onPay()}
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
  contentWithSticky: {
    paddingBottom: spacing.huge,
  },
  section: {
    gap: spacing.sm,
  },
  sectionLabel: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    paddingHorizontal: 2,
  },
  groupPad: {
    paddingHorizontal: spacing.lg,
  },
  finalDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.borderStrong,
    marginTop: spacing.xs,
  },
  explainer: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.textSecondary,
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
