// delete-worker-account
// Authenticated worker self-service account deletion.
// Derives the target UUID from the verified JWT only — never from client body.
// Auth Admin runs only after owned-file cleanup. The ledger is marked completed
// only after Auth removal is confirmed. Not deployed.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

import { gateDeletionRequest } from './reauth-gate.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

const OWNED_WORKER_STORAGE_BUCKETS = [
  'credentials',
  'worker-avatars',
  'payout-proofs',
  'profile-avatars',
] as const;

const NOT_DELETED_WITH_WORKER = [
  'organization-logos',
  'location-images',
  'recruitment-documents',
] as const;

type PrepareResult = {
  status?: string;
  request_id?: string;
  worker_id?: string;
  blockers?: unknown[];
  hard_delete_allowed?: boolean;
};

const PERSONAL_PHOTO_BUCKETS = ['worker-avatars', 'profile-avatars'] as const;

const LIST_PAGE = 100;
const REMOVE_BATCH = 100;
const LIST_CAP = 10000;

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function unfinished(extra: Record<string, unknown>) {
  return {
    financial_records_erased: false,
    messages_deleted: false,
    not_deleted: [...NOT_DELETED_WITH_WORKER],
    completion: 'unfinished',
    ...extra,
  };
}

type StorageEntry = { name?: string | null; id?: string | null };

async function listPage(
  admin: ReturnType<typeof createClient>,
  bucket: string,
  prefix: string,
  offset: number,
): Promise<StorageEntry[]> {
  const { data, error } = await admin.storage.from(bucket).list(prefix, {
    limit: LIST_PAGE,
    offset,
  });
  if (error) {
    if (/not found|does not exist/i.test(error.message)) return [];
    throw new Error(`storage_list_failed:${bucket}`);
  }
  return (data ?? []) as StorageEntry[];
}

async function listOwnedObjectPaths(
  admin: ReturnType<typeof createClient>,
  bucket: string,
  userId: string,
): Promise<string[]> {
  const paths: string[] = [];

  async function walk(prefix: string, depth: number): Promise<void> {
    if (depth > 4) throw new Error(`storage_list_incomplete:${bucket}`);
    let offset = 0;
    for (;;) {
      if (offset >= LIST_CAP) throw new Error(`storage_list_incomplete:${bucket}`);
      const page = await listPage(admin, bucket, prefix, offset);
      for (const entry of page) {
        if (!entry.name || entry.name === '.' || entry.name === '..') continue;
        const child = `${prefix}/${entry.name}`;
        if (!entry.id) {
          await walk(child, depth + 1);
        } else {
          paths.push(child);
        }
      }
      if (page.length < LIST_PAGE) return;
      offset += LIST_PAGE;
    }
  }

  await walk(userId, 0);
  return paths;
}

async function revokeServerSessions(
  admin: ReturnType<typeof createClient>,
  accessToken: string,
) {
  const { error } = await admin.auth.admin.signOut(accessToken, 'global');
  if (error) throw new Error('session_revoke_failed');
}

async function removeOwnedStorage(
  admin: ReturnType<typeof createClient>,
  userId: string,
  buckets: readonly string[],
) {
  const removed: Array<{ bucket: string; count: number }> = [];
  for (const bucket of buckets) {
    const paths = await listOwnedObjectPaths(admin, bucket, userId);
    for (let index = 0; index < paths.length; index += REMOVE_BATCH) {
      const batch = paths.slice(index, index + REMOVE_BATCH);
      const { error: removeError } = await admin.storage.from(bucket).remove(batch);
      if (removeError) throw new Error(`storage_remove_failed:${bucket}`);
    }
    const remaining = await listOwnedObjectPaths(admin, bucket, userId);
    if (remaining.length > 0) throw new Error(`storage_cleanup_incomplete:${bucket}`);
    if (paths.length > 0) removed.push({ bucket, count: paths.length });
  }
  return removed;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json({ error: 'method_not_allowed' }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnon = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseAnon || !serviceRole) {
      return json({ error: 'misconfigured', message: 'Deletion is temporarily unavailable.' }, 503);
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json({ error: 'unauthorized' }, 401);
    }

    let body: { client_request_id?: string } = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const userClient = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    const gate = gateDeletionRequest({
      method: req.method,
      hasServiceConfig: true,
      authorization: authHeader,
      body,
      user: userError || !user ? null : { id: user.id, is_anonymous: user.is_anonymous },
      userLookupFailed: Boolean(userError || !user),
      nowSec: Math.floor(Date.now() / 1000),
    });
    if (!gate.proceed) {
      return json(gate.body, gate.status);
    }
    const clientRequestId = gate.clientRequestId;
    const accessToken = gate.accessToken;
    const userId = gate.userId;

    const { data: demoProfile } = await userClient
      .from('worker_profiles')
      .select('is_app_review_demo')
      .eq('user_id', userId)
      .maybeSingle();

    if (demoProfile?.is_app_review_demo === true) {
      return json(
        {
          error: 'app_review_demo_forbidden',
          message: 'Demonstration accounts cannot be deleted from the app.',
        },
        403,
      );
    }

    const { data: preparedRaw, error: prepareError } = await userClient.rpc(
      'prepare_my_worker_account_deletion',
      { p_client_request_id: clientRequestId },
    );

    if (prepareError) {
      const message = prepareError.message || '';
      if (message.includes('APP_REVIEW_DEMO_FORBIDDEN')) {
        return json({ error: 'app_review_demo_forbidden' }, 403);
      }
      if (message.includes('NOT_AUTHENTICATED')) {
        return json({ error: 'unauthorized' }, 401);
      }
      return json(
        unfinished({
          error: 'prepare_failed',
          message: 'Could not prepare account deletion. Please try again.',
        }),
        500,
      );
    }

    const prepared = preparedRaw as PrepareResult;
    if (prepared.worker_id && prepared.worker_id !== userId) {
      return json({ error: 'cross_user_forbidden' }, 403);
    }

    if (prepared.status === 'completed') {
      return json({
        status: 'completed',
        request_id: prepared.request_id,
        message: 'Your account has already been deleted.',
        financial_records_erased: false,
        messages_deleted: false,
        not_deleted: [...NOT_DELETED_WITH_WORKER],
        jwt_note:
          'Refresh sessions are removed with Auth. Already-issued access tokens may remain valid until expiry.',
      });
    }

    const admin = createClient(supabaseUrl, serviceRole, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    if (prepared.status === 'requested_pending_review' || prepared.status !== 'ready_for_auth_delete') {
      try {
        await revokeServerSessions(admin, accessToken);
        await removeOwnedStorage(admin, userId, PERSONAL_PHOTO_BUCKETS);
      } catch {
        return json(
          unfinished({
            error: 'pending_cleanup_failed',
            status: 'partial_failure',
            request_id: prepared.request_id,
            blockers: prepared.blockers ?? [],
            message:
              'Deletion is not complete. Photo or session cleanup did not finish. Messages, invoices, payouts, organization logos, location images, and recruitment files were not deleted.',
          }),
          500,
        );
      }
      return json(
        unfinished({
          status: 'deletion_requested',
          request_id: prepared.request_id,
          blockers: prepared.blockers ?? [],
          auth_deleted: false,
          message:
            'Deletion is not complete. Server sessions were revoked and profile photos under this account were removed. Messages, invoices, and payouts were not erased. Credential files and payout proofs were kept. Organization logos and location images were not deleted. Recruitment files were not deleted because no verified owner link exists. Legal retention and deletion-after-restore safeguards are unresolved. No retention period is applied.',
        }),
      );
    }

    try {
      await removeOwnedStorage(admin, userId, OWNED_WORKER_STORAGE_BUCKETS);
    } catch {
      return json(
        unfinished({
          error: 'storage_cleanup_failed',
          status: 'partial_failure',
          request_id: prepared.request_id,
          message:
            'Could not finish removing your uploaded files. Deletion is not complete. Retry the same request.',
        }),
        500,
      );
    }

    try {
      await revokeServerSessions(admin, accessToken);
    } catch {
      return json(
        unfinished({
          error: 'session_revoke_failed',
          status: 'partial_failure',
          request_id: prepared.request_id,
          message:
            'Owned files were removed but server sessions were not revoked. Deletion is not complete.',
        }),
        500,
      );
    }

    const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
    if (deleteError && !/not found/i.test(deleteError.message)) {
      return json(
        unfinished({
          error: 'auth_delete_failed',
          status: 'partial_failure',
          request_id: prepared.request_id,
          message:
            'File cleanup finished but Auth removal failed. Deletion is not complete. Retry the same request.',
        }),
        500,
      );
    }

    const { error: finalizeError } = await admin.rpc('finalize_worker_account_deletion', {
      p_worker_id: userId,
      p_client_request_id: clientRequestId,
    });
    if (finalizeError) {
      return json(
        unfinished({
          error: 'finalize_failed',
          status: 'partial_failure',
          request_id: prepared.request_id,
          message:
            'Auth removal was attempted but completion was not recorded. Deletion is not reported complete. Retry the same request.',
        }),
        500,
      );
    }

    return json({
      status: 'completed',
      request_id: prepared.request_id,
      message: 'Your account has been deleted.',
      financial_records_erased: false,
      messages_deleted: false,
      not_deleted: [...NOT_DELETED_WITH_WORKER],
      jwt_note:
        'Refresh sessions are removed with Auth. Already-issued access tokens may remain valid until expiry.',
    });
  } catch {
    return json(
      unfinished({
        error: 'unexpected',
        message: 'Account deletion failed unexpectedly. Deletion is not complete. Please try again.',
      }),
      500,
    );
  }
});
