import { WorkerFolderQueue } from '@/components/admin/worker-folder-queue';
import { EmptyState } from '@/components/empty-state';
import { requirePlatformAdmin } from '@/lib/admin/auth';
import {
  loadWorkerFolderQueue,
  workerFolderCopy,
} from '@/lib/admin/worker-folder-queue';

export default async function VerificationApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    role?: string;
    status?: string;
    payout?: string;
    sort?: string;
    page?: string;
  }>;
}) {
  const ctx = await requirePlatformAdmin();
  if (!ctx.capabilities.canViewWorkers) {
    return (
      <EmptyState
        title="Permission denied"
        description="Your role cannot view verification applications."
      />
    );
  }

  const params = await searchParams;
  const result = await loadWorkerFolderQueue(params);
  const copy = workerFolderCopy('en');

  if (!result.ok) {
    return (
      <EmptyState
        title="Unable to load applications"
        description="Refresh the page or try again shortly."
      />
    );
  }

  return (
    <WorkerFolderQueue
      basePath="/admin/applications"
      eyebrow="Verification"
      title="Verification applications"
      subtitle="One application per worker. Review the full package from a single workspace."
      cards={result.cards}
      total={result.total}
      totalPages={result.totalPages}
      page={result.page}
      sort={result.sort}
      queryString={result.queryString}
      params={result.params}
      showContact
      ctaLabel={copy.openReview}
    />
  );
}
