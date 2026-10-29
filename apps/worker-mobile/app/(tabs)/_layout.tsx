import { Redirect, Tabs } from 'expo-router';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';

import { HiveFlowBackground } from '@/components/brand/HiveFlowBackground';
import {
  AnimatedTabButton,
  AnimatedTabIcon,
  AnimatedTabLabel,
  TAB_ACCENTS,
  TabBarBackground,
  useAdaptiveTabBarStyle,
} from '@/components/navigation/AnimatedTabBar';
import { colors } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';

export default function TabsLayout() {
  const {
    loading,
    session,
    canAccessWorkerShell,
    accountRejectionReason,
    homeRoute,
  } = useAuth();
  const tabBarStyle = useAdaptiveTabBarStyle();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
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
        tabBarItemStyle: {
          paddingHorizontal: 0,
        },
        tabBarBackground: () => <TabBarBackground />,
        tabBarButton: (props) => <AnimatedTabButton {...props} />,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarAccessibilityLabel: 'Home',
          tabBarLabel: ({ focused }) => (
            <AnimatedTabLabel focused={focused} accent={TAB_ACCENTS.home}>
              Home
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
        options={{
          title: 'Shifts',
          tabBarAccessibilityLabel: 'Shifts',
          tabBarLabel: ({ focused }) => (
            <AnimatedTabLabel focused={focused} accent={TAB_ACCENTS.shifts}>
              Shifts
            </AnimatedTabLabel>
          ),
          tabBarIcon: ({ focused }) => (
            <AnimatedTabIcon
              focused={focused}
              icon="calendar-outline"
              iconFocused="calendar"
              accent={TAB_ACCENTS.shifts}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="work"
        options={{
          title: 'My shifts',
          tabBarAccessibilityLabel: 'My shifts',
          // Center action button: no text label, the raised honey button is the tab.
          tabBarLabel: () => null,
          tabBarIcon: ({ focused }) => (
            <AnimatedTabIcon
              variant="fab"
              focused={focused}
              icon="briefcase"
              iconFocused="briefcase"
              accent={TAB_ACCENTS.work}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="payments"
        options={{
          title: 'Earnings',
          tabBarAccessibilityLabel: 'Earnings',
          tabBarLabel: ({ focused }) => (
            <AnimatedTabLabel focused={focused} accent={TAB_ACCENTS.finances}>
              Earnings
            </AnimatedTabLabel>
          ),
          tabBarIcon: ({ focused }) => (
            <AnimatedTabIcon
              focused={focused}
              icon="wallet-outline"
              iconFocused="wallet"
              accent={TAB_ACCENTS.finances}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="invoices"
        options={{
          href: null,
          title: 'Invoices',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'More',
          tabBarAccessibilityLabel: 'More',
          tabBarLabel: ({ focused }) => (
            <AnimatedTabLabel focused={focused} accent={TAB_ACCENTS.more}>
              More
            </AnimatedTabLabel>
          ),
          tabBarIcon: ({ focused }) => (
            <AnimatedTabIcon
              focused={focused}
              icon="grid-outline"
              iconFocused="grid"
              accent={TAB_ACCENTS.more}
            />
          ),
        }}
      />
    </Tabs>
  );
}
