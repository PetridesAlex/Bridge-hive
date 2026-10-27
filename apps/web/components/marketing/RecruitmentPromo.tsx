'use client';

import { ArrowRight, Clock, ShieldCheck, Stethoscope, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useId, useState } from 'react';

import type { MarketingDictionary } from '@/lib/marketing-i18n/dictionaries';
import {
  localizePath,
  stripLocalePrefix,
  type MarketingLocale,
} from '@/lib/marketing-i18n';

/** Seconds of active (tab visible) time on the site before the promo appears. */
export const RECRUITMENT_PROMO_DELAY_SECONDS = 8;
/** sessionStorage flag so a dismissed promo does not return during this visit. */
export const RECRUITMENT_PROMO_SESSION_KEY = 'bh:m-recruit-promo';

const TICK_MS = 500;
const LEAVE_MS = 260;

function wasDismissed(): boolean {
  try {
    return sessionStorage.getItem(RECRUITMENT_PROMO_SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

function rememberDismissed(): void {
  try {
    sessionStorage.setItem(RECRUITMENT_PROMO_SESSION_KEY, '1');
  } catch {
    /* blocked storage — the promo simply may show again after a reload */
  }
}

type RecruitmentPromoProps = {
  promo: MarketingDictionary['recruitmentPromo'];
  locale: MarketingLocale;
};

/**
 * Friendly announcement that advertises the talent network once a visitor has
 * been active on the public site for a short while. Non-modal (never steals
 * focus), waits for the logo intro and storage notice, and stays out of the way
 * on the recruitment pages themselves.
 */
export function RecruitmentPromo({ promo, locale }: RecruitmentPromoProps) {
  const pathname = usePathname() ?? '/';
  const titleId = useId();

  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const onRecruitmentPage =
    stripLocalePrefix(pathname).startsWith('/recruitment');

  // Count active time and reveal once eligible.
  useEffect(() => {
    if (visible || onRecruitmentPage || wasDismissed()) return;

    let activeMs = 0;
    const id = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      activeMs += TICK_MS;
      if (activeMs < RECRUITMENT_PROMO_DELAY_SECONDS * 1000) return;

      const introDone =
        document.documentElement.getAttribute('data-m-intro') === 'done' ||
        !document.querySelector('.m-intro');
      const storageNoticeOpen = !!document.querySelector('.m-storage-notice');
      if (!introDone || storageNoticeOpen) return;

      window.clearInterval(id);
      setVisible(true);
    }, TICK_MS);

    return () => window.clearInterval(id);
  }, [visible, onRecruitmentPage]);

  function close(remember = true) {
    if (remember) rememberDismissed();
    setLeaving(true);
    window.setTimeout(() => {
      setVisible(false);
      setLeaving(false);
    }, LEAVE_MS);
  }

  if (!visible || onRecruitmentPage) return null;

  const applyHref = localizePath('/recruitment/apply', locale);
  const learnHref = localizePath('/recruitment', locale);

  return (
    <aside
      className={`m-promo${leaving ? ' is-leaving' : ''}`}
      aria-labelledby={titleId}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.stopPropagation();
          close();
        }
      }}
    >
      <button
        type="button"
        className="m-promo-close"
        onClick={() => close()}
        aria-label={promo.close}
      >
        <X size={16} aria-hidden />
      </button>

      <div className="m-promo-banner">
        <span className="m-promo-badge">
          <span className="m-promo-pulse" aria-hidden />
          {promo.badge}
        </span>
        <span className="m-promo-icon" aria-hidden>
          <Stethoscope size={22} />
        </span>
      </div>

      <div className="m-promo-body">
        <p className="m-promo-roles">{promo.roles}</p>
        <h2 id={titleId} className="m-promo-title">
          {promo.title}
        </h2>
        <p className="m-promo-text">{promo.body}</p>

        <ul className="m-promo-points">
          <li>
            <Clock size={14} aria-hidden />
            {promo.point1}
          </li>
          <li>
            <ShieldCheck size={14} aria-hidden />
            {promo.point2}
          </li>
        </ul>

        <div className="m-promo-actions">
          <Link
            href={applyHref}
            className="m-btn m-btn--primary m-promo-cta"
            onClick={() => rememberDismissed()}
          >
            <span>{promo.cta}</span>
            <ArrowRight className="m-btn-arrow" size={16} aria-hidden />
          </Link>
          <Link
            href={learnHref}
            className="m-promo-secondary"
            onClick={() => rememberDismissed()}
          >
            {promo.secondary}
          </Link>
        </div>

        <p className="m-promo-note">{promo.note}</p>
      </div>
    </aside>
  );
}
