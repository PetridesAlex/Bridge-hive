import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { HiveFlowBackground } from '@/components/brand/HiveFlowBackground';
import { colors } from '@/constants/theme';
import { useTranslation } from '@/i18n/locale-provider';

/** Shown between choosing a sign-in account and entering the workspace. */
export function AuthHandoffLoader() {
  const { t } = useTranslation();
  return (
    <View
      style={styles.root}
      accessibilityRole="progressbar"
      accessibilityLabel={t('auth.signIn')}
      accessibilityState={{ busy: true }}
    >
      <HiveFlowBackground />
      <ActivityIndicator color={colors.teal} size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
