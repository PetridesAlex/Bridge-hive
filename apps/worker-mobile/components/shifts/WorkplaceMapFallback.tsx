import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '@/constants/theme';

/** Address-card stand-in when an interactive map cannot be shown. */
export function WorkplaceMapFallback({ height, fill = false }: { height: number; fill?: boolean }) {
  return (
    <View style={[styles.fallback, fill ? styles.fill : { height }]}>
      <Ionicons name="map-outline" size={28} color={colors.tealStrong} />
      <Text style={styles.text}>Open directions for the interactive map.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceSubdued,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.lg,
  },
  fill: {
    flex: 1,
  },
  text: {
    fontFamily: typography.fonts.medium,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
