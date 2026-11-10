import { Stack } from 'expo-router';
import React from 'react';

import { colors } from '@/constants/theme';

/** Invoices stack — list + detail keep the tab bar visible. */
export default function InvoicesStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
    />
  );
}
