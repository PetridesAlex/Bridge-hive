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
  isStripePublishableTestKey,
  isWorkerInvoicePayable,
  normalizeRouteParam,
  parseCheckoutInvoiceId,
  paymentReturnMarksPaid,
  PENDING_CONFIRMATION_MAX_MS,
  PENDING_CONFIRMATION_POLL_MS,
  canStartSandboxPayment,
  parseStripePaymentsMode,
  providerIdsMatchInvoice,
  rejectClientChosenAmount,
  resolveConfiguredStripeMode,
  resolveLiveStripeMode,
  resolveInvoiceDetailUiState,
  resolveSandboxTestSecret,
  sandboxPaymentsReady,
  sandboxStripeConfigured,
  sandboxWebhookTargetsLiveInvoiceTable,
  shouldContinuePendingPoll,
  stripeConfigured,
  stripeEventMatchesMode,
  stripeModeFromSecretKey,
  workerInvoiceStatusLabel,
  WORKER_COMMISSION_DUE_DAYS,
} from '@bridge-hive/domain';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('worker commission money helpers', () => {
  it('defaults to 17% (1700 bps)', () => {
    expect(commissionFromGross(25000)).toBe(4250);
  });

  it('calculates exact 16% when rate is passed explicitly', () => {
    expect(commissionFromGross(25000, 1600)).toBe(4000);
  });

  it('rounds half-up at boundary 10003 → 1600', () => {
    expect(commissionFromGross(10003, 1600)).toBe(1600);
  });

  it('rounds half-up at boundary 10004 → 1601', () => {
    expect(commissionFromGross(10004, 1600)).toBe(1601);
  });

  it('builds hospital-owes-gross snapshot without deducting commission', () => {
    const snap = buildOrganizationPaysGrossSnapshot(25000, 1700);
    expect(snap.workerTransferAmountMinor).toBe(25000);
    expect(snap.organizationTotalDueMinor).toBe(25000);
    expect(snap.commissionAmountMinor).toBe(4250);
    expect(snap.commissionRateBps).toBe(1700);
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

  it('resolves live vs sandbox secrets without cross-wiring', () => {
    expect(stripeModeFromSecretKey('sk_test_abc')).toBe('test');
    expect(stripeModeFromSecretKey('rk_live_abc')).toBe('live');
    expect(stripeModeFromSecretKey('pk_test_abc')).toBeNull();
    expect(
      resolveLiveStripeMode({
        STRIPE_SECRET_KEY: 'sk_live_abc',
      }),
    ).toBe('live');
    expect(
      resolveLiveStripeMode({
        STRIPE_SECRET_KEY: 'sk_live_abc',
        STRIPE_MODE: 'test',
      }),
    ).toBeNull();
    expect(
      resolveConfiguredStripeMode({
        STRIPE_SECRET_KEY: 'sk_test_abc',
        STRIPE_MODE: 'test',
      }),
    ).toBe('test');
    expect(resolveSandboxTestSecret('sk_test_abc')?.mode).toBe('test');
    expect(resolveSandboxTestSecret('sk_live_abc')).toBeNull();
    expect(
      sandboxStripeConfigured({
        STRIPE_TEST_SECRET_KEY: 'sk_test_abc',
        STRIPE_TEST_WEBHOOK_SECRET: 'whsec_x',
      }),
    ).toBe(true);
    expect(
      sandboxStripeConfigured({
        STRIPE_TEST_SECRET_KEY: 'sk_live_abc',
        STRIPE_TEST_WEBHOOK_SECRET: 'whsec_x',
      }),
    ).toBe(false);
    expect(parseStripePaymentsMode('sandbox')).toBe('sandbox');
    expect(parseStripePaymentsMode(undefined)).toBe('live');
  });

  it('documents separately named sandbox functions and secrets', () => {
    const readme = readFileSync(
      join(__dirname, '../../../../../supabase/functions/README.md'),
      'utf8',
    );
    expect(readme).toContain('STRIPE_TEST_SECRET_KEY');
    expect(readme).toContain('STRIPE_TEST_WEBHOOK_SECRET');
    expect(readme).toContain('create-sandbox-worker-invoice-payment-sheet');
    expect(readme).toContain('stripe-test-webhook');
    expect(readme).toContain('STRIPE_SECRET_KEY');
  });

  it('fail-closes sandbox payments until webhook secret exists', () => {
    expect(
      sandboxPaymentsReady({
        STRIPE_TEST_SECRET_KEY: 'sk_test_abc',
        STRIPE_TEST_WEBHOOK_SECRET: '',
      }),
    ).toBe(false);
    expect(
      sandboxPaymentsReady({
        STRIPE_TEST_SECRET_KEY: 'sk_test_abc',
        STRIPE_TEST_WEBHOOK_SECRET: 'whsec_abc',
      }),
    ).toBe(true);
  });

  it('denies unauthorized sandbox access and app-review demo', () => {
    expect(
      canStartSandboxPayment({
        isPaymentSandboxTester: false,
        isAppReviewDemo: false,
        paymentsMode: 'sandbox',
      }),
    ).toBe(false);
    expect(
      canStartSandboxPayment({
        isPaymentSandboxTester: true,
        isAppReviewDemo: true,
        paymentsMode: 'sandbox',
      }),
    ).toBe(false);
    expect(
      canStartSandboxPayment({
        isPaymentSandboxTester: true,
        isAppReviewDemo: false,
        paymentsMode: 'live',
      }),
    ).toBe(false);
    expect(
      canStartSandboxPayment({
        isPaymentSandboxTester: true,
        isAppReviewDemo: false,
        paymentsMode: 'sandbox',
      }),
    ).toBe(true);
  });

  it('keeps sandbox webhook off live invoice tables', () => {
    expect(sandboxWebhookTargetsLiveInvoiceTable('worker_commission_invoices')).toBe(
      true,
    );
    expect(
      sandboxWebhookTargetsLiveInvoiceTable('worker_sandbox_commission_invoices'),
    ).toBe(false);
  });

  it('rejects amount/currency/provider id mismatches and ignores client paid status', () => {
    expect(amountsMatch(4250, 4251)).toBe(false);
    expect(currenciesMatch('EUR', 'USD')).toBe(false);
    expect(
      providerIdsMatchInvoice({
        storedCheckoutSessionId: 'cs_a',
        storedPaymentIntentId: 'pi_a',
        eventCheckoutSessionId: 'cs_b',
        eventPaymentIntentId: 'pi_b',
      }),
    ).toBe(false);
    expect(paymentReturnMarksPaid({ payment_status: 'success' })).toBe(false);
    expect(stripeEventMatchesMode(true, 'test')).toBe(false);
  });

  it('ships sandbox-only migration 041 and defers live hardening', () => {
    const migrationsDir = join(__dirname, '../../../../../supabase/migrations');
    const deferredDir = join(
      __dirname,
      '../../../../../supabase/deferred_migrations',
    );
    const active = readFileSync(
      join(migrationsDir, '041_worker_sandbox_payments.sql'),
      'utf8',
    );
    expect(active).toContain('worker_sandbox_commission_invoices');
    expect(active).toContain('is_payment_sandbox_tester');
    expect(active).toContain('apply_worker_sandbox_invoice_provider_event');
    expect(active).not.toContain('create or replace function public.apply_worker_invoice_provider_event');
    expect(active).not.toContain(
      'create or replace function public.record_worker_invoice_payment_intent',
    );
    expect(active).toContain(
      'create or replace function public.record_worker_sandbox_invoice_payment_intent',
    );
    const deferred = readFileSync(
      join(deferredDir, '042_live_worker_invoice_payment_intent.sql'),
      'utf8',
    );
    expect(deferred).toContain('DEFERRED');
    expect(deferred).toContain('record_worker_invoice_payment_intent');
  });

  it('rejects webhook livemode mismatches', () => {
    expect(stripeEventMatchesMode(false, 'test')).toBe(true);
    expect(stripeEventMatchesMode(true, 'test')).toBe(false);
    expect(stripeEventMatchesMode(true, 'live')).toBe(true);
    expect(stripeEventMatchesMode(false, 'live')).toBe(false);
  });

  it('requires stored provider ids to match before paid apply', () => {
    expect(
      providerIdsMatchInvoice({
        storedCheckoutSessionId: 'cs_1',
        storedPaymentIntentId: null,
        eventCheckoutSessionId: 'cs_1',
        eventPaymentIntentId: 'pi_x',
      }),
    ).toBe(true);
    expect(
      providerIdsMatchInvoice({
        storedCheckoutSessionId: 'cs_1',
        storedPaymentIntentId: 'pi_1',
        eventCheckoutSessionId: 'cs_other',
        eventPaymentIntentId: 'pi_1',
      }),
    ).toBe(true);
    expect(
      providerIdsMatchInvoice({
        storedCheckoutSessionId: 'cs_1',
        storedPaymentIntentId: 'pi_1',
        eventCheckoutSessionId: 'cs_other',
        eventPaymentIntentId: 'pi_other',
      }),
    ).toBe(false);
    expect(isStripePublishableTestKey('pk_test_x')).toBe(true);
    expect(isStripePublishableTestKey('pk_live_x')).toBe(false);
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

  it('disables Supabase JWT verification for live and sandbox Stripe webhooks', () => {
    const configPath = join(
      __dirname,
      '../../../../../supabase/config.toml',
    );
    const toml = readFileSync(configPath, 'utf8');
    expect(toml).toMatch(/\[functions\.stripe-webhook\][\s\S]*?verify_jwt\s*=\s*false/);
    expect(toml).toMatch(/\[functions\.stripe-test-webhook\][\s\S]*?verify_jwt\s*=\s*false/);
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
