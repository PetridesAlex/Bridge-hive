import { createServerClient } from '@supabase/ssr';
import type { Database } from '@bridge-hive/supabase-types';
import { cookies } from 'next/headers';

import { getSupabaseEnv } from './env';
import {
  isOrgRememberMeEnabled,
  ORG_REMEMBER_ME_COOKIE,
  withOrgRememberMeCookieOptions,
} from './org-remember-me';

export async function createClient(options?: { rememberMe?: boolean }) {
  const cookieStore = await cookies();
  const { url, anonKey } = getSupabaseEnv();
  const remember =
    options?.rememberMe ??
    isOrgRememberMeEnabled(cookieStore.get(ORG_REMEMBER_ME_COOKIE)?.value);

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options: cookieOptions }) => {
            cookieStore.set(
              name,
              value,
              withOrgRememberMeCookieOptions(cookieOptions, remember),
            );
          });
        } catch {
          // Called from a Server Component — middleware will refresh sessions.
        }
      },
    },
  });
}
