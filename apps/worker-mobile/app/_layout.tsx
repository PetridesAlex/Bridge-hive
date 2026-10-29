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

import { APP_BOOT_BG, AppBootCover } from '@/components/brand/AppBootCover';
import { colors } from '@/constants/theme';
import { AuthProvider } from '@/providers/AuthProvider';
import { UnverifiedRouteGuard } from '@/components/auth/UnverifiedRouteGuard';
import { PushNotificationController } from '@/components/push/PushNotificationController';

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
      // Hide native splash only once the navy JS boot cover is already mounted.
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return (
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: APP_BOOT_BG }}>
        <StatusBar style="light" />
        <AppBootCover />
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: APP_BOOT_BG }}>
      <SafeAreaProvider>
        <AuthProvider>
          <PushNotificationController />
          <UnverifiedRouteGuard>
            <StatusBar style="dark" />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.background },
                animation: 'slide_from_right',
              }}
            >
              {/* Navy first-launch journey: navy content + fade so no light flash between screens. */}
              <Stack.Screen
                name="index"
                options={{ contentStyle: { backgroundColor: APP_BOOT_BG }, animation: 'fade' }}
              />
              <Stack.Screen
                name="welcome"
                options={{ contentStyle: { backgroundColor: APP_BOOT_BG }, animation: 'fade' }}
              />
              <Stack.Screen
                name="auth/worker/index"
                options={{ contentStyle: { backgroundColor: APP_BOOT_BG } }}
              />
              <Stack.Screen
                name="auth/worker/login"
                options={{ contentStyle: { backgroundColor: APP_BOOT_BG } }}
              />
              <Stack.Screen
                name="auth/worker/register"
                options={{ contentStyle: { backgroundColor: APP_BOOT_BG } }}
              />
              <Stack.Screen name="auth/worker/forgot-password" />
              <Stack.Screen name="auth/worker/check-email" />
              <Stack.Screen name="auth/worker/choose-role" />
              <Stack.Screen name="auth/worker/reset-password" />
              <Stack.Screen name="auth/worker/pending" />
              <Stack.Screen name="auth/worker/restricted" />
              <Stack.Screen name="auth/worker/rejected" />
              <Stack.Screen name="auth/callback" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="shifts/[id]" />
              <Stack.Screen name="shifts/calendar" />
              <Stack.Screen name="invoices/[id]" />
              <Stack.Screen name="notifications" />
              <Stack.Screen name="documents" />
              <Stack.Screen name="payout-setup" />
              <Stack.Screen name="profile/account" />
              <Stack.Screen name="profile/personal-information" />
              <Stack.Screen name="profile/app-information" />
              <Stack.Screen name="profile/notification-preferences" />
              <Stack.Screen name="support" />
            </Stack>
          </UnverifiedRouteGuard>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
