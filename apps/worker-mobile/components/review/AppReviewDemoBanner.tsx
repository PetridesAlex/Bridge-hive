import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { radii, spacing, typography } from '@/constants/theme';

/** Persistent, non-dismissible notice for App Review demonstration accounts. */
export function AppReviewDemoBanner() {
  return (
    <View
      style={styles.wrap}
      accessibilityRole="summary"
      accessibilityLabel="App Review demonstration account"
    >
      <Text style={styles.title}>App Review demonstration account</Text>
      <Text style={styles.body}>
        This account contains safe sample data and cannot access live work or payments.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.md,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: 'rgba(20, 169, 181, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(20, 169, 181, 0.32)',
    gap: 4,
  },
  title: {
    fontFamily: typography.fonts.semibold,
    fontSize: 14,
    color: '#0C3E56',
  },
  body: {
    fontFamily: typography.fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(12, 62, 86, 0.82)',
  },
});
