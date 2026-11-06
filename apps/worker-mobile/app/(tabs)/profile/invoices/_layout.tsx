import { Stack } from 'expo-router';
import React from 'react';

import { colors } from '@/constants/theme';

/** Profile-nested invoices — keeps the tab bar and Account in the back stack. */
export default function ProfileInvoicesLayout() {
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
