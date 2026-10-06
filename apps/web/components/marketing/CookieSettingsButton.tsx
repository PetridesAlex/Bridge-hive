'use client';

import { openStorageNoticePanel } from '@/components/marketing/storage-notice';

/** Discreet footer control to reopen the public storage notice. */
export function CookieSettingsButton() {
  return (
    <button
      type="button"
      className="m-footer-cookie-settings"
      onClick={() => openStorageNoticePanel()}
    >
      Cookie settings
    </button>
  );
}
