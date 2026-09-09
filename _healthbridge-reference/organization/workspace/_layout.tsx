import { Redirect, Stack } from 'expo-router';
import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { colors } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';

export default function OrgGroupLayout() {
  const { session, loading, accountType, isOrganizationVerified, homeRoute } = useAuth();

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

  if (accountType !== 'ORGANIZATION_USER') {
    return <Redirect href={homeRoute as never} />;
  }

  if (!isOrganizationVerified) {
    return <Redirect href="/auth/organization/pending" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="settings" />
    </Stack>
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
