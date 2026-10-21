import { Redirect } from 'expo-router';
import React, { useEffect, useState } from 'react';

import { AppBootCover, useLaunchGate } from '@/components/brand/AppBootCover';
import { hasCompletedOnboarding } from '@/lib/onboarding-preference';
import { useAuth } from '@/providers/AuthProvider';

export default function IndexScreen() {
  const { loading, session, homeRoute } = useAuth();
  const [onboardingReady, setOnboardingReady] = useState(false);
  const [seenWelcome, setSeenWelcome] = useState(false);
  const canEnter = useLaunchGate(!loading && onboardingReady);

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

  if (!canEnter) {
    return <AppBootCover showSlowIndicator={loading || !onboardingReady} />;
  }

  if (session) {
    return <Redirect href={homeRoute as never} />;
  }

  if (!seenWelcome) {
    return <Redirect href="/welcome" />;
  }

  return <Redirect href="/auth/worker/login" />;
}
