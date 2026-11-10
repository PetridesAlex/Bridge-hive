import { WorkerFolderQueue } from '@/components/admin/worker-folder-queue';
import { EmptyState } from '@/components/empty-state';
import { requirePlatformAdmin } from '@/lib/admin/auth';
import {
  loadWorkerFolderQueue,
  workerFolderCopy,
} from '@/lib/admin/worker-folder-queue';

export default async function AdminCredentialsPage({
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
  if (!ctx.capabilities.canViewCredentialMetadata) {
    return (
      <EmptyState
        title="Permission denied"
        description="Your role cannot view the credential review queue."
      />
    );
  }

  const params = await searchParams;
  const result = await loadWorkerFolderQueue(params);
  const copy = workerFolderCopy('en');

  if (!result.ok) {
    return (
      <EmptyState
        title="Unable to load worker folders"
        description="Please try again shortly."
      />
    );
  }

  return (
    <WorkerFolderQueue
      basePath="/admin/credentials"
      eyebrow="Credential review"
      title={copy.workerApplications}
      subtitle="One folder per worker. Open a folder to review documents, tax identification, social insurance, and payout status together."
      cards={result.cards}
      total={result.total}
      totalPages={result.totalPages}
      page={result.page}
      sort={result.sort}
      queryString={result.queryString}
      params={result.params}
      showContact={ctx.capabilities.canViewWorkers}
      ctaLabel={copy.openCta}
    />
  );
}
