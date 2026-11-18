/** Preview deploys must never flush the production outbox to Expo. */
export function isWorkerPushDispatchEnabled(): boolean {
  if (process.env.WORKER_PUSH_DISABLE === '1') return false;
  if (process.env.VERCEL_ENV === 'preview') return false;
  return true;
}

/**
 * Preview deployments must never invoke process_worker_commission_due_dates,
 * even when WORKER_COMMISSION_DUE_DATES_CRON or dispatch secrets are present.
 * Staging verification uses authenticated direct RPC against Bridge-Hive-Test,
 * not a Vercel Preview cron hitting production.
 */
export function isWorkerCommissionDueDatesCronEnabled(): boolean {
  if (process.env.VERCEL_ENV === 'preview') return false;
  return process.env.WORKER_COMMISSION_DUE_DATES_CRON === '1';
}

export function workerCommissionDueDatesCronRefusalReason(): string | null {
  if (process.env.VERCEL_ENV === 'preview') {
    return 'preview_isolation';
  }
  if (process.env.WORKER_COMMISSION_DUE_DATES_CRON !== '1') {
    return 'WORKER_COMMISSION_DUE_DATES_CRON not enabled';
  }
  return null;
}
