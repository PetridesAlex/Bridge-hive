'use client';

import { openStorageNoticePanel } from '@/components/marketing/storage-notice';

type CookieSettingsButtonProps = {
  /** Localized label — defaults to English. */
  label?: string;
};

/** Discreet footer control to reopen the public storage notice. */
export function CookieSettingsButton({
  label = 'Cookie settings',
}: CookieSettingsButtonProps = {}) {
  return (
    <button
      type="button"
      className="m-footer-cookie-settings"
      onClick={() => openStorageNoticePanel()}
    >
      {label}
    </button>
  );
}
