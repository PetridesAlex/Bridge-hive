import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, radii, spacing, touchTarget, typography } from '@/constants/theme';

export type ButtonVariant = 'primary' | 'brand' | 'secondary' | 'dark' | 'danger' | 'ghost';
export type ButtonSize = 'md' | 'lg' | 'sm';

type Props = {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  fullWidth?: boolean;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  style,
  fullWidth = true,
}: Props) {
  const isDisabled = disabled || loading;
  const palette = variantStyles[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      style={({ pressed }) => [
        styles.base,
        sizeStyles[size],
        { backgroundColor: palette.bg, borderColor: palette.border },
        fullWidth && styles.fullWidth,
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <Text style={[styles.label, size === 'sm' && styles.labelSm, { color: palette.fg }]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const variantStyles: Record<ButtonVariant, { bg: string; fg: string; border: string }> = {
  primary: { bg: colors.navy, fg: colors.white, border: colors.navy },
  brand: { bg: colors.yellow, fg: colors.navy, border: colors.yellow },
  secondary: { bg: colors.white, fg: colors.navy, border: colors.border },
  dark: { bg: colors.navySoft, fg: colors.white, border: colors.navySoft },
  danger: { bg: colors.errorLight, fg: colors.error, border: colors.errorLight },
  ghost: { bg: 'transparent', fg: colors.navy, border: 'transparent' },
};

const sizeStyles = StyleSheet.create({
  sm: { minHeight: 36, paddingHorizontal: spacing.md },
  md: { minHeight: touchTarget, paddingHorizontal: spacing.lg },
  lg: { minHeight: 52, paddingHorizontal: spacing.xl },
});

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  label: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.size.md,
  },
  labelSm: {
    fontSize: typography.size.sm,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
  disabled: {
    opacity: 0.5,
  },
});
