'use client';

import Image from 'next/image';
import { useLayoutEffect, useState } from 'react';

import { clearRetiredMarketingSessionFlags } from '@/components/marketing/storage-notice';

/**
 * Decorative marketing-page intro; the site remains server-rendered underneath.
 * Plays once per document load. It does not write browser storage.
 */
export function MarketingLogoIntro() {
  const [visible, setVisible] = useState(true);

  useLayoutEffect(() => {
    clearRetiredMarketingSessionFlags();

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
