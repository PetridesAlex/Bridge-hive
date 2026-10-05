'use client';

import Image from 'next/image';
import { useLayoutEffect, useState } from 'react';

/** Tab/session key: survives refresh + soft nav; cleared when the tab/session ends. */
export const MARKETING_INTRO_SESSION_KEY = 'bh:m-intro';

function introAlreadyShown(): boolean {
  try {
    return sessionStorage.getItem(MARKETING_INTRO_SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

function rememberIntroShown(): void {
  try {
    sessionStorage.setItem(MARKETING_INTRO_SESSION_KEY, '1');
  } catch {
    /* private mode / blocked storage — still animate once this mount */
  }
}

/**
 * Decorative marketing-page intro; the site remains server-rendered underneath.
 * Shown once per browser tab/session on first entry to public marketing pages.
 */
export function MarketingLogoIntro() {
  // Always start mounted so SSR HTML matches the client's first paint; the
  // beforeInteractive script + CSS hide revisits before paint (no flash).
  const [visible, setVisible] = useState(true);

  useLayoutEffect(() => {
    if (introAlreadyShown()) {
      document.documentElement.setAttribute('data-m-intro', 'done');
      setVisible(false);
      return;
    }

    rememberIntroShown();

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.documentElement.setAttribute('data-m-intro', 'done');
      setVisible(false);
      return;
    }

    const finish = () => {
      document.documentElement.setAttribute('data-m-intro', 'done');
      setVisible(false);
    };

    const timer = window.setTimeout(finish, 3000);
    return () => window.clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div className="m-intro" aria-hidden="true">
      <div className="m-intro-lockup">
        <span className="m-intro-mark-wrap">
          <Image
            src="/brand/bridge-hive-logo-v2-512.png"
            alt=""
            width={512}
            height={512}
            sizes="(max-width: 600px) 144px, 192px"
            priority
            draggable={false}
            className="m-intro-mark"
          />
        </span>
        <p className="m-intro-name">
          BridgeHive <span>Medical Recruitment Limited</span>
        </p>
      </div>
    </div>
  );
}
