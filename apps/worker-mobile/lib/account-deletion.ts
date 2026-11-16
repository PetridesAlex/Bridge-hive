import { supabase } from '@/lib/supabase';

export type AccountDeletionStatus =
  | 'completed'
  | 'deletion_requested'
  | 'partial_failure'
  | 'error';

export type AccountDeletionResult = {
  status: AccountDeletionStatus;
  requestId?: string;
  message?: string;
  error?: string;
  blockers?: unknown[];
  jwtNote?: string;
};

export type AuthProviderKind = 'email' | 'google' | 'unknown';

export function detectAuthProviderKind(user: {
  app_metadata?: Record<string, unknown> | null;
  identities?: { provider?: string }[] | null;
} | null | undefined): AuthProviderKind {
  const identities = user?.identities ?? [];
  const providers = new Set(
    identities
      .map((i) => (i.provider || '').toLowerCase())
      .filter(Boolean),
  );
  if (providers.has('google') && !providers.has('email')) return 'google';
  if (providers.has('google') && providers.has('email')) return 'google';
  if (providers.has('email')) return 'email';
  const meta = String(user?.app_metadata?.provider || '').toLowerCase();
  if (meta === 'google') return 'google';
  if (meta === 'email') return 'email';
  return 'unknown';
}

export function createDeletionClientRequestId(): string {
  const cryptoObj = globalThis.crypto as { randomUUID?: () => string } | undefined;
  if (cryptoObj?.randomUUID) return cryptoObj.randomUUID();
  // Fallback UUID v4 for environments without Web Crypto randomUUID.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function requestWorkerAccountDeletion(
  clientRequestId: string,
): Promise<AccountDeletionResult> {
  const { data, error } = await supabase.functions.invoke('delete-worker-account', {
    body: { client_request_id: clientRequestId },
  });

  if (error) {
    return {
      status: 'error',
      error: 'request_failed',
      message: 'Could not reach the deletion service. Please try again.',
    };
  }

  const payload = (data ?? {}) as {
    status?: string;
    request_id?: string;
    message?: string;
    error?: string;
    blockers?: unknown[];
    jwt_note?: string;
  };

  if (payload.status === 'completed') {
    return {
      status: 'completed',
      requestId: payload.request_id,
      message: payload.message,
      jwtNote: payload.jwt_note,
    };
  }

  if (payload.status === 'deletion_requested') {
    return {
      status: 'deletion_requested',
      requestId: payload.request_id,
      message: payload.message,
      blockers: payload.blockers,
    };
  }

  if (payload.status === 'partial_failure' || payload.error) {
    return {
      status: payload.status === 'partial_failure' ? 'partial_failure' : 'error',
      requestId: payload.request_id,
      error: payload.error,
      message: payload.message ?? 'Account deletion did not complete.',
      blockers: payload.blockers,
    };
  }

  return {
    status: 'error',
    error: 'unexpected',
    message: 'Account deletion did not complete.',
  };
}
