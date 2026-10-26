import Image from 'next/image';
import Link from 'next/link';

import { localizePath, type MarketingLocale } from '@/lib/marketing-i18n';

/** Versioned official mark (navy-tile B + gold hex). PNG keeps the white B crisp. */
const MARK_SRC = '/brand/bridge-hive-logo-v2-512.png';

type MarketingBrandProps = {
  /** Locale for the home href (`/` vs `/el`). */
  locale?: MarketingLocale;
  /** Explicit href override; wins over `locale`. */
  href?: string;
  tone?: 'light' | 'dark';
  /** Display size in CSS pixels (keep ~44–56 in header). */
  markSize?: number;
  priority?: boolean;
  /** aria-label — localized by the parent via dictionary.brand.homeAria. */
  ariaLabel?: string;
};

/** Official Bridge Hive mark + readable wordmark for marketing surfaces only. */
export function MarketingBrand({
  locale = 'en',
  href,
  tone = 'light',
  markSize = 44,
  priority = false,
  ariaLabel = 'Bridge Hive home',
}: MarketingBrandProps) {
  const size = Math.min(56, Math.max(40, markSize));
  const target = href ?? localizePath('/', locale);

  return (
    <Link
      href={target}
      className={`m-brand m-brand--${tone}`}
      aria-label={ariaLabel}
      style={{ ['--m-brand-mark-size' as string]: `${size}px` }}
    >
      <Image
        src={MARK_SRC}
        alt=""
        width={size}
        height={size}
        sizes={`${size}px`}
        className="m-brand-mark"
        style={{ width: size, height: size }}
        priority={priority}
      />
      <span className="m-brand-wordmark">
        <span className="m-brand-bridge">Bridge</span>{' '}
        <span className="m-brand-hive">Hive</span>
      </span>
    </Link>
  );
}
