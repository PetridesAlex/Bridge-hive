/**
 * Routes an unverified authenticated worker may open during Account Setup.
 * Marketplace tabs and shifts remain blocked until final verification.
 */
export const WORKER_ACCOUNT_SETUP_ROUTE_PREFIXES = [
  '/auth/worker/pending',
  '/auth/worker/rejected',
  '/auth/worker/login',
  '/auth/worker/register',
  '/auth/worker/reset-password',
  '/auth/worker/check-email',
  '/auth/worker/choose-role',
  '/auth/callback',
  '/documents',
  '/payout-setup',
  '/notifications',
  '/profile/account',
  '/profile/personal-information',
  '/profile/app-information',
  '/support',
  '/welcome',
] as const;

export const WORKER_ACCOUNT_SETUP_PAYOUT_ROUTE = '/payout-setup';

export function isWorkerAccountSetupRouteAllowed(pathname: string): boolean {
  if (pathname === '/' || pathname === '') return true;
  return WORKER_ACCOUNT_SETUP_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/** Verified-only surfaces that Account Setup must not open while unverified. */
export function isWorkerMarketplaceRoute(pathname: string): boolean {
  return (
    pathname.startsWith('/(tabs)') ||
    pathname.startsWith('/shifts') ||
    pathname === '/(tabs)' ||
    pathname.startsWith('/shifts/')
  );
}
