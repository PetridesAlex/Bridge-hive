import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Platform, StyleSheet, Text, View } from 'react-native';

import { ProfileMenuRow } from '@/components/profile/ProfileMenuRow';
import { SignOutButton } from '@/components/profile/SignOutButton';
import { AppScreen } from '@/components/ui/AppScreen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { colors, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';

export default function ProfileScreen() {
  const { profile, workerProfile, roleLabel, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  const onSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      router.replace('/welcome');
    } finally {
      setSigningOut(false);
    }
  };

  const confirmSignOut = () => {
    // Alert.alert multi-button dialogs are unreliable on React Native Web;
    // use window.confirm so Expo web actually reaches signOut().
    if (Platform.OS === 'web') {
      const confirmed =
        typeof window !== 'undefined' &&
        window.confirm('End your Bridge Hive session?');
      if (confirmed) void onSignOut();
      return;
    }

    Alert.alert('Sign out', 'End your Bridge Hive session?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => void onSignOut() },
    ]);
  };

  return (
    <AppScreen edges={['top']}>
      <ScreenHeader title="Profile" subtitle="Worker account" />
      <View style={styles.card}>
        <Text style={styles.name}>{profile?.full_name ?? 'Worker'}</Text>
        <Text style={styles.meta}>{roleLabel}</Text>
        <Text style={styles.meta}>
          Verification: {(workerProfile?.verification_status ?? 'draft').replace(/_/g, ' ')}
        </Text>
        {profile?.phone ? <Text style={styles.meta}>{profile.phone}</Text> : null}
      </View>

      <ProfileMenuRow
        icon="person-outline"
        label="Account settings"
        onPress={() => router.push('/profile/account')}
        tint="navy"
      />
      <ProfileMenuRow
        icon="document-text-outline"
        label="Credentials"
        onPress={() => router.push('/documents')}
        tint="indigo"
      />
      <ProfileMenuRow
        icon="card-outline"
        label="Payout account"
        onPress={() => router.push('/payout-setup')}
        tint="navy"
      />
      <ProfileMenuRow
        icon="wallet-outline"
        label="Payments"
        onPress={() => router.push('/(tabs)/payments')}
        tint="green"
      />
      <ProfileMenuRow
        icon="notifications-outline"
        label="Notifications"
        onPress={() => router.push('/notifications')}
        tint="orange"
        last
      />

      <SignOutButton onPress={confirmSignOut} loading={signingOut} />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: spacing.lg,
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  name: {
    fontFamily: typography.fonts.display,
    fontSize: 22,
    color: colors.text,
  },
  meta: {
    fontFamily: typography.fonts.regular,
    fontSize: 14,
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
});
