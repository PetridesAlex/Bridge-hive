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
} from '@/components/navigation/AnimatedTabBar';
import { colors } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';

export default function TabsLayout() {
  const { loading, session, isVerified, accountRejectionReason, homeRoute } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <HiveFlowBackground />
        <ActivityIndicator color={colors.teal} />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/welcome" />;
  }

  if (accountRejectionReason) {
    return <Redirect href="/auth/worker/rejected" />;
  }

  if (!isVerified) {
    return <Redirect href={homeRoute as never} />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: 'transparent' },
        tabBarShowLabel: true,
        tabBarStyle: {
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          elevation: 12,
          shadowColor: '#0B2A43',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
          height: 68,
          paddingBottom: 8,
          paddingTop: 4,
        },
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
          tabBarLabel: ({ focused }) => (
            <AnimatedTabLabel focused={focused} accent={TAB_ACCENTS.work}>
              My shifts
            </AnimatedTabLabel>
          ),
          tabBarIcon: ({ focused }) => (
            <AnimatedTabIcon
              focused={focused}
              icon="briefcase-outline"
              iconFocused="briefcase"
              accent={TAB_ACCENTS.work}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="payments"
        options={{
          title: 'Money',
          tabBarAccessibilityLabel: 'Money',
          tabBarLabel: ({ focused }) => (
            <AnimatedTabLabel focused={focused} accent={TAB_ACCENTS.finances}>
              Money
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
              icon="menu-outline"
              iconFocused="menu"
              accent={TAB_ACCENTS.more}
            />
          ),
        }}
      />
    </Tabs>
  );
}
