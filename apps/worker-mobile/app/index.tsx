import { Redirect } from 'expo-router';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';

import { colors } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';

export default function IndexScreen() {
  const { loading, session, homeRoute } = useAuth();

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

  return <Redirect href={homeRoute as never} />;
}
