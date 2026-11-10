import { Stack } from 'expo-router';
import React from 'react';

import { colors } from '@/constants/theme';

/** Profile / More stack — keeps the tab bar visible on nested screens. */
export default function ProfileStackLayout() {
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
