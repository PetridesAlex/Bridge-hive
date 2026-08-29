import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '@/constants/theme';
import { Button } from '@/components/ui/Button';

type Props = {
  title: string;
  description?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({
  title,
  description,
  icon = 'file-tray-outline',
  actionLabel,
  onAction,
}: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={28} color={colors.blue} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} style={styles.btn} fullWidth={false} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingVertical: spacing.huge,
    paddingHorizontal: spacing.xl,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.blueLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.size.lg,
    color: colors.navy,
    textAlign: 'center',
  },
  description: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    lineHeight: typography.lineHeight.sm,
  },
  btn: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
});
