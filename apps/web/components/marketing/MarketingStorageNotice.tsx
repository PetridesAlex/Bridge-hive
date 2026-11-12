'use client';

import Image from 'next/image';
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';

import {
  hasAcknowledgedStorageNotice,
  rememberStorageNoticeAck,
  STORAGE_NOTICE_OPEN_EVENT,
} from '@/components/marketing/storage-notice';
import type { MarketingDictionary } from '@/lib/marketing-i18n/dictionaries';
import type { MarketingLocale } from '@/lib/marketing-i18n/locales';

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

type MarketingStorageNoticeProps = {
  storageNotice: MarketingDictionary['storageNotice'];
  locale: MarketingLocale;
};

/**
 * Informational storage notice for public marketing pages only.
 * Appears after the logo intro finishes. There is no optional tracking choice
 * because this site does not load analytics or advertising tags.
 */
export function MarketingStorageNotice({
  storageNotice,
  locale,
}: MarketingStorageNoticeProps) {
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
              {storageNotice.title}
            </h2>
            <p className="m-storage-notice-lede">{storageNotice.lede}</p>
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
            {storageNotice.whatWeStore}
          </button>
          <button
            ref={gotItRef}
            type="button"
            className="m-storage-notice-got-it"
            onClick={dismiss}
          >
            {storageNotice.gotIt}
          </button>
          {openedFromFooter ? (
            <button
              type="button"
              className="m-storage-notice-close"
              onClick={closeManual}
            >
              {storageNotice.close}
            </button>
          ) : null}
        </div>

        {detailsOpen ? (
          <div
            id={detailsId}
            className="m-storage-notice-panel"
            lang={locale}
            data-bh-storage-details-locale={locale}
          >
            <ul className="m-storage-notice-list">
              <li>
                <strong>{storageNotice.thisNoticeTitle}</strong>
                <span>{storageNotice.thisNoticeBody}</span>
              </li>
              <li>
                <strong>{storageNotice.signInCookiesTitle}</strong>
                <span>{storageNotice.signInCookiesBody}</span>
              </li>
              <li>
                <strong>{storageNotice.rememberMeTitle}</strong>
                <span>{storageNotice.rememberMeBody}</span>
              </li>
            </ul>
            <p className="m-storage-notice-note">{storageNotice.noteBody}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
