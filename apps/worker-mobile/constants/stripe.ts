import { parseStripePaymentsMode } from '@bridge-hive/domain';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';

/** Apple Pay merchant id — must match app.json Stripe plugin + Apple Developer. */
export const STRIPE_MERCHANT_IDENTIFIER = 'merchant.com.bridgehive.worker';

/** ISO country for Apple Pay / Google Pay (Cyprus). */
export const STRIPE_MERCHANT_COUNTRY_CODE = 'CY';

export function getStripePublishableKey(): string | null {
  const key = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim();
  return key && key.length > 0 ? key : null;
}

/** Build-time lane. Production builds stay `live` (default). */
export function getStripePaymentsMode(): 'sandbox' | 'live' {
  return parseStripePaymentsMode(process.env.EXPO_PUBLIC_STRIPE_PAYMENTS_MODE);
}

export function isSandboxPaymentsBuild(): boolean {
  return getStripePaymentsMode() === 'sandbox';
}

export function isStripePaymentsConfigured(): boolean {
  const key = getStripePublishableKey();
  if (!key) return false;
  if (isSandboxPaymentsBuild()) {
    return key.startsWith('pk_test_');
  }
  // Production lane must not use a test publishable key.
  return key.startsWith('pk_live_');
}

export function isStripeTestPublishableKey(): boolean {
  return Boolean(getStripePublishableKey()?.startsWith('pk_test_'));
}

export function getStripeUrlScheme(): string {
  return Constants.appOwnership === 'expo'
    ? Linking.createURL('/--/')
    : Linking.createURL('');
}

export function getPaymentSheetReturnUrl(invoiceId: string): string {
  return Linking.createURL(`/invoices/${invoiceId}`);
}

export function getPaymentSheetFunctionName(): string {
  return isSandboxPaymentsBuild()
    ? 'create-sandbox-worker-invoice-payment-sheet'
    : 'create-worker-invoice-payment-sheet';
}

export function getCheckoutFunctionName(): string {
  return isSandboxPaymentsBuild()
    ? 'create-sandbox-worker-invoice-checkout'
    : 'create-worker-invoice-checkout';
}
