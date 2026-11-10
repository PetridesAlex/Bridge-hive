import {
  isWorkerRole,
  workerFolderLabel,
  type WorkerRole,
} from '@bridge-hive/domain';

import { serializeApplicationQueueCard } from '@/lib/admin/labels';
import { resolveWorkerFolderSort } from '@/lib/admin/worker-folder-sort';
import { createClient } from '@/lib/supabase/server';

export { resolveWorkerFolderSort } from '@/lib/admin/worker-folder-sort';

export const WORKER_FOLDER_PAGE_SIZE = 20;

export type WorkerFolderQueueParams = {
  q?: string;
  role?: string;
  status?: string;
  payout?: string;
  sort?: string;
  page?: string;
};

export type WorkerFolderQueueCard = ReturnType<
  typeof serializeApplicationQueueCard
>;

export type WorkerFolderQueueResult =
  | {
      ok: true;
      cards: WorkerFolderQueueCard[];
      total: number;
      totalPages: number;
      page: number;
      sort: string;
      queryString: string;
      params: WorkerFolderQueueParams;
    }
  | {
      ok: false;
      error: 'load_failed';
    };

export async function loadWorkerFolderQueue(
  params: WorkerFolderQueueParams,
): Promise<WorkerFolderQueueResult> {
  const page = Math.max(1, Number(params.page ?? '1') || 1);
  const sort = resolveWorkerFolderSort(params.sort);
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('list_verification_applications', {
    p_search: params.q?.trim() || undefined,
    p_role:
      params.role && isWorkerRole(params.role)
        ? (params.role as WorkerRole)
        : undefined,
    p_application_status: params.status?.trim() || undefined,
    p_payout_status:
      params.payout === 'pending' ||
      params.payout === 'verified' ||
      params.payout === 'rejected' ||
      params.payout === 'failed' ||
      params.payout === 'suspended'
        ? params.payout
        : undefined,
    p_sort: sort,
    p_limit: WORKER_FOLDER_PAGE_SIZE,
    p_offset: (page - 1) * WORKER_FOLDER_PAGE_SIZE,
  });

  if (error) {
    return { ok: false, error: 'load_failed' };
  }

  const rows = (data ?? []) as Array<{
    worker_id: string;
    application_ref: string;
    full_name: string | null;
    email: string | null;
    phone: string | null;
    worker_role: string | null;
    application_status: string;
    required_total: number;
    awaiting_review_count: number;
    approved_count: number;
    rejected_count: number;
    submitted_file_count: number;
    payout_status: string | null;
    submitted_at: string | null;
    last_activity_at: string | null;
    total_count: number;
  }>;

  const total = Number(rows[0]?.total_count ?? 0);
  const totalPages = Math.max(
    1,
    Math.ceil(total / WORKER_FOLDER_PAGE_SIZE),
  );
  const cards = rows.map(serializeApplicationQueueCard);

  const qs = new URLSearchParams();
  if (params.q) qs.set('q', params.q);
  if (params.role) qs.set('role', params.role);
  if (params.status) qs.set('status', params.status);
  if (params.payout) qs.set('payout', params.payout);
  if (params.sort) qs.set('sort', params.sort);

  return {
    ok: true,
    cards,
    total,
    totalPages,
    page,
    sort,
    queryString: qs.toString(),
    params,
  };
}

export function workerFolderCopy(locale: 'en' | 'el' = 'en') {
  return {
    openCta: workerFolderLabel('openWorkerFolder', locale),
    openReview: workerFolderLabel('openReview', locale),
    needsAttention: workerFolderLabel('needsAttention', locale),
    completeRequirements: workerFolderLabel('completeRequirements', locale),
    reviewStatus: workerFolderLabel('reviewStatus', locale),
    noWorkersMatch: workerFolderLabel('noWorkersMatch', locale),
    emptyHint: workerFolderLabel('workerFoldersEmptyHint', locale),
    pendingReview: workerFolderLabel('pendingReview', locale),
    workerApplications: workerFolderLabel('workerApplications', locale),
  };
}
