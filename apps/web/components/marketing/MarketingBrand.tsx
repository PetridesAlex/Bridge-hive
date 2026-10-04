import Image from 'next/image';
import Link from 'next/link';

/** Versioned official mark (navy-tile B + gold hex). PNG keeps the white B crisp. */
const MARK_SRC = '/brand/bridge-hive-logo-v2-512.png';

/** Official Bridge Hive mark + readable wordmark for marketing surfaces only. */
export function MarketingBrand({
  href = '/',
  tone = 'light',
  markSize = 44,
  priority = false,
}: {
  href?: string;
  tone?: 'light' | 'dark';
  /** Display size in CSS pixels (keep ~44–56 in header). */
  markSize?: number;
  priority?: boolean;
}) {
  const size = Math.min(56, Math.max(40, markSize));

  return (
    <Link
      href={href}
      className={`m-brand m-brand--${tone}`}
      aria-label="Bridge Hive home"
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
