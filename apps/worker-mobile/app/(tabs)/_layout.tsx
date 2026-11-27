import { Redirect, router, Tabs } from 'expo-router';
import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import {
  AnimatedTabButton,
  AnimatedTabIcon,
  AnimatedTabLabel,
  TAB_ACCENTS,
  TabBarBackground,
  useAdaptiveTabBarStyle,
} from '@/components/navigation/AnimatedTabBar';
import { HiveFlowBackground } from '@/components/brand/HiveFlowBackground';
import { colors } from '@/constants/theme';
import { useTranslation } from '@/i18n/locale-provider';
import { useAuth } from '@/providers/AuthProvider';

export default function TabsLayout() {
  const {
    loading,
    session,
    canAccessWorkerShell,
    accountRejectionReason,
    homeRoute,
  } = useAuth();
  const { t } = useTranslation();
  const tabBarStyle = useAdaptiveTabBarStyle();

  // Wait for auth hydrate before bouncing unsigned users. Redirecting while
  // session is still null drops cold deep links (e.g. /profile/…) into login,
  // which then replaces to home and loses the intended route.
  if (loading) {
    return (
      <View style={styles.boot} accessibilityState={{ busy: true }}>
        <HiveFlowBackground />
        <ActivityIndicator color={colors.teal} />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/auth/worker/login" />;
  }

  if (accountRejectionReason) {
    return <Redirect href="/auth/worker/rejected" />;
  }
  if (!canAccessWorkerShell) {
    return <Redirect href={homeRoute as never} />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: 'transparent' },
        tabBarShowLabel: true,
        tabBarStyle,
        tabBarActiveBackgroundColor: 'transparent',
        tabBarInactiveBackgroundColor: 'transparent',
        tabBarItemStyle: {
          paddingHorizontal: 0,
          backgroundColor: 'transparent',
        },
        tabBarBackground: () => <TabBarBackground />,
        tabBarButton: (props) => <AnimatedTabButton {...props} />,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.home'),
          tabBarAccessibilityLabel: t('tabs.home'),
          tabBarLabel: ({ focused }) => (
            <AnimatedTabLabel focused={focused} accent={TAB_ACCENTS.home}>
              {t('tabs.home')}
            </AnimatedTabLabel>
          ),
          tabBarIcon: ({ focused }) => (
            <AnimatedTabIcon
              focused={focused}
              icon="home-outline"
              iconFocused="home"
              accent={TAB_ACCENTS.home}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="shifts"
        listeners={{
          tabPress: () => {
            // Always land on the marketplace list (not calendar / detail).
            router.navigate('/(tabs)/shifts');
          },
        }}
        options={{
          title: t('tabs.shifts'),
          tabBarAccessibilityLabel: t('tabs.shifts'),
          tabBarLabel: ({ focused }) => (
            <AnimatedTabLabel focused={focused} accent={TAB_ACCENTS.shifts}>
              {t('tabs.shifts')}
            </AnimatedTabLabel>
          ),
          tabBarIcon: ({ focused }) => (
            <AnimatedTabIcon
              focused={focused}
              icon="calendar-clear-outline"
              iconFocused="calendar"
              accent={TAB_ACCENTS.shifts}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="work"
        options={{
          title: t('tabs.myShifts'),
          tabBarAccessibilityLabel: t('tabs.myShifts'),
          // Center FAB only — do NOT set tabBarShowLabel: false here; that option
          // applies to the whole bar while this tab is focused and hides Home/Shifts/etc.
          tabBarLabel: () => null,
          tabBarIcon: () => null,
          tabBarItemStyle: {
            paddingHorizontal: 0,
            backgroundColor: 'transparent',
            overflow: 'visible',
          },
        }}
      />
      <Tabs.Screen
        name="payments"
        options={{
          title: t('tabs.earnings'),
          tabBarAccessibilityLabel: t('tabs.earnings'),
          tabBarLabel: ({ focused }) => (
            <AnimatedTabLabel focused={focused} accent={TAB_ACCENTS.finances}>
              {t('tabs.earnings')}
            </AnimatedTabLabel>
          ),
          tabBarIcon: ({ focused }) => (
            <AnimatedTabIcon
              focused={focused}
              icon="cash-outline"
              iconFocused="cash"
              accent={TAB_ACCENTS.finances}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="invoices"
        options={{
          href: null,
          title: t('tabs.invoices'),
        }}
      />
      <Tabs.Screen
        name="profile"
        listeners={({ navigation }) => ({
          tabPress: () => {
            // Always land on the More settings list — not a stale nested
            // screen (payout, documents, etc.) left from a prior visit.
            navigation.navigate('profile', { screen: 'index' });
          },
        })}
        options={{
          title: t('tabs.more'),
          tabBarAccessibilityLabel: t('tabs.more'),
          tabBarLabel: ({ focused }) => (
            <AnimatedTabLabel focused={focused} accent={TAB_ACCENTS.more}>
              {t('tabs.more')}
            </AnimatedTabLabel>
          ),
          tabBarIcon: ({ focused }) => (
            <AnimatedTabIcon
              focused={focused}
              icon="apps-outline"
              iconFocused="apps"
              accent={TAB_ACCENTS.more}
            />
          ),
        }}
      />
      {/* Shell destinations — keep tab bar, hide from the tab strip. */}
      <Tabs.Screen name="support" options={{ href: null, title: t('profile.support') }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
