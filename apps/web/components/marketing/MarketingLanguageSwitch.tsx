'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import {
  MARKETING_LOCALES,
  switchLocaleHref,
  type MarketingLocale,
} from '@/lib/marketing-i18n';

type MarketingLanguageSwitchProps = {
  locale: MarketingLocale;
  variant?: 'desktop' | 'mobile';
  langEnLabel: string;
  langElLabel: string;
  switchAriaLabel: string;
};

const LOCALE_HREF_LANG: Record<MarketingLocale, string> = {
  en: 'en',
  el: 'el',
};

/** Inline SVG flags (emoji flags don't render on Windows). Cropped to a circle via CSS. */
function FlagUK() {
  return (
    <svg
      viewBox="0 0 60 30"
      preserveAspectRatio="xMidYMid slice"
      focusable="false"
    >
      <rect width="60" height="30" fill="#012169" />
      <path d="M0 0L60 30M60 0L0 30" stroke="#fff" strokeWidth="6" />
      <path d="M0 0L60 30M60 0L0 30" stroke="#C8102E" strokeWidth="2" />
      <path d="M30 0V30M0 15H60" stroke="#fff" strokeWidth="10" />
      <path d="M30 0V30M0 15H60" stroke="#C8102E" strokeWidth="6" />
    </svg>
  );
}

function FlagGR() {
  return (
    <svg
      viewBox="0 0 27 18"
      preserveAspectRatio="xMinYMid slice"
      focusable="false"
    >
      <rect width="27" height="18" fill="#0D5EAF" />
      <path
        d="M0 3H27M0 7H27M0 11H27M0 15H27"
        stroke="#fff"
        strokeWidth="2"
      />
      <rect width="10" height="10" fill="#0D5EAF" />
      <path d="M5 0V10M0 5H10" stroke="#fff" strokeWidth="2" />
    </svg>
  );
}

/**
 * Compact pill with two circular flag buttons (EN / ΕΛ).
 * Not a dropdown — both choices stay visible and reachable with one tap.
 * Language names stay available to assistive tech (and visible on mobile).
 */
export function MarketingLanguageSwitch({
  locale,
  variant = 'desktop',
  langEnLabel,
  langElLabel,
  switchAriaLabel,
}: MarketingLanguageSwitchProps) {
  const pathname = usePathname() ?? '/';
  const [hash, setHash] = useState('');

  useEffect(() => {
    const readHash = () => setHash(window.location.hash ?? '');
    readHash();
    window.addEventListener('hashchange', readHash);
    return () => window.removeEventListener('hashchange', readHash);
  }, [pathname]);

  const labels: Record<MarketingLocale, string> = {
    en: langEnLabel,
    el: langElLabel,
  };

  const classes =
    variant === 'mobile'
      ? 'm-lang-switch m-lang-switch--mobile'
      : 'm-lang-switch';

  return (
    <div
      className={classes}
      role="group"
      aria-label={switchAriaLabel}
      data-bh-lang-switch=""
    >
      {MARKETING_LOCALES.map((target) => {
        const href = switchLocaleHref(pathname, hash, target);
        const active = target === locale;
        return (
          <Link
            key={target}
            href={href}
            className={`m-lang-switch-link${active ? ' is-active' : ''}`}
            hrefLang={LOCALE_HREF_LANG[target]}
            lang={LOCALE_HREF_LANG[target]}
            aria-current={active ? 'true' : undefined}
            data-bh-lang-switch-link={target}
          >
            <span className="m-lang-switch-flag" aria-hidden="true">
              {target === 'en' ? <FlagUK /> : <FlagGR />}
            </span>
            <span className="m-lang-switch-label">{labels[target]}</span>
          </Link>
        );
      })}
    </div>
  );
}
