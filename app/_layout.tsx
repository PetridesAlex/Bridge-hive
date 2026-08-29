import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import {
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { colors } from '@/constants/theme';
import { checkSupabaseConnection } from '@/lib/supabaseHealth';
import { AuthProvider } from '@/providers/AuthProvider';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    if (!__DEV__) return;
    checkSupabaseConnection().then((result) => {
      if (result.ok) {
        console.log('[supabase]', result.message);
      } else {
        console.warn('[supabase]', result.message);
      }
    });
  }, []);

  if (!fontsLoaded && !fontError) {
    return (
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.navy }} />
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.background },
              animation: 'slide_from_right',
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="welcome" />
            <Stack.Screen name="login" />
            <Stack.Screen name="signup" />
            <Stack.Screen name="auth/professional/login" />
            <Stack.Screen name="auth/professional/register" />
            <Stack.Screen name="auth/professional/pending" />
            <Stack.Screen name="auth/organization/login" />
            <Stack.Screen name="auth/organization/register" />
            <Stack.Screen name="auth/organization/pending" />
            <Stack.Screen name="auth/admin/login" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="(org)" />
            <Stack.Screen name="shifts/[id]" />
            <Stack.Screen name="shifts/calendar" />
            <Stack.Screen name="transfers/[id]" />
            <Stack.Screen name="invoices/[id]" />
            <Stack.Screen name="notifications" />
            <Stack.Screen name="documents" />
            <Stack.Screen name="availability" />
            <Stack.Screen name="profile/account" />
            <Stack.Screen name="profile/[section]" />
            <Stack.Screen name="admin/index" />
          </Stack>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
