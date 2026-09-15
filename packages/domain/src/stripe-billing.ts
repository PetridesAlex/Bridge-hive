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
