import Image from 'next/image';

const MARK_SRC = '/brand/bridge-hive-logo-v2-192.png';

export function BridgeHiveLogo({
  className = '',
  markSize = 28,
}: {
  className?: string;
  markSize?: number;
}) {
  const size = Math.min(40, Math.max(24, markSize));

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
