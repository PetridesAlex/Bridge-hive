import {
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
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppScreen } from '@/components/ui/AppScreen';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
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

  // Bounded pending confirmation poll (webhook remains authoritative).
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
      // Same-tab navigation preserves auth session for the return URL.
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
      <AppScreen edges={['top']}>
        <ScreenHeader title="Invoice" showBack onBack={() => router.back()} />
        <ActivityIndicator color={colors.navy} style={{ marginTop: spacing.xl }} />
      </AppScreen>
    );
  }

  if (uiState === 'sign_in_required') {
    return (
      <AppScreen edges={['top']}>
        <ScreenHeader title="Invoice" showBack onBack={() => router.back()} />
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
      <AppScreen edges={['top']}>
        <ScreenHeader title="Invoice" showBack onBack={() => router.back()} />
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
      <AppScreen edges={['top']}>
        <ScreenHeader title="Invoice" showBack onBack={() => router.back()} />
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

  return (
    <AppScreen scroll={false} edges={['top']}>
      <ScreenHeader
        title={invoice.invoice_number}
        subtitle="Bridge Hive commission invoice"
        showBack
        onBack={() => router.back()}
      />
      <ScrollView contentContainerStyle={styles.content}>
        {showPendingBanner ? (
          <View style={styles.pending}>
            <Text style={styles.pendingText}>
              {pollTimedOut
                ? PAYMENT_CONFIRMATION_SLOW
                : PAYMENT_CONFIRMATION_PENDING}
            </Text>
            <Text style={styles.hint}>
              Status updates after payment confirmation. This page does not mark the
              invoice paid from the return link alone.
            </Text>
            <Button
              label="Refresh status"
              variant="secondary"
              onPress={() => void refresh()}
            />
            {pollTimedOut ? (
              <Button
                label="Back to invoices"
                variant="ghost"
                onPress={() => router.replace('/(tabs)/invoices')}
              />
            ) : null}
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.section}>Shift</Text>
          <Text style={styles.value}>{shift?.title?.trim() || 'Shift'}</Text>
          <Text style={styles.meta}>{orgName}</Text>
          {shift?.starts_at ? (
            <Text style={styles.meta}>{formatDate(shift.starts_at)}</Text>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.section}>Amounts</Text>
          <Row label="Approved hours" value={hoursFromMinutes(invoice.approved_minutes)} />
          <Row
            label="Shift rate"
            value={`${formatMoney(invoice.rate_minor, invoice.currency)} / hour`}
          />
          <Row
            label="Approved gross pay"
            value={formatMoney(invoice.gross_amount_minor, invoice.currency)}
          />
          <Row
            label="Commission rate"
            value={`${(invoice.commission_rate_bps / 100).toFixed(2)}%`}
          />
          <Row
            label="Bridge Hive commission"
            value={formatMoney(invoice.commission_amount_minor, invoice.currency)}
            emphasize
          />
        </View>

        <View style={styles.info}>
          <Text style={styles.infoText}>{WORKER_COMMISSION_EXPLAINER}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.section}>Status</Text>
          <Row label="Issued" value={formatShortDate(invoice.issued_at)} />
          <Row
            label="Due"
            value={`${formatShortDate(invoice.due_at)} · ${dueDateCopy(invoice.due_at)}`}
          />
          <Row label="Status" value={workerInvoiceStatusLabel(status)} />
          {invoice.paid_at ? (
            <Row label="Paid" value={formatShortDate(invoice.paid_at)} />
          ) : null}
        </View>

        {payError ? <Text style={styles.error}>{payError}</Text> : null}

        {payable ? (
          <Button
            label="Pay invoice"
            variant="brand"
            loading={paying}
            onPress={() => void onPay()}
          />
        ) : null}

        <Button
          label="Contact support"
          variant="ghost"
          onPress={() =>
            Linking.openURL('mailto:support@bridgehive.local?subject=Commission%20invoice')
          }
        />
      </ScrollView>
    </AppScreen>
  );
}

function Row({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, emphasize ? styles.emphasize : null]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.huge,
    gap: spacing.md,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  section: {
    fontFamily: typography.fonts.semibold,
    fontSize: 11,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  value: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 16,
    color: colors.navy,
  },
  meta: {
    fontFamily: typography.fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  rowLabel: {
    fontFamily: typography.fonts.regular,
    fontSize: 14,
    color: colors.textMuted,
    flex: 1,
  },
  rowValue: {
    fontFamily: typography.fonts.regular,
    fontSize: 14,
    color: colors.navy,
    textAlign: 'right',
    flexShrink: 1,
  },
  emphasize: {
    fontFamily: typography.fonts.bold,
  },
  info: {
    backgroundColor: colors.blueLight,
    borderRadius: 12,
    padding: spacing.md,
  },
  infoText: {
    fontFamily: typography.fonts.regular,
    fontSize: 12,
    color: colors.navy,
  },
  pending: {
    backgroundColor: colors.warningLight,
    borderRadius: 12,
    padding: spacing.md,
    gap: spacing.sm,
  },
  pendingText: {
    fontFamily: typography.fonts.semibold,
    fontSize: 14,
    color: colors.navy,
  },
  hint: {
    fontFamily: typography.fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
  },
  error: {
    fontFamily: typography.fonts.regular,
    fontSize: 12,
    color: colors.error,
  },
});
