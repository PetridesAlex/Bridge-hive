import Link from 'next/link';

/** Bridge Hive mark + wordmark for marketing surfaces only (light/dark variants). */
export function MarketingBrand({
  href = '/',
  tone = 'light',
  markSize = 28,
}: {
  href?: string;
  tone?: 'light' | 'dark';
  markSize?: number;
}) {
  return (
    <Link
      href={href}
      className={`m-brand m-brand--${tone}`}
      aria-label="Bridge Hive home"
    >
      <svg
        width={markSize}
        height={markSize}
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden="true"
        className="m-brand-mark"
      >
        <path
          d="M8 16c0-4.4 3.6-8 8-8h2.2c2.9 0 5.3 2.4 5.3 5.3 0 1.8-.9 3.4-2.3 4.4 1.4 1 2.3 2.6 2.3 4.4 0 2.9-2.4 5.3-5.3 5.3H16c-4.4 0-8-3.6-8-8z"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
        <path
          d="M14 12.5h4.5M14 16h5.5M14 19.5h4"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <circle cx="22.5" cy="10" r="1.6" fill="currentColor" />
      </svg>
      <span className="m-brand-wordmark">
        <span className="m-brand-bridge">Bridge</span>{' '}
        <span className="m-brand-hive">Hive</span>
      </span>
    </Link>
  );
}
