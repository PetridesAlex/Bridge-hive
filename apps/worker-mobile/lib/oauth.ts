import {
  isAllowedWorkerOAuthRedirectUri,
  WORKER_OAUTH_CALLBACK_PATH,
  workerGoogleOAuthCancelMessage,
  workerGoogleOAuthErrorMessage,
} from '@bridge-hive/domain';
import { makeRedirectUri } from 'expo-auth-session';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

WebBrowser.maybeCompleteAuthSession();

let oauthInFlight = false;
let sessionExchangeInFlight: Promise<{ error?: string }> | null = null;
const consumedAuthCodes = new Set<string>();
const CONSUMED_CODE_CAP = 32;

function rememberConsumedCode(code: string) {
  consumedAuthCodes.add(code);
  if (consumedAuthCodes.size > CONSUMED_CODE_CAP) {
    const first = consumedAuthCodes.values().next().value;
    if (first) consumedAuthCodes.delete(first);
  }
}

function isBenignExchangeFailure(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes('already') ||
    lower.includes('code verifier') ||
    lower.includes('flow state') ||
    lower.includes('invalid flow') ||
    lower.includes('auth code not found') ||
    lower.includes('expired') ||
    lower.includes('invalid request')
  );
}

function mapExchangeFailure(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('provider') && lower.includes('disabled')) {
    return workerGoogleOAuthErrorMessage('provider_disabled');
  }
  if (lower.includes('redirect')) {
    return workerGoogleOAuthErrorMessage('redirect_mismatch');
  }
  return workerGoogleOAuthErrorMessage('session_not_established');
}

/** Clear OAuth query/hash from the address bar after a successful web return. */
function scrubCallbackUrlFromHistory() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  try {
    const path = window.location.pathname || WORKER_OAUTH_CALLBACK_PATH;
    window.history.replaceState({}, '', path);
  } catch {
    // ignore
  }
}

export function getWorkerOAuthRedirectTo(): string {
  let redirectTo: string;
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.origin) {
    redirectTo = `${window.location.origin}${WORKER_OAUTH_CALLBACK_PATH}`;
  } else {
    redirectTo = makeRedirectUri({
      scheme: 'bridgehive',
      path: WORKER_OAUTH_CALLBACK_PATH.replace(/^\//, ''),
    });
  }
  if (!isAllowedWorkerOAuthRedirectUri(redirectTo)) {
    throw new Error('redirect_mismatch');
  }
  return redirectTo;
}

/**
 * Establish exactly one session from an OAuth return URL (PKCE code or tokens).
 * Safe to call from warm/cold deep links and Expo web; concurrent / repeat calls
 * share one flight and never re-exchange a consumed code (avoids redbox on web).
 */
export async function createSessionFromUrl(url: string): Promise<{ error?: string }> {
  if (!url || !url.includes('auth/callback')) {
    return {};
  }

  if (sessionExchangeInFlight) {
    return sessionExchangeInFlight;
  }

  sessionExchangeInFlight = (async (): Promise<{ error?: string }> => {
    try {
      const { data: existing } = await supabase.auth.getSession();
      if (existing.session) {
        scrubCallbackUrlFromHistory();
        return {};
      }

      const { params, errorCode } = QueryParams.getQueryParams(url);
      if (errorCode) {
        return { error: mapExchangeFailure(String(errorCode)) };
      }

      const errorDescription =
        typeof params.error_description === 'string'
          ? params.error_description
          : typeof params.error === 'string'
            ? params.error
            : null;
      if (errorDescription) {
        return { error: mapExchangeFailure(errorDescription) };
      }

      const code = typeof params.code === 'string' ? params.code : null;
      if (code) {
        if (consumedAuthCodes.has(code)) {
          const { data } = await supabase.auth.getSession();
          if (data.session) {
            scrubCallbackUrlFromHistory();
            return {};
          }
          // Code already attempted — do not exchange again (would redbox / 400).
          return { error: workerGoogleOAuthErrorMessage('session_not_established') };
        }

        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          rememberConsumedCode(code);
          const { data } = await supabase.auth.getSession();
          if (data.session) {
            scrubCallbackUrlFromHistory();
            return {};
          }
          if (isBenignExchangeFailure(error.message)) {
            return { error: mapExchangeFailure(error.message) };
          }
          return { error: mapExchangeFailure(error.message) };
        }
        rememberConsumedCode(code);
        scrubCallbackUrlFromHistory();
        return {};
      }

      const access_token =
        typeof params.access_token === 'string' ? params.access_token : null;
      const refresh_token =
        typeof params.refresh_token === 'string' ? params.refresh_token : null;
      if (access_token && refresh_token) {
        const { error } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });
        if (error) {
          const { data } = await supabase.auth.getSession();
          if (data.session) {
            scrubCallbackUrlFromHistory();
            return {};
          }
          return { error: mapExchangeFailure(error.message) };
        }
        scrubCallbackUrlFromHistory();
        return {};
      }

      // No credentials in URL — wait briefly for another handler / auth event.
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        scrubCallbackUrlFromHistory();
        return {};
      }
      return {};
    } catch (e) {
      const message = e instanceof Error ? e.message : 'session_not_established';
      const { data } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
      if (data.session) {
        scrubCallbackUrlFromHistory();
        return {};
      }
      return { error: mapExchangeFailure(message) };
    }
  })();

  try {
    return await sessionExchangeInFlight;
  } finally {
    sessionExchangeInFlight = null;
  }
}

export async function signInWithGoogleOAuth(): Promise<{ error?: string; cancelled?: boolean }> {
  if (oauthInFlight) {
    return { error: 'Google sign-in is already in progress.' };
  }
  oauthInFlight = true;

  try {
    const redirectTo = getWorkerOAuthRedirectTo();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        skipBrowserRedirect: true,
        scopes: 'openid email profile',
        queryParams: {
          access_type: 'offline',
          prompt: 'select_account',
        },
      },
    });

    if (error) {
      const lower = error.message.toLowerCase();
      if (lower.includes('provider') || lower.includes('disabled') || lower.includes('not enabled')) {
        return { error: workerGoogleOAuthErrorMessage('provider_disabled') };
      }
      return { error: workerGoogleOAuthErrorMessage('default') };
    }

    if (!data.url) {
      return { error: workerGoogleOAuthErrorMessage('default') };
    }

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

    if (result.type === 'cancel' || result.type === 'dismiss') {
      return { cancelled: true, error: workerGoogleOAuthCancelMessage() };
    }

    if (result.type !== 'success' || !('url' in result) || !result.url) {
      return { error: workerGoogleOAuthErrorMessage('default') };
    }

    return createSessionFromUrl(result.url);
  } catch (e) {
    const message = e instanceof Error ? e.message : '';
    if (message === 'redirect_mismatch') {
      return { error: workerGoogleOAuthErrorMessage('redirect_mismatch') };
    }
    return { error: workerGoogleOAuthErrorMessage('default') };
  } finally {
    oauthInFlight = false;
  }
}
