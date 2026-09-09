import { Redirect, Tabs } from 'expo-router';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';

import {
  AnimatedTabButton,
  AnimatedTabIcon,
  TAB_ACCENTS,
  TabBarBackground,
} from '@/components/navigation/AnimatedTabBar';
import { colors } from '@/constants/theme';
import { useLayout } from '@/hooks/useLayout';
import { useAuth } from '@/providers/AuthProvider';

export default function TabsLayout() {
  const { loading, session, isVerified, accountRejectionReason, homeRoute } = useAuth();
  const { isCompact } = useLayout();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.navy} />
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
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          elevation: 0,
          height: isCompact ? 64 : 72,
          paddingBottom: 8,
        },
        tabBarBackground: () => <TabBarBackground />,
        tabBarButton: (props) => <AnimatedTabButton {...props} />,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => (
            <AnimatedTabIcon
              focused={focused}
              title="Home"
              shortTitle="Home"
              compact={isCompact}
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
          tabBarIcon: ({ focused }) => (
            <AnimatedTabIcon
              focused={focused}
              title="Shifts"
              shortTitle="Shifts"
              compact={isCompact}
              icon="calendar-outline"
              iconFocused="calendar"
              accent={TAB_ACCENTS.shifts}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="payments"
        options={{
          title: 'Payments',
          tabBarIcon: ({ focused }) => (
            <AnimatedTabIcon
              focused={focused}
              title="Payments"
              shortTitle="Pay"
              compact={isCompact}
              icon="wallet-outline"
              iconFocused="wallet"
              accent={TAB_ACCENTS.finances}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => (
            <AnimatedTabIcon
              focused={focused}
              title="Profile"
              shortTitle="Me"
              compact={isCompact}
              icon="person-outline"
              iconFocused="person"
              accent={TAB_ACCENTS.profile}
            />
          ),
        }}
      />
    </Tabs>
  );
}
