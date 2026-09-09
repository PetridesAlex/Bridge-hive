import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@bridge-hive/supabase-types';
import { AppState, Platform, type AppStateStatus } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321';
const supabasePublishableKey =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  // Placeholder allows Metro/typecheck without local secrets; real calls need a valid key.
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid';

if (
  !process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY &&
  typeof __DEV__ !== 'undefined' &&
  __DEV__
) {
  console.warn(
    '[supabase] EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY is missing. Auth and data calls will fail until it is set in apps/worker-mobile/.env',
  );
}

/**
 * Web: browser localStorage.
 * Native: AsyncStorage persists the session across launches.
 * detectSessionInUrl is disabled for native.
 */
const authStorage =
  Platform.OS === 'web'
    ? {
        getItem: (key: string) => {
          if (typeof localStorage === 'undefined') return Promise.resolve(null);
          return Promise.resolve(localStorage.getItem(key));
        },
        setItem: (key: string, value: string) => {
          if (typeof localStorage === 'undefined') return Promise.resolve();
          localStorage.setItem(key, value);
          return Promise.resolve();
        },
        removeItem: (key: string) => {
          if (typeof localStorage === 'undefined') return Promise.resolve();
          localStorage.removeItem(key);
          return Promise.resolve();
        },
      }
    : AsyncStorage;

export const supabase = createClient<Database>(supabaseUrl, supabasePublishableKey, {
  auth: {
    storage: authStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state: AppStateStatus) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
