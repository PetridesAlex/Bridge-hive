import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Chip } from '@/components/ui/Chip';
import { Card } from '@/components/ui/Card';
import { colors, radii, spacing, typography } from '@/constants/theme';

type Props = {
  title: string;
  items: string[];
  icon: keyof typeof Ionicons.glyphMap;
  emptyMessage: string;
  help: string;
};

export function PreferenceChipsSection({ title, items, icon, emptyMessage, help }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionLabel}>{title}</Text>
      <Card>
        <View style={styles.header}>
          <View style={styles.iconWrap}>
            <Ionicons name={icon} size={18} color={colors.blue} />
          </View>
          <Text style={styles.count}>
            {items.length} selected
          </Text>
        </View>
        {items.length === 0 ? (
          <Text style={styles.empty}>{emptyMessage}</Text>
        ) : (
          <View style={styles.chips}>
            {items.map((item) => (
              <Chip key={item} label={item} selected />
            ))}
          </View>
        )}
      </Card>
      <Text style={styles.help}>{help}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  sectionLabel: {
    fontFamily: typography.fonts.medium,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    backgroundColor: colors.blueLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  count: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.size.md,
    color: colors.navy,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  empty: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.size.sm,
    color: colors.textMuted,
  },
  help: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.textMuted,
    marginHorizontal: spacing.xs,
  },
});
