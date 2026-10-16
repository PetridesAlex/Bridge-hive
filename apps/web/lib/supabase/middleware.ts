import { createServerClient } from '@supabase/ssr';
import type { Database } from '@bridge-hive/supabase-types';
import { NextResponse, type NextRequest } from 'next/server';

import { getSupabaseEnv } from './env';
import {
  isOrgRememberMeEnabled,
  ORG_REMEMBER_ME_COOKIE,
  withOrgRememberMeCookieOptions,
} from './org-remember-me';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const { url, anonKey } = getSupabaseEnv();
  const remember = isOrgRememberMeEnabled(
    request.cookies.get(ORG_REMEMBER_ME_COOKIE)?.value,
  );

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(
            name,
            value,
            withOrgRememberMeCookieOptions(options, remember),
          );
        });
      },
    },
  });

  // Refresh session — important for Server Components.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabaseResponse, user };
}
