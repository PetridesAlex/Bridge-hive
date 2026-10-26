import { notFound } from 'next/navigation';

/**
 * Catch-all for unknown `/el/*` paths — delegates to the Greek `not-found.tsx`
 * sibling so middleware doesn't send Greek visitors to `/sign-in`.
 */
export default function GreekCatchAll() {
  notFound();
}
