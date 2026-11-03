// Shared Stripe live/test helpers for Edge Functions.
// Keep in sync with packages/domain/src/stripe-billing.ts.

export type StripeMode = 'test' | 'live';

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
 * Live payment functions: STRIPE_SECRET_KEY (+ optional STRIPE_MODE).
 * If STRIPE_MODE is unset, mode is inferred from the key prefix.
 * Never reads STRIPE_TEST_* secrets.
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
 * Sandbox payment functions: STRIPE_TEST_SECRET_KEY only.
 * Must be a test secret/restricted key. Never reads STRIPE_SECRET_KEY.
 */
export function resolveSandboxTestSecret(
  testSecretKey: string | null | undefined,
): { key: string; mode: 'test' } | null {
  const key = testSecretKey?.trim() ?? '';
  if (!key) return null;
  if (stripeModeFromSecretKey(key) !== 'test') return null;
  return { key, mode: 'test' };
}

/**
 * Fail closed: both STRIPE_TEST_SECRET_KEY and STRIPE_TEST_WEBHOOK_SECRET
 * must be present before sandbox Checkout/PaymentSheet may start.
 */
export function resolveSandboxPaymentSecrets(env: {
  STRIPE_TEST_SECRET_KEY?: string | null;
  STRIPE_TEST_WEBHOOK_SECRET?: string | null;
}): { key: string; mode: 'test'; webhookSecret: string } | null {
  const resolved = resolveSandboxTestSecret(env.STRIPE_TEST_SECRET_KEY);
  const webhookSecret = env.STRIPE_TEST_WEBHOOK_SECRET?.trim() ?? '';
  if (!resolved || !webhookSecret) return null;
  return { ...resolved, webhookSecret };
}

export function stripeEventMatchesMode(
  livemode: boolean,
  configuredMode: StripeMode,
): boolean {
  return livemode === (configuredMode === 'live');
}

export function paymentIntentIdempotencyKey(
  invoiceId: string,
  priorPaymentIntentId: string | null | undefined,
  priorIntentStatus: string | null | undefined,
  prefix = 'invoice-pi',
): string {
  if (
    priorPaymentIntentId &&
    priorIntentStatus &&
    priorIntentStatus !== 'requires_payment_method' &&
    priorIntentStatus !== 'requires_confirmation' &&
    priorIntentStatus !== 'requires_action'
  ) {
    return `${prefix}-${invoiceId}-${priorPaymentIntentId}`;
  }
  if (priorPaymentIntentId && !priorIntentStatus) {
    return `${prefix}-${invoiceId}-${priorPaymentIntentId}`;
  }
  return `${prefix}-${invoiceId}-v1`;
}

/** @deprecated Prefer resolveLiveStripeMode or resolveSandboxTestSecret. */
export function resolveConfiguredStripeMode(env: {
  STRIPE_SECRET_KEY?: string | null;
  STRIPE_MODE?: string | null;
}): StripeMode | null {
  return resolveLiveStripeMode(env);
}
