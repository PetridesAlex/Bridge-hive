declare namespace NodeJS {
  interface ProcessEnv {
    EXPO_PUBLIC_SUPABASE_URL: string;
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: string;
    /** Public Bridge Hive web origin for Auth confirm redirects (e.g. https://bridgehive.app). */
    EXPO_PUBLIC_WEB_APP_URL?: string;
  }
}

export {};
