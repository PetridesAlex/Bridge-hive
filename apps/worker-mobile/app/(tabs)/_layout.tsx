import { Redirect, router, Tabs } from 'expo-router';
import React from 'react';

import {
  AnimatedTabButton,
  AnimatedTabIcon,
  AnimatedTabLabel,
  TAB_ACCENTS,
  TabBarBackground,
  useAdaptiveTabBarStyle,
} from '@/components/navigation/AnimatedTabBar';
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

  if (!session) {
    return <Redirect href="/auth/worker/login" />;
  }

  // Show the workspace shell immediately after login. Profile hydrate may still
  // be in flight — only redirect away once the bundle has settled.
  if (!loading) {
    if (accountRejectionReason) {
      return <Redirect href="/auth/worker/rejected" />;
    }
    if (!canAccessWorkerShell) {
      return <Redirect href={homeRoute as never} />;
    }
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
