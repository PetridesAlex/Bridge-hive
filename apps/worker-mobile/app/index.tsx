import { Redirect } from 'expo-router';
import React from 'react';

import { AppBootCover } from '@/components/brand/AppBootCover';
import { useAuth } from '@/providers/AuthProvider';

export default function IndexScreen() {
  const { loading, session, homeRoute } = useAuth();

  if (loading) {
    return <AppBootCover />;
  }

  if (!session) {
    return <Redirect href="/welcome" />;
  }

  return <Redirect href={homeRoute as never} />;
}
