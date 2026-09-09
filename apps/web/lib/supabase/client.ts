import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@bridge-hive/supabase-types';

import { getSupabaseEnv } from './env';

export function createClient() {
  const { url, anonKey } = getSupabaseEnv();
  return createBrowserClient<Database>(url, anonKey);
}
