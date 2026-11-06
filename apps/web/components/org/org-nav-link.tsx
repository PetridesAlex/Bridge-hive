'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ComponentProps, MouseEvent } from 'react';

type OrgNavLinkProps = ComponentProps<typeof Link> & {
  /** When true, Next.js prefetches as soon as the link is in view. Default is hover/focus only. */
  eager?: boolean;
};

/**
 * Internal org navigation that keeps the shared shell.
 * Heavy org pages are prefetched on hover/focus, not all at once on sidebar mount.
 */
export function OrgNavLink({
  eager = false,
  prefetch,
  onMouseEnter,
  onFocus,
  onClick,
  href,
  ...props
}: OrgNavLinkProps) {
  const router = useRouter();
  const destination = typeof href === 'string' ? href : href.pathname ?? '';

  const prefetchIfAllowed = () => {
    if (!eager && destination.startsWith('/org/')) {
      router.prefetch(destination);
    }
  };

  return (
    <Link
      href={href}
      prefetch={prefetch ?? eager}
      onMouseEnter={(event: MouseEvent<HTMLAnchorElement>) => {
        prefetchIfAllowed();
        onMouseEnter?.(event);
      }}
      onFocus={(event) => {
        prefetchIfAllowed();
        onFocus?.(event);
      }}
      onClick={onClick}
      {...props}
    />
  );
}
