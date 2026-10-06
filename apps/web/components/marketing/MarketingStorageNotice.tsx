'use client';

import Image from 'next/image';
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';

import {
  hasAcknowledgedStorageNotice,
  rememberStorageNoticeAck,
  STORAGE_NOTICE_OPEN_EVENT,
} from '@/components/marketing/storage-notice';

function waitForIntroDone(onDone: () => void): () => void {
  if (typeof document === 'undefined') return () => {};

  if (document.documentElement.getAttribute('data-m-intro') === 'done') {
    onDone();
    return () => {};
  }

  const observer = new MutationObserver(() => {
    if (document.documentElement.getAttribute('data-m-intro') === 'done') {
      observer.disconnect();
      onDone();
    }
  });
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-m-intro'],
  });
  return () => observer.disconnect();
}

/**
 * Informational storage notice for public marketing pages only.
 * Appears after the logo intro finishes; no optional Accept/Reject (no analytics).
 */
export function MarketingStorageNotice() {
  const titleId = useId();
  const detailsId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const gotItRef = useRef<HTMLButtonElement>(null);

  const [introDone, setIntroDone] = useState(false);
  const [acknowledged, setAcknowledged] = useState(true);
  const [visible, setVisible] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [openedFromFooter, setOpenedFromFooter] = useState(false);

  useLayoutEffect(() => {
    setAcknowledged(hasAcknowledgedStorageNotice());
    return waitForIntroDone(() => setIntroDone(true));
  }, []);

  useEffect(() => {
    if (introDone && !acknowledged) {
      setVisible(true);
      setOpenedFromFooter(false);
    }
  }, [introDone, acknowledged]);

  useEffect(() => {
    const onOpen = () => {
      setVisible(true);
      setOpenedFromFooter(true);
      setDetailsOpen(true);
    };
    window.addEventListener(STORAGE_NOTICE_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(STORAGE_NOTICE_OPEN_EVENT, onOpen);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const focusTarget = gotItRef.current ?? panelRef.current;
    focusTarget?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && openedFromFooter) {
        event.preventDefault();
        setVisible(false);
        setDetailsOpen(false);
        setOpenedFromFooter(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [visible, openedFromFooter]);

  const dismiss = () => {
    rememberStorageNoticeAck();
    setAcknowledged(true);
    setVisible(false);
    setDetailsOpen(false);
    setOpenedFromFooter(false);
  };

  const closeManual = () => {
    setVisible(false);
    setDetailsOpen(false);
    setOpenedFromFooter(false);
  };

  if (!visible) return null;

  return (
    <div className="m-storage-notice" role="presentation">
      <div
        ref={panelRef}
        className="m-storage-notice-card"
        role="dialog"
        aria-modal={openedFromFooter ? true : undefined}
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div className="m-storage-notice-brand">
          <Image
            src="/brand/bridge-hive-logo-v2-512.png"
            alt=""
            width={40}
            height={40}
            className="m-storage-notice-mark"
            draggable={false}
          />
          <div className="m-storage-notice-copy">
            <h2 id={titleId} className="m-storage-notice-title">
              How we use storage on this site
            </h2>
            <p className="m-storage-notice-lede">
              Bridge Hive uses essential cookies and browser storage to run the public
              website and keep signed-in sessions working. We do not use advertising or
              optional analytics cookies on this site today.
            </p>
          </div>
        </div>

        <div className="m-storage-notice-actions">
          <button
            type="button"
            className="m-storage-notice-details"
            aria-expanded={detailsOpen}
            aria-controls={detailsId}
            onClick={() => setDetailsOpen((open) => !open)}
          >
            What we store
          </button>
          <button
            ref={gotItRef}
            type="button"
            className="m-storage-notice-got-it"
            onClick={dismiss}
          >
            Got it
          </button>
          {openedFromFooter ? (
            <button
              type="button"
              className="m-storage-notice-close"
              onClick={closeManual}
            >
              Close
            </button>
          ) : null}
        </div>

        {detailsOpen ? (
          <div id={detailsId} className="m-storage-notice-panel">
            <ul className="m-storage-notice-list">
              <li>
                <strong>Site intro memory</strong>
                <span>
                  A short-lived <code>sessionStorage</code> flag (
                  <code>bh:m-intro</code>) so the branded logo intro shows once per
                  browser tab.
                </span>
              </li>
              <li>
                <strong>This notice</strong>
                <span>
                  A <code>localStorage</code> preference (
                  <code>bh:m-storage-notice</code>) so we do not show this card on every
                  visit after you acknowledge it.
                </span>
              </li>
              <li>
                <strong>Sign-in cookies (essential)</strong>
                <span>
                  Supabase authentication cookies are set only when you sign in. They keep
                  organization and worker account sessions working and are required for
                  those services.
                </span>
              </li>
            </ul>
            <p className="m-storage-notice-note">
              There is no separate Cookie Policy page yet. For privacy or terms questions,
              contact support from the site footer.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
