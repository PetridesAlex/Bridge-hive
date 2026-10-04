import Image from 'next/image';

/** Versioned official navy-tile mark for dashboards and shared chrome. */
export const BRIDGE_HIVE_MARK_SRC = '/brand/bridge-hive-logo-v2-192.png';

export function BridgeHiveMark({
  size = 36,
  className = '',
  priority = false,
}: {
  size?: number;
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src={BRIDGE_HIVE_MARK_SRC}
      alt=""
      width={size}
      height={size}
      sizes={`${size}px`}
      className={className}
      style={{ width: size, height: size }}
      priority={priority}
      aria-hidden
    />
  );
}
