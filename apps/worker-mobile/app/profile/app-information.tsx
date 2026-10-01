import Constants from 'expo-constants';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/ui/AppScreen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { colors, radii, spacing, typography } from '@/constants/theme';

export default function AppInformationScreen() {
  const version =
    Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? '1.0.0';
  const build =
    Constants.expoConfig?.ios?.buildNumber ??
    Constants.expoConfig?.android?.versionCode?.toString() ??
    Constants.nativeBuildVersion ??
    null;

  return (
    <AppScreen contentKind="detail">
      <ScreenHeader
        title="App information"
        showBack
        titleSize="detail"
        subtitle="Version details for this Bridge Hive worker install."
      />

      <View style={styles.card}>
        <Text style={styles.label}>Application</Text>
        <Text style={styles.value}>Bridge Hive Worker</Text>

        <Text style={styles.label}>Version</Text>
        <Text style={styles.value}>{version}</Text>

        {build ? (
          <>
            <Text style={styles.label}>Build</Text>
            <Text style={styles.value}>{build}</Text>
          </>
        ) : null}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  label: {
    fontFamily: typography.fonts.medium,
    fontSize: 13,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  value: {
    fontFamily: typography.fonts.regular,
    fontSize: 17,
    color: colors.navy,
  },
});
