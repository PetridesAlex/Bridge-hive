declare namespace NodeJS {
  interface ProcessEnv {
    EXPO_PUBLIC_SUPABASE_URL: string;
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: string;
    /** Public Bridge Hive web origin for Auth confirm redirects (e.g. https://bridgehive.app). */
    EXPO_PUBLIC_WEB_APP_URL?: string;
    /**
     * Stripe publishable key.
     * Sandbox TestFlight / preview: pk_test_ only.
     * Production: pk_live_ only (when live payments are enabled).
     */
    EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY?: string;
    /**
     * Payment lane for this binary: `sandbox` | `live`.
     * testflight-sandbox sets sandbox; production sets live.
     * Does not authorize sandbox access by itself — server flag required.
     */
    EXPO_PUBLIC_STRIPE_PAYMENTS_MODE?: 'sandbox' | 'live' | string;
  }
}

export {};
