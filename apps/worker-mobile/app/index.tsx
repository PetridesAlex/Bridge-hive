import { Redirect } from 'expo-router';
import React, { useEffect, useState } from 'react';

import { AppBootCover, useLaunchGate } from '@/components/brand/AppBootCover';
import { hasCompletedOnboarding } from '@/lib/onboarding-preference';
import {
  hasWorkspacePreparationBeenConsumed,
  markWorkspacePreparationConsumed,
  workspacePreparationMinMs,
} from '@/lib/workspace-preparation';
import { useAuth } from '@/providers/AuthProvider';

export default function IndexScreen() {
  const { loading, session, homeRoute, bootstrapError, retryBootstrap } = useAuth();
  const [onboardingReady, setOnboardingReady] = useState(false);
  const [seenWelcome, setSeenWelcome] = useState(false);
  const [consumed] = useState(() => hasWorkspacePreparationBeenConsumed());
  const ready = !loading && onboardingReady && !bootstrapError;
  const canEnter = useLaunchGate(ready, workspacePreparationMinMs(consumed));

  useEffect(() => {
    let alive = true;
    void hasCompletedOnboarding().then((done) => {
      if (!alive) return;
      setSeenWelcome(done);
      setOnboardingReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (canEnter) {
      markWorkspacePreparationConsumed();
    }
  }, [canEnter]);

  if (!canEnter) {
    return (
      <AppBootCover
        showSlowIndicator={loading || !onboardingReady}
        bootstrapError={bootstrapError}
        onRetryBootstrap={() => {
          void retryBootstrap();
        }}
      />
    );
  }

  if (session) {
    return <Redirect href={homeRoute as never} />;
  }

  if (!seenWelcome) {
    return <Redirect href="/welcome" />;
  }

  return <Redirect href="/auth/worker/login" />;
}
