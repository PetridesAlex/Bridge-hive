'use client';

import { Globe } from 'lucide-react';
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

/**
 * Compact pill with a Globe icon and two inline language links (EN / ΕΛ).
 * Not a dropdown — both choices stay visible and reachable with one tap.
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
      <span className="m-lang-switch-icon" aria-hidden="true">
        <Globe size={14} strokeWidth={2.1} />
      </span>
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
            {target === 'en' ? 'EN' : 'ΕΛ'}
            <span className="sr-only">{labels[target]}</span>
          </Link>
        );
      })}
    </div>
  );
}
