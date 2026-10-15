import 'server-only';

import { checkWorkerPushReceipts, dispatchWorkerPushNotifications } from './dispatch';

/** Push delivery must never fail the organization's publish action. */
export async function notifyPublishedShiftsSafely(): Promise<void> {
  try {
    await dispatchWorkerPushNotifications();
  } catch {
    // The shift is already published. Pending rows stay in the outbox.
  }
}

export async function checkShiftPushReceiptsSafely(): Promise<void> {
  try {
    await checkWorkerPushReceipts();
  } catch {
    // Receipt checks are retried by a later trusted job.
  }
}
