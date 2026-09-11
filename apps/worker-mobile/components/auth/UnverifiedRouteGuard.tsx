import { Redirect, usePathname } from 'expo-router';
import React from 'react';
import {
  isWorkerAccountSetupRouteAllowed,
  isWorkerMarketplaceRoute,
} from '@bridge-hive/domain';

import { useAuth } from '@/providers/AuthProvider';

/**
 * Blocks marketplace and other verified-only routes while still allowing
 * Account Setup: documents + payout account setup.
 */
export function UnverifiedRouteGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const { loading, session, isVerified, accountRejectionReason, homeRoute } =
    useAuth();
  const pathname = usePathname();

  if (loading || !session) {
    return <>{children}</>;
  }

  if (accountRejectionReason) {
    if (pathname.startsWith('/auth/worker/rejected')) {
      return <>{children}</>;
    }
    return <Redirect href="/auth/worker/rejected" />;
  }

  if (isVerified) {
    return <>{children}</>;
  }

  if (
    isWorkerMarketplaceRoute(pathname) ||
    !isWorkerAccountSetupRouteAllowed(pathname)
  ) {
    if (pathname.startsWith('/auth/worker/pending')) {
      return <>{children}</>;
    }
    return <Redirect href={homeRoute as never} />;
  }

  return <>{children}</>;
}
