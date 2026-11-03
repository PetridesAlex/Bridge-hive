/**
 * Pure helpers for Stripe webhook / checkout validation (no Stripe SDK).
 * Used by unit tests and shared documentation of the server contract.
 */

export type CheckoutRequestBody = {
  invoice_id?: unknown;
  amount?: unknown;
  currency?: unknown;
};

/** Client may send only the internal invoice id. */
export function parseCheckoutInvoiceId(body: CheckoutRequestBody): string | null {
  if (typeof body.invoice_id !== 'string') return null;
  const id = body.invoice_id.trim();
  return id.length > 0 ? id : null;
}

export function rejectClientChosenAmount(body: CheckoutRequestBody): boolean {
  return body.amount !== undefined || body.currency !== undefined;
}

export function amountsMatch(expectedMinor: number, receivedMinor: number | null | undefined): boolean {
  return typeof receivedMinor === 'number' && receivedMinor === expectedMinor;
}

export function currenciesMatch(
  expected: string,
  received: string | null | undefined,
): boolean {
  if (!received) return false;
  return expected.trim().toUpperCase() === received.trim().toUpperCase();
}

export function paymentReturnMarksPaid(_query: { payment_status?: string }): boolean {
  // Redirect alone must never mark an invoice paid.
  return false;
}

export function stripeConfigured(env: {
  STRIPE_SECRET_KEY?: string | null;
  STRIPE_WEBHOOK_SECRET?: string | null;
}): boolean {
  return Boolean(env.STRIPE_SECRET_KEY?.trim() && env.STRIPE_WEBHOOK_SECRET?.trim());
}

export type StripeMode = 'test' | 'live';

/** Infer Stripe mode from secret/restricted key prefix. */
export function stripeModeFromSecretKey(
  secretKey: string | null | undefined,
): StripeMode | null {
  const key = secretKey?.trim() ?? '';
  if (key.startsWith('sk_test_') || key.startsWith('rk_test_')) return 'test';
  if (key.startsWith('sk_live_') || key.startsWith('rk_live_')) return 'live';
  return null;
}

export function parseStripeMode(
  value: string | null | undefined,
): StripeMode | null {
  const normalized = value?.trim().toLowerCase();
  if (normalized === 'test' || normalized === 'live') return normalized;
  return null;
}

/**
 * Live payment secrets: STRIPE_SECRET_KEY (+ optional STRIPE_MODE).
 * If STRIPE_MODE is unset, mode is inferred from the key prefix.
 */
export function resolveLiveStripeMode(env: {
  STRIPE_SECRET_KEY?: string | null;
  STRIPE_MODE?: string | null;
}): StripeMode | null {
  const fromKey = stripeModeFromSecretKey(env.STRIPE_SECRET_KEY);
  if (!fromKey) return null;
  const configured = parseStripeMode(env.STRIPE_MODE);
  if (configured && configured !== fromKey) return null;
  return fromKey;
}

/**
 * Sandbox secrets on the same Supabase project: STRIPE_TEST_SECRET_KEY only.
 * Must be sk_test_ / rk_test_. Never treat live STRIPE_SECRET_KEY as sandbox.
 */
export function resolveSandboxTestSecret(
  testSecretKey: string | null | undefined,
): { key: string; mode: 'test' } | null {
  const key = testSecretKey?.trim() ?? '';
  if (!key) return null;
  if (stripeModeFromSecretKey(key) !== 'test') return null;
  return { key, mode: 'test' };
}

export function sandboxStripeConfigured(env: {
  STRIPE_TEST_SECRET_KEY?: string | null;
  STRIPE_TEST_WEBHOOK_SECRET?: string | null;
}): boolean {
  return Boolean(
    resolveSandboxTestSecret(env.STRIPE_TEST_SECRET_KEY) &&
      env.STRIPE_TEST_WEBHOOK_SECRET?.trim(),
  );
}

/**
 * Sandbox PaymentSheet/Checkout must fail closed until BOTH test secrets exist.
 * Prevents charging before stripe-test-webhook can confirm payment.
 */
export function sandboxPaymentsReady(env: {
  STRIPE_TEST_SECRET_KEY?: string | null;
  STRIPE_TEST_WEBHOOK_SECRET?: string | null;
}): boolean {
  return sandboxStripeConfigured(env);
}

/** Sandbox webhook must never apply to live invoice tables. */
export function sandboxWebhookTargetsLiveInvoiceTable(
  tableName: string | null | undefined,
): boolean {
  return tableName === 'worker_commission_invoices';
}

/**
 * Authorize sandbox payment start: server tester flag required.
 * Client mode / email / pk_test_ alone are insufficient.
 */
export function canStartSandboxPayment(args: {
  isPaymentSandboxTester: boolean;
  isAppReviewDemo: boolean;
  paymentsMode: StripePaymentsMode;
}): boolean {
  if (args.isAppReviewDemo) return false;
  if (args.paymentsMode !== 'sandbox') return false;
  return args.isPaymentSandboxTester === true;
}

/** Client build payment lane: sandbox TestFlight vs live production. */
export type StripePaymentsMode = 'sandbox' | 'live';

export function parseStripePaymentsMode(
  value: string | null | undefined,
): StripePaymentsMode {
  return value?.trim().toLowerCase() === 'sandbox' ? 'sandbox' : 'live';
}

/**
 * @deprecated Prefer resolveLiveStripeMode. Kept for existing unit tests.
 * Requires explicit STRIPE_MODE matching the key.
 */
export function resolveConfiguredStripeMode(env: {
  STRIPE_SECRET_KEY?: string | null;
  STRIPE_MODE?: string | null;
}): StripeMode | null {
  const configured = parseStripeMode(env.STRIPE_MODE);
  const fromKey = stripeModeFromSecretKey(env.STRIPE_SECRET_KEY);
  if (!configured || !fromKey) return null;
  if (configured !== fromKey) return null;
  return configured;
}

/** Webhook events must match the function's configured mode. */
export function stripeEventMatchesMode(
  livemode: boolean,
  configuredMode: StripeMode,
): boolean {
  return livemode === (configuredMode === 'live');
}

/** Publishable key is test when it starts with pk_test_. */
export function isStripePublishableTestKey(
  publishableKey: string | null | undefined,
): boolean {
  return Boolean(publishableKey?.trim().startsWith('pk_test_'));
}

/** PaymentIntent / Checkout Session idempotency for PaymentSheet. */
export function paymentIntentIdempotencyKey(
  invoiceId: string,
  priorPaymentIntentId: string | null | undefined,
  priorIntentStatus: string | null | undefined,
): string {
  if (
    priorPaymentIntentId &&
    priorIntentStatus &&
    priorIntentStatus !== 'requires_payment_method' &&
    priorIntentStatus !== 'requires_confirmation' &&
    priorIntentStatus !== 'requires_action'
  ) {
    return `invoice-pi-${invoiceId}-${priorPaymentIntentId}`;
  }
  if (priorPaymentIntentId && !priorIntentStatus) {
    return `invoice-pi-${invoiceId}-${priorPaymentIntentId}`;
  }
  return `invoice-pi-${invoiceId}-v1`;
}

/**
 * Paid apply requires the provider id on the event to match the id stored
 * when checkout / PaymentSheet was initiated.
 */
export function providerIdsMatchInvoice(args: {
  storedCheckoutSessionId: string | null | undefined;
  storedPaymentIntentId: string | null | undefined;
  eventCheckoutSessionId: string | null | undefined;
  eventPaymentIntentId: string | null | undefined;
}): boolean {
  const sessionOk = Boolean(
    args.eventCheckoutSessionId &&
      args.storedCheckoutSessionId &&
      args.eventCheckoutSessionId === args.storedCheckoutSessionId,
  );
  const piOk = Boolean(
    args.eventPaymentIntentId &&
      args.storedPaymentIntentId &&
      args.eventPaymentIntentId === args.storedPaymentIntentId,
  );
  return sessionOk || piOk;
}

/**
 * Normalize Expo Router / deep-link params so query fragments never pollute IDs.
 */
export function normalizeRouteParam(
  value: string | string[] | undefined | null,
): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== 'string') return null;
  const cleaned = raw.split(/[?#]/, 1)[0]?.trim() ?? '';
  return cleaned.length > 0 ? cleaned : null;
}

/** Unpaid Checkout completions must not be mapped to paid apply event types. */
export function checkoutSessionMapsToPaidApply(
  paymentStatus: string | null | undefined,
): boolean {
  return paymentStatus === 'paid';
}

/** Localhost always allowed; extra origins must match by URL origin. */
export function isAllowedCheckoutOrigin(
  appPublicUrl: string,
  extraAllowed: string[] = [],
): boolean {
  let parsed: URL;
  try {
    parsed = new URL(appPublicUrl);
  } catch {
    return false;
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return false;
  }

  if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
    return true;
  }

  return extraAllowed.some((entry) => {
    try {
      return new URL(entry).origin === parsed.origin;
    } catch {
      return entry === parsed.origin;
    }
  });
}

/**
 * Rotate Checkout idempotency when a prior session is no longer open,
 * so expiry cannot permanently block a new session.
 */
export function checkoutIdempotencyKey(
  invoiceId: string,
  priorCheckoutSessionId: string | null | undefined,
  priorSessionStatus: string | null | undefined,
): string {
  if (
    priorCheckoutSessionId &&
    priorSessionStatus &&
    priorSessionStatus !== 'open'
  ) {
    return `invoice-checkout-${invoiceId}-${priorCheckoutSessionId}`;
  }
  if (priorCheckoutSessionId && !priorSessionStatus) {
    // Session retrieve failed — treat as not reusable.
    return `invoice-checkout-${invoiceId}-${priorCheckoutSessionId}`;
  }
  return `invoice-checkout-${invoiceId}-v1`;
}

/** Bounded pending-confirmation poll (return URL never marks paid). */
export const PENDING_CONFIRMATION_POLL_MS = 2000;
export const PENDING_CONFIRMATION_MAX_MS = 30_000;

export type InvoiceDetailUiState =
  | 'auth_loading'
  | 'sign_in_required'
  | 'invoice_loading'
  | 'payment_confirmation_pending'
  | 'invoice_loaded'
  | 'invoice_not_found'
  | 'authorization_denied'
  | 'query_error'
  | 'offline';

export type InvoiceDetailUiInput = {
  authLoading: boolean;
  hasSession: boolean;
  invoiceId: string | null;
  invoiceLoading: boolean;
  hasInvoice: boolean;
  error?: string | null;
  paymentStatusPending: boolean;
  invoiceStatus?: string | null;
  pollTimedOut: boolean;
  offline?: boolean;
  authorizationDenied?: boolean;
};

/**
 * Finite UI state for the worker invoice detail / Checkout return screen.
 * Never leaves the user on an unbounded full-page spinner.
 */
export function resolveInvoiceDetailUiState(
  input: InvoiceDetailUiInput,
): InvoiceDetailUiState {
  if (input.offline) return 'offline';
  if (input.authLoading) return 'auth_loading';
  if (!input.hasSession) return 'sign_in_required';
  if (!input.invoiceId) return 'invoice_not_found';
  if (input.authorizationDenied) return 'authorization_denied';
  if (input.error && !input.hasInvoice) return 'query_error';
  if (input.invoiceLoading && !input.hasInvoice) return 'invoice_loading';
  if (!input.hasInvoice) return 'invoice_not_found';

  const pendingHint =
    input.paymentStatusPending &&
    input.invoiceStatus !== 'paid' &&
    input.invoiceStatus !== 'void' &&
    input.invoiceStatus !== 'uncollectible';

  if (pendingHint && !input.pollTimedOut) {
    return 'payment_confirmation_pending';
  }

  return 'invoice_loaded';
}

export function shouldContinuePendingPoll(input: {
  pendingHint: boolean;
  status?: string | null;
  elapsedMs: number;
  maxMs?: number;
}): boolean {
  if (!input.pendingHint) return false;
  if (
    input.status === 'paid' ||
    input.status === 'void' ||
    input.status === 'uncollectible'
  ) {
    return false;
  }
  const max = input.maxMs ?? PENDING_CONFIRMATION_MAX_MS;
  return input.elapsedMs < max;
}

export const PAYMENT_CONFIRMATION_SLOW =
  'Confirmation is taking longer than expected';
