import { Redirect } from 'expo-router';
import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { colors } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';

export default function Index() {
  const { session, loading, homeRoute } = useAuth();

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

  return <Redirect href={homeRoute as never} />;
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.navy,
  },
});
