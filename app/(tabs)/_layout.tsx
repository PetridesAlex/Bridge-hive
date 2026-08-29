import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AnimatedTabButton,
  AnimatedTabIcon,
  TAB_ACCENTS,
  TabBarBackground,
  type TabAccent,
} from '@/components/navigation/AnimatedTabBar';
import { colors } from '@/constants/theme';
import { layout, useLayout } from '@/hooks/useLayout';
import { useAuth } from '@/providers/AuthProvider';

type TabConfig = {
  name: string;
  title: string;
  shortTitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconFocused: keyof typeof Ionicons.glyphMap;
  accent: TabAccent;
};

const TABS: TabConfig[] = [
  {
    name: 'index',
    title: 'Home',
    shortTitle: 'Home',
    icon: 'home-outline',
    iconFocused: 'home',
    accent: TAB_ACCENTS.home,
  },
  {
    name: 'shifts',
    title: 'Shifts',
    shortTitle: 'Shifts',
    icon: 'briefcase-outline',
    iconFocused: 'briefcase',
    accent: TAB_ACCENTS.shifts,
  },
  {
    name: 'community',
    title: 'Community',
    shortTitle: 'Social',
    icon: 'people-outline',
    iconFocused: 'people',
    accent: TAB_ACCENTS.community,
  },
  {
    name: 'finances',
    title: 'Finances',
    shortTitle: 'Pay',
    icon: 'wallet-outline',
    iconFocused: 'wallet',
    accent: TAB_ACCENTS.finances,
  },
  {
    name: 'profile',
    title: 'Profile',
    shortTitle: 'You',
    icon: 'person-outline',
    iconFocused: 'person',
    accent: TAB_ACCENTS.profile,
  },
];

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const { width, isCompact } = useLayout();
  const { session, loading, accountType, homeRoute } = useAuth();
  const bottomPad = Math.max(insets.bottom, Platform.OS === 'web' ? 12 : 8);
  const barMaxWidth = Math.min(width, layout.contentMaxWidth);

  if (loading) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color={colors.yellow} size="large" />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/welcome" />;
  }

  if (accountType !== 'PROFESSIONAL' && accountType !== 'SUPER_ADMIN') {
    return <Redirect href={homeRoute as never} />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: colors.yellow,
        tabBarInactiveTintColor: 'rgba(255,255,255,0.42)',
        tabBarHideOnKeyboard: true,
        // Keep tabs mounted so switches are instant (no remount flash).
        lazy: false,
        freezeOnBlur: true,
        animation: 'none',
        tabBarBackground: () => <TabBarBackground />,
        tabBarStyle: [
          styles.tabBar,
          {
            height: 68 + bottomPad,
            paddingBottom: bottomPad,
            maxWidth: barMaxWidth,
            alignSelf: 'center',
            width: '100%',
          },
        ],
        tabBarItemStyle: styles.tabBarItem,
        tabBarButton: (props) => <AnimatedTabButton {...props} />,
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarAccessibilityLabel: tab.title,
            tabBarIcon: ({ focused }) => (
              <AnimatedTabIcon
                focused={focused}
                title={tab.title}
                shortTitle={tab.shortTitle}
                compact={isCompact}
                icon={tab.icon}
                iconFocused={tab.iconFocused}
                accent={tab.accent}
              />
            ),
          }}
        />
      ))}
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
  tabBar: {
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    paddingTop: 10,
    elevation: 0,
    shadowOpacity: 0,
  },
  tabBarItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
