import Image from 'next/image';

const MARK_SRC = '/brand/bridge-hive-logo-v2-192.png';

export function BridgeHiveLogo({
  className = '',
  markSize = 28,
  tone = 'dark',
}: {
  className?: string;
  markSize?: number;
  /** `dark` uses auth-portal.css (AuthShell). `light` is self-contained for light utility pages. */
  tone?: 'dark' | 'light';
}) {
  const size = Math.min(40, Math.max(24, markSize));

  if (tone === 'light') {
    return (
      <div
        className={`inline-flex items-center gap-2.5 ${className}`.trim()}
        aria-label="Bridge Hive"
      >
        <Image
          src={MARK_SRC}
          alt=""
          width={size}
          height={size}
          sizes={`${size}px`}
          className="block shrink-0 object-contain"
          style={{ width: size, height: size }}
          aria-hidden
        />
        <span className="text-[1.15rem] font-bold leading-none tracking-tight">
          <span className="text-bh-navy">Bridge</span>{' '}
          <span className="text-bh-honey-strong">Hive</span>
        </span>
      </div>
    );
  }

  return (
    <div className={`auth-logo ${className}`.trim()} aria-label="Bridge Hive">
      <Image
        src={MARK_SRC}
        alt=""
        width={size}
        height={size}
        sizes={`${size}px`}
        className="auth-logo-mark"
        style={{ width: size, height: size }}
        aria-hidden
      />
      <span className="auth-logo-wordmark">
        <span className="auth-logo-bridge">Bridge</span>{' '}
        <span className="auth-logo-hive">Hive</span>
      </span>
    </div>
  );
}
