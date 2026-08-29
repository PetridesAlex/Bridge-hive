import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '@/constants/theme';

type Props = {
  eyebrow: string;
  title: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
};

export function SectionIntro({ eyebrow, title, subtitle, icon = 'star' }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.eyebrowRow}>
        <View style={styles.iconBadge}>
          <Ionicons name={icon} size={12} color={colors.navy} />
        </View>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 2,
  },
  iconBadge: {
    width: 22,
    height: 22,
    borderRadius: radii.sm,
    backgroundColor: colors.yellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: {
    fontFamily: typography.fonts.semibold,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.navyLift,
  },
  title: {
    fontFamily: typography.fonts.displayExtra,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.6,
    color: colors.navy,
  },
  subtitle: {
    fontFamily: typography.fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
