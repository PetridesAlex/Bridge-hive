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
import React, { useEffect, type ReactElement } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { APP_BOOT_BG } from '@/components/brand/AppBootCover';
import {
  getStripePublishableKey,
  getStripeUrlScheme,
  STRIPE_MERCHANT_IDENTIFIER,
} from '@/constants/stripe';
import { colors } from '@/constants/theme';
import { LocaleProvider } from '@/i18n/locale-provider';
import { StripeProvider } from '@/lib/stripe-native';
import { AuthProvider } from '@/providers/AuthProvider';
import { UnverifiedRouteGuard } from '@/components/auth/UnverifiedRouteGuard';
import { PushNotificationController } from '@/components/push/PushNotificationController';

function OptionalStripeProvider({
  children,
}: {
  children: ReactElement | ReactElement[];
}) {
  // Provider must always mount so useStripe() is safe; Pay is gated on a real key.
  const publishableKey =
    getStripePublishableKey() ?? 'pk_test_bridgehive_unavailable';
  return (
    <StripeProvider
      publishableKey={publishableKey}
      merchantIdentifier={STRIPE_MERCHANT_IDENTIFIER}
      urlScheme={getStripeUrlScheme()}
    >
      {children}
    </StripeProvider>
  );
}

SplashScreen.preventAutoHideAsync().catch(() => undefined);
SplashScreen.setOptions({ fade: true, duration: 300 });

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

  if (!fontsLoaded && !fontError) {
    return (
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
        <StatusBar style="dark" />
        <View style={{ flex: 1, backgroundColor: colors.background }} />
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <SafeAreaProvider>
        <LocaleProvider>
          <OptionalStripeProvider>
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
                  {/* Welcome/auth landing keep navy content — login exits straight to dashboard. */}
                  <Stack.Screen
                    name="index"
                    options={{ contentStyle: { backgroundColor: colors.background }, animation: 'fade' }}
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
                    options={{ contentStyle: { backgroundColor: colors.background } }}
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
                  {/* Outside tabs so Account Setup can open them before shell access. */}
                  <Stack.Screen name="documents" />
                  <Stack.Screen name="notifications" />
                  <Stack.Screen name="payout-setup" />
                </Stack>
              </UnverifiedRouteGuard>
            </AuthProvider>
          </OptionalStripeProvider>
        </LocaleProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
