import React, { type ReactNode } from 'react';

/** Web stub — native Stripe SDK is not available in Expo web. */
export function StripeProvider({
  children,
}: {
  children?: ReactNode;
  publishableKey?: string;
  merchantIdentifier?: string;
  urlScheme?: string;
}) {
  return React.createElement(React.Fragment, null, children);
}

export function useStripe() {
  return {
    initPaymentSheet: async () => ({
      error: {
        code: 'Canceled' as const,
        message: 'Payment Sheet is only available in the native app.',
      },
    }),
    presentPaymentSheet: async () => ({
      error: {
        code: 'Canceled' as const,
        message: 'Payment Sheet is only available in the native app.',
      },
    }),
  };
}
