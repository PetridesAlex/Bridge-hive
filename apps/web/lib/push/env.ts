/** Preview deploys must never flush the production outbox to Expo. */
export function isWorkerPushDispatchEnabled(): boolean {
  if (process.env.WORKER_PUSH_DISABLE === '1') return false;
  if (process.env.VERCEL_ENV === 'preview') return false;
  return true;
}
