/** Public marketing storage-notice persistence (informational; no optional trackers). */

export const STORAGE_NOTICE_KEY = 'bh:m-storage-notice';
export const STORAGE_NOTICE_ACK = 'ack';
export const STORAGE_NOTICE_OPEN_EVENT = 'bh:open-storage-notice';

/** In-memory fallback when localStorage is unavailable (soft-nav only). */
let memoryAcknowledged = false;

export function hasAcknowledgedStorageNotice(): boolean {
  if (memoryAcknowledged) return true;
  try {
    return localStorage.getItem(STORAGE_NOTICE_KEY) === STORAGE_NOTICE_ACK;
  } catch {
    return memoryAcknowledged;
  }
}

export function rememberStorageNoticeAck(): void {
  memoryAcknowledged = true;
  try {
    localStorage.setItem(STORAGE_NOTICE_KEY, STORAGE_NOTICE_ACK);
  } catch {
    /* private mode / blocked storage — keep site usable; soft-nav uses memory */
  }
}

/** Footer / reopen control. No-op on the server. */
export function openStorageNoticePanel(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(STORAGE_NOTICE_OPEN_EVENT));
}

/** Reset helpers for unit tests only. */
export function __resetStorageNoticeMemoryForTests(): void {
  memoryAcknowledged = false;
}
