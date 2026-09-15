import {
  addCommissionDueDays,
  amountsMatch,
  buildOrganizationPaysGrossSnapshot,
  checkoutIdempotencyKey,
  checkoutSessionMapsToPaidApply,
  commissionFromGross,
  currenciesMatch,
  daysUntilDue,
  dueDateCopy,
  isAllowedCheckoutOrigin,
  isWorkerInvoicePayable,
  normalizeRouteParam,
  parseCheckoutInvoiceId,
  paymentReturnMarksPaid,
  PENDING_CONFIRMATION_MAX_MS,
  PENDING_CONFIRMATION_POLL_MS,
  rejectClientChosenAmount,
  resolveInvoiceDetailUiState,
  shouldContinuePendingPoll,
  stripeConfigured,
  workerInvoiceStatusLabel,
  WORKER_COMMISSION_DUE_DAYS,
} from '@bridge-hive/domain';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('worker commission money helpers', () => {
  it('calculates exact 16% for ordinary gross', () => {
    expect(commissionFromGross(25000, 1600)).toBe(4000);
  });

  it('rounds half-up at boundary 10003 → 1600', () => {
    expect(commissionFromGross(10003, 1600)).toBe(1600);
  });

  it('rounds half-up at boundary 10004 → 1601', () => {
    expect(commissionFromGross(10004, 1600)).toBe(1601);
  });

  it('builds hospital-owes-gross snapshot without deducting commission', () => {
    const snap = buildOrganizationPaysGrossSnapshot(25000, 1600);
    expect(snap.workerTransferAmountMinor).toBe(25000);
    expect(snap.organizationTotalDueMinor).toBe(25000);
    expect(snap.commissionAmountMinor).toBe(4000);
  });
});

describe('worker invoice display helpers', () => {
  it('labels statuses for open/past_due/paid', () => {
    expect(workerInvoiceStatusLabel('open')).toBe('Open');
    expect(workerInvoiceStatusLabel('past_due')).toBe('Past due');
    expect(workerInvoiceStatusLabel('paid')).toBe('Paid');
  });

  it('treats open, past_due, and payment_processing as payable', () => {
    expect(isWorkerInvoicePayable('open')).toBe(true);
    expect(isWorkerInvoicePayable('past_due')).toBe(true);
    expect(isWorkerInvoicePayable('payment_processing')).toBe(true);
    expect(isWorkerInvoicePayable('paid')).toBe(false);
  });

  it('formats due-date copy and adds calendar due days', () => {
    expect(daysUntilDue(new Date('2026-01-11T00:00:00Z'), new Date('2026-01-01T00:00:00Z'))).toBe(
      10,
    );
    expect(dueDateCopy(new Date('2026-01-01T00:00:00Z'), new Date('2026-01-01T12:00:00Z'))).toBe(
      'Due today',
    );
    expect(WORKER_COMMISSION_DUE_DAYS).toBe(10);
    const due = addCommissionDueDays(new Date('2026-01-01T00:00:00Z'), 10);
    expect(due.toISOString().startsWith('2026-01-11')).toBe(true);
  });
});

describe('stripe checkout request guards', () => {
  it('parses invoice id and rejects client-chosen amounts', () => {
    expect(parseCheckoutInvoiceId({ invoice_id: ' inv-1 ' })).toBe('inv-1');
    expect(parseCheckoutInvoiceId({ invoice_id: 1 })).toBeNull();
    expect(rejectClientChosenAmount({ invoice_id: 'x', amount: 1 })).toBe(true);
    expect(rejectClientChosenAmount({ invoice_id: 'x' })).toBe(false);
  });

  it('validates amount and currency matches', () => {
    expect(amountsMatch(4000, 4000)).toBe(true);
    expect(amountsMatch(4000, 4001)).toBe(false);
    expect(currenciesMatch('EUR', 'eur')).toBe(true);
    expect(currenciesMatch('EUR', 'USD')).toBe(false);
  });

  it('never marks paid from return URL alone', () => {
    expect(paymentReturnMarksPaid({ payment_status: 'pending' })).toBe(false);
    expect(paymentReturnMarksPaid({ payment_status: 'success' })).toBe(false);
  });

  it('detects missing Stripe configuration safely', () => {
    expect(stripeConfigured({})).toBe(false);
    expect(
      stripeConfigured({
        STRIPE_SECRET_KEY: 'sk_test_x',
        STRIPE_WEBHOOK_SECRET: 'whsec_x',
      }),
    ).toBe(true);
  });

  it('allowlists localhost return origins and rejects unknown hosts', () => {
    expect(isAllowedCheckoutOrigin('http://127.0.0.1:8081')).toBe(true);
    expect(isAllowedCheckoutOrigin('http://localhost:8081')).toBe(true);
    expect(isAllowedCheckoutOrigin('http://localhost:3000')).toBe(true);
    expect(isAllowedCheckoutOrigin('https://evil.example')).toBe(false);
    expect(
      isAllowedCheckoutOrigin('https://app.bridgehive.test', [
        'https://app.bridgehive.test',
      ]),
    ).toBe(true);
  });

  it('rotates checkout idempotency key after non-open sessions', () => {
    expect(checkoutIdempotencyKey('inv-1', null, null)).toBe(
      'invoice-checkout-inv-1-v1',
    );
    expect(checkoutIdempotencyKey('inv-1', 'cs_open', 'open')).toBe(
      'invoice-checkout-inv-1-v1',
    );
    expect(checkoutIdempotencyKey('inv-1', 'cs_expired', 'expired')).toBe(
      'invoice-checkout-inv-1-cs_expired',
    );
  });

  it('disables Supabase JWT verification for stripe-webhook only', () => {
    const configPath = join(
      __dirname,
      '../../../../../supabase/config.toml',
    );
    const toml = readFileSync(configPath, 'utf8');
    expect(toml).toMatch(/\[functions\.stripe-webhook\][\s\S]*?verify_jwt\s*=\s*false/);
  });

  it('normalizes route params and strips query pollution from ids', () => {
    expect(normalizeRouteParam('abc-123')).toBe('abc-123');
    expect(normalizeRouteParam(['abc-123', 'other'])).toBe('abc-123');
    expect(normalizeRouteParam('abc-123?payment_status=pending')).toBe('abc-123');
    expect(normalizeRouteParam('abc-123#frag')).toBe('abc-123');
    expect(normalizeRouteParam('')).toBeNull();
    expect(normalizeRouteParam(undefined)).toBeNull();
  });

  it('maps only paid Checkout sessions to paid apply', () => {
    expect(checkoutSessionMapsToPaidApply('paid')).toBe(true);
    expect(checkoutSessionMapsToPaidApply('unpaid')).toBe(false);
    expect(checkoutSessionMapsToPaidApply('no_payment_required')).toBe(false);
  });
});

describe('invoice detail return UI state machine', () => {
  it('stays auth_loading while session is hydrating', () => {
    expect(
      resolveInvoiceDetailUiState({
        authLoading: true,
        hasSession: false,
        invoiceId: 'inv-1',
        invoiceLoading: true,
        hasInvoice: false,
        paymentStatusPending: true,
        pollTimedOut: false,
      }),
    ).toBe('auth_loading');
  });

  it('requires sign-in instead of an infinite spinner when session is missing', () => {
    expect(
      resolveInvoiceDetailUiState({
        authLoading: false,
        hasSession: false,
        invoiceId: 'inv-1',
        invoiceLoading: false,
        hasInvoice: false,
        paymentStatusPending: true,
        pollTimedOut: false,
      }),
    ).toBe('sign_in_required');
  });

  it('loads invoice while authenticated and query in flight', () => {
    expect(
      resolveInvoiceDetailUiState({
        authLoading: false,
        hasSession: true,
        invoiceId: 'inv-1',
        invoiceLoading: true,
        hasInvoice: false,
        paymentStatusPending: true,
        pollTimedOut: false,
      }),
    ).toBe('invoice_loading');
  });

  it('does not block invoice rendering when payment_status=pending', () => {
    expect(
      resolveInvoiceDetailUiState({
        authLoading: false,
        hasSession: true,
        invoiceId: 'inv-1',
        invoiceLoading: false,
        hasInvoice: true,
        paymentStatusPending: true,
        invoiceStatus: 'payment_processing',
        pollTimedOut: false,
      }),
    ).toBe('payment_confirmation_pending');
  });

  it('shows invoice_loaded for paid invoices even with pending query hint', () => {
    expect(
      resolveInvoiceDetailUiState({
        authLoading: false,
        hasSession: true,
        invoiceId: 'inv-1',
        invoiceLoading: false,
        hasInvoice: true,
        paymentStatusPending: true,
        invoiceStatus: 'paid',
        pollTimedOut: false,
      }),
    ).toBe('invoice_loaded');
  });

  it('maps query failures to query_error, not not-found spinner', () => {
    expect(
      resolveInvoiceDetailUiState({
        authLoading: false,
        hasSession: true,
        invoiceId: 'inv-1',
        invoiceLoading: false,
        hasInvoice: false,
        error: 'network down',
        paymentStatusPending: false,
        pollTimedOut: false,
      }),
    ).toBe('query_error');
  });

  it('maps missing invoice after successful auth to invoice_not_found', () => {
    expect(
      resolveInvoiceDetailUiState({
        authLoading: false,
        hasSession: true,
        invoiceId: 'inv-1',
        invoiceLoading: false,
        hasInvoice: false,
        paymentStatusPending: false,
        pollTimedOut: false,
      }),
    ).toBe('invoice_not_found');
  });

  it('uses bounded pending poll timings', () => {
    expect(PENDING_CONFIRMATION_POLL_MS).toBe(2000);
    expect(PENDING_CONFIRMATION_MAX_MS).toBe(30_000);
  });

  it('continues pending poll until paid or timeout (fake elapsed)', () => {
    expect(
      shouldContinuePendingPoll({
        pendingHint: true,
        status: 'payment_processing',
        elapsedMs: 0,
      }),
    ).toBe(true);
    expect(
      shouldContinuePendingPoll({
        pendingHint: true,
        status: 'payment_processing',
        elapsedMs: 29_999,
      }),
    ).toBe(true);
    expect(
      shouldContinuePendingPoll({
        pendingHint: true,
        status: 'payment_processing',
        elapsedMs: 30_000,
      }),
    ).toBe(false);
    expect(
      shouldContinuePendingPoll({
        pendingHint: true,
        status: 'paid',
        elapsedMs: 1000,
      }),
    ).toBe(false);
    expect(
      shouldContinuePendingPoll({
        pendingHint: false,
        status: 'open',
        elapsedMs: 0,
      }),
    ).toBe(false);
  });

  it('after poll timeout keeps invoice visible via invoice_loaded', () => {
    expect(
      resolveInvoiceDetailUiState({
        authLoading: false,
        hasSession: true,
        invoiceId: 'inv-1',
        invoiceLoading: false,
        hasInvoice: true,
        paymentStatusPending: true,
        invoiceStatus: 'past_due',
        pollTimedOut: true,
      }),
    ).toBe('invoice_loaded');
  });

  it('keeps paid invoices readable by owner at the domain layer', () => {
    expect(isWorkerInvoicePayable('paid')).toBe(false);
    expect(workerInvoiceStatusLabel('paid')).toBe('Paid');
    expect(
      resolveInvoiceDetailUiState({
        authLoading: false,
        hasSession: true,
        invoiceId: 'inv-1',
        invoiceLoading: false,
        hasInvoice: true,
        paymentStatusPending: false,
        invoiceStatus: 'paid',
        pollTimedOut: false,
      }),
    ).toBe('invoice_loaded');
  });
});
