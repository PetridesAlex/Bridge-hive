import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, typography } from '@/constants/theme';

type Props = {
  name: string;
  verified?: boolean;
  compact?: boolean;
  light?: boolean;
};

export function OrganizationBadge({ name, verified = false, compact = false, light = false }: Props) {
  return (
    <View style={styles.row}>
      <Text
        style={[
          compact ? styles.nameCompact : styles.name,
          light && styles.light,
        ]}
        numberOfLines={2}
      >
        {name}
      </Text>
      {verified ? (
        <View style={styles.verified}>
          <Ionicons name="checkmark-circle" size={14} color={colors.yellow} />
          {!compact ? (
            <Text style={[styles.verifiedText, light && styles.lightMuted]}>Verified Organization</Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: 4,
  },
  name: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: typography.size.lg,
    lineHeight: 24,
    letterSpacing: -0.3,
    color: colors.navy,
  },
  nameCompact: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: -0.25,
    color: colors.navy,
  },
  verified: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  verifiedText: {
    fontFamily: typography.fonts.medium,
    fontSize: typography.size.xs,
    color: colors.navyLift,
  },
  light: {
    color: colors.white,
  },
  lightMuted: {
    color: 'rgba(255,255,255,0.75)',
  },
});
