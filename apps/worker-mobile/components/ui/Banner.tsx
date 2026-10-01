import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { Button } from '@/components/ui/Button';
import { colors, radii, spacing, typography } from '@/constants/theme';

export type BannerVariant = 'info' | 'success' | 'warning' | 'danger';

type Props = {
  title: string;
  body?: string;
  variant?: BannerVariant;
  icon?: keyof typeof Ionicons.glyphMap;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  style?: StyleProp<ViewStyle>;
};

const VARIANT: Record<
  BannerVariant,
  { bg: string; border: string; fg: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  info: {
    bg: colors.infoLight,
    border: colors.info,
    fg: colors.navy,
    icon: 'information-circle',
  },
  success: {
    bg: colors.successLight,
    border: colors.success,
    fg: colors.navy,
    icon: 'checkmark-circle',
  },
  warning: {
    bg: colors.warningLight,
    border: colors.warning,
    fg: colors.navy,
    icon: 'warning',
  },
  danger: {
    bg: colors.errorLight,
    border: colors.error,
    fg: colors.navy,
    icon: 'alert-circle',
  },
};

export function Banner({
  title,
  body,
  variant = 'info',
  icon,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  style,
}: Props) {
  const palette = VARIANT[variant];
  return (
    <View
      style={[styles.banner, { backgroundColor: palette.bg, borderColor: palette.border }, style]}
      accessibilityRole="alert"
    >
      <View style={styles.row}>
        <Ionicons name={icon ?? palette.icon} size={20} color={palette.border} />
        <View style={styles.copy}>
          <Text style={[styles.title, { color: palette.fg }]}>{title}</Text>
          {body ? <Text style={styles.body}>{body}</Text> : null}
        </View>
      </View>
      {actionLabel && onAction ? (
        <View style={styles.actions}>
          <Button label={actionLabel} variant="primary" size="sm" onPress={onAction} />
          {secondaryActionLabel && onSecondaryAction ? (
            <Button
              label={secondaryActionLabel}
              variant="secondary"
              size="sm"
              onPress={onSecondaryAction}
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderRadius: radii.md,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  copy: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  title: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
  },
  body: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.size.xs,
    lineHeight: typography.lineHeight.xs,
    color: colors.textSecondary,
  },
  actions: {
    gap: spacing.sm,
  },
});
