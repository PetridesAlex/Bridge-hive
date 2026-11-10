import { Stack } from 'expo-router';
import React from 'react';

import { colors } from '@/constants/theme';

/** Shifts stack — marketplace list, calendar, and shift detail keep the tab bar. */
export default function ShiftsStackLayout() {
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
