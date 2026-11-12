/**
 * Public marketing storage notice.
 * Acknowledgement means the visitor dismissed the information card.
 * It is not permission for analytics or advertising.
 */

export const STORAGE_NOTICE_KEY = 'bh:m-storage-notice';
export const STORAGE_NOTICE_VERSION = 2;
export const STORAGE_NOTICE_KIND = 'information-ack' as const;
export const STORAGE_NOTICE_OPEN_EVENT = 'bh:open-storage-notice';

/** Session flags removed from the public site. Cleared on the next marketing visit. */
export const RETIRED_MARKETING_SESSION_KEYS = [
  'bh:m-intro',
  'bh:m-recruit-promo',
] as const;

type InformationAck = {
  v: typeof STORAGE_NOTICE_VERSION;
  kind: typeof STORAGE_NOTICE_KIND;
  at: string;
};

/** In-memory fallback when localStorage is unavailable (this document only). */
let memoryAcknowledged = false;

export function parseStorageNoticeAck(raw: string | null): InformationAck | null {
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;
  const record = parsed as Partial<InformationAck>;
  if (record.v !== STORAGE_NOTICE_VERSION) return null;
  if (record.kind !== STORAGE_NOTICE_KIND) return null;
  if (typeof record.at !== 'string' || record.at.length === 0) return null;
  return {
    v: STORAGE_NOTICE_VERSION,
    kind: STORAGE_NOTICE_KIND,
    at: record.at,
  };
}

export function hasAcknowledgedStorageNotice(): boolean {
  if (memoryAcknowledged) return true;
  try {
    return parseStorageNoticeAck(localStorage.getItem(STORAGE_NOTICE_KEY)) !== null;
  } catch {
    return false;
  }
}

export function rememberStorageNoticeAck(now = new Date()): void {
  memoryAcknowledged = true;
  const record: InformationAck = {
    v: STORAGE_NOTICE_VERSION,
    kind: STORAGE_NOTICE_KIND,
    at: now.toISOString(),
  };
  try {
    localStorage.setItem(STORAGE_NOTICE_KEY, JSON.stringify(record));
  } catch {
    /* private mode / blocked storage — keep the site usable for this document */
  }
}

/** Drop decorative session flags that this site no longer writes. */
export function clearRetiredMarketingSessionFlags(): void {
  try {
    for (const key of RETIRED_MARKETING_SESSION_KEYS) {
      sessionStorage.removeItem(key);
    }
  } catch {
    /* blocked storage — unread legacy flags expire with the tab */
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
