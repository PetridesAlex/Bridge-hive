import { Redirect, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import {
  ProfileMenuRow,
  type SettingsIconColor,
} from '@/components/profile/ProfileMenuRow';
import { SignOutButton } from '@/components/profile/SignOutButton';
import { AppScreen } from '@/components/ui/AppScreen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { colors, radii, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';

type MenuItem = {
  key: string;
  label: string;
  icon: React.ComponentProps<typeof ProfileMenuRow>['icon'];
  href: string;
  tint: SettingsIconColor;
};

const PROFILE_ITEMS: MenuItem[] = [
  {
    key: 'personal',
    label: 'Personal Information',
    icon: 'person',
    href: '/profile/personal',
    tint: 'blue',
  },
  {
    key: 'professional',
    label: 'Professional Information',
    icon: 'medkit',
    href: '/profile/professional',
    tint: 'teal',
  },
  {
    key: 'experience',
    label: 'Work Experience',
    icon: 'briefcase',
    href: '/profile/experience',
    tint: 'orange',
  },
  {
    key: 'qualifications',
    label: 'Qualifications',
    icon: 'school',
    href: '/profile/qualifications',
    tint: 'indigo',
  },
];

const WORK_ITEMS: MenuItem[] = [
  {
    key: 'documents',
    label: 'Documents',
    icon: 'document-text',
    href: '/documents',
    tint: 'blue',
  },
  {
    key: 'availability',
    label: 'Availability',
    icon: 'calendar',
    href: '/availability',
    tint: 'red',
  },
  {
    key: 'locations',
    label: 'Preferred Locations',
    icon: 'location',
    href: '/profile/locations',
    tint: 'green',
  },
  {
    key: 'departments',
    label: 'Preferred Departments',
    icon: 'business',
    href: '/profile/departments',
    tint: 'purple',
  },
];

const ACCOUNT_ITEMS: MenuItem[] = [
  {
    key: 'payment',
    label: 'Payment Information',
    icon: 'card',
    href: '/profile/payment',
    tint: 'green',
  },
  {
    key: 'emergency',
    label: 'Emergency Contact',
    icon: 'call',
    href: '/profile/emergency',
    tint: 'red',
  },
  {
    key: 'settings',
    label: 'Notification Settings',
    icon: 'notifications',
    href: '/profile/settings',
    tint: 'red',
  },
  {
    key: 'calendar',
    label: 'Calendar Sync',
    icon: 'sync',
    href: '/profile/calendar',
    tint: 'orange',
  },
  {
    key: 'support',
    label: 'Support',
    icon: 'help-circle',
    href: '/profile/support',
    tint: 'gray',
  },
];

function SettingsGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.group}>
      <Text style={styles.groupTitle}>{title}</Text>
      <View style={styles.menu}>{children}</View>
    </View>
  );
}

export default function ProfileAccountScreen() {
  const router = useRouter();
  const { session, loading, signOut, isSuperAdmin } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  if (!loading && !session) {
    return <Redirect href="/welcome" />;
  }

  const onSignOut = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          setSigningOut(true);
          await signOut();
          setSigningOut(false);
          router.replace('/welcome');
        },
      },
    ]);
  };

  return (
    <AppScreen>
      <ScreenHeader title="Account" showBack subtitle="Credentials & settings" />

      {isSuperAdmin ? (
        <SettingsGroup title="Admin">
          <ProfileMenuRow
            icon="shield-checkmark"
            label="Super Admin Console"
            tint="navy"
            onPress={() => router.push('/admin')}
            last
          />
        </SettingsGroup>
      ) : null}

      <SettingsGroup title="Professional details">
        {PROFILE_ITEMS.map((item, index) => (
          <ProfileMenuRow
            key={item.key}
            icon={item.icon}
            label={item.label}
            tint={item.tint}
            onPress={() => router.push(item.href as never)}
            last={index === PROFILE_ITEMS.length - 1}
          />
        ))}
      </SettingsGroup>

      <SettingsGroup title="Shifts & preferences">
        {WORK_ITEMS.map((item, index) => (
          <ProfileMenuRow
            key={item.key}
            icon={item.icon}
            label={item.label}
            tint={item.tint}
            onPress={() => router.push(item.href as never)}
            last={index === WORK_ITEMS.length - 1}
          />
        ))}
      </SettingsGroup>

      <SettingsGroup title="Account">
        {ACCOUNT_ITEMS.map((item, index) => (
          <ProfileMenuRow
            key={item.key}
            icon={item.icon}
            label={item.label}
            tint={item.tint}
            onPress={() => router.push(item.href as never)}
            last={index === ACCOUNT_ITEMS.length - 1}
          />
        ))}
      </SettingsGroup>

      <SignOutButton loading={signingOut} onPress={onSignOut} />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  group: {
    marginBottom: spacing.xl,
  },
  groupTitle: {
    fontFamily: typography.fonts.regular,
    fontSize: 13,
    color: '#6D6D72',
    textTransform: 'uppercase',
    letterSpacing: 0.2,
    marginLeft: spacing.lg + 4,
    marginBottom: 7,
  },
  menu: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
});
