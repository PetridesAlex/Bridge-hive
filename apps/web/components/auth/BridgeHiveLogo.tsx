export function BridgeHiveLogo({
  className = '',
  markSize = 28,
}: {
  className?: string;
  markSize?: number;
}) {
  return (
    <div className={`auth-logo ${className}`.trim()} aria-label="Bridge Hive">
      <svg
        width={markSize}
        height={markSize}
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden="true"
        className="auth-logo-mark"
      >
        <path
          d="M8 16c0-4.4 3.6-8 8-8h2.2c2.9 0 5.3 2.4 5.3 5.3 0 1.8-.9 3.4-2.3 4.4 1.4 1 2.3 2.6 2.3 4.4 0 2.9-2.4 5.3-5.3 5.3H16c-4.4 0-8-3.6-8-8z"
          stroke="#f5c518"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
        <path
          d="M14 12.5h4.5M14 16h5.5M14 19.5h4"
          stroke="#f5c518"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <circle cx="22.5" cy="10" r="1.6" fill="#f5c518" />
      </svg>
      <span className="auth-logo-wordmark">
        <span className="auth-logo-bridge">Bridge</span>{' '}
        <span className="auth-logo-hive">Hive</span>
      </span>
    </div>
  );
}
