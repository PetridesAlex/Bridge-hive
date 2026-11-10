export function resolveWorkerFolderSort(sort: string | undefined): string {
  if (
    sort === 'submitted_at' ||
    sort === 'oldest_waiting' ||
    sort === 'last_activity'
  ) {
    return sort;
  }
  // Draft RPC will add worker_name / urgency; keep stable until applied.
  return 'submitted_at';
}
