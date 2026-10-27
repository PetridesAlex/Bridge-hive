import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Button } from '@/components/ui/Button';
import { colors, radii, shadows, spacing, typography } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/useReducedMotion';

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
  {
    bg: string;
    border: string;
    fg: string;
    body: string;
    icon: keyof typeof Ionicons.glyphMap;
    iconBg: readonly [string, string];
  }
> = {
  info: {
    bg: colors.infoLight,
    border: colors.info,
    fg: colors.navy,
    body: colors.textSecondary,
    icon: 'information-circle',
    iconBg: [colors.navy, colors.tealStrong],
  },
  success: {
    bg: '#E8F7EE',
    border: colors.success,
    fg: '#0B3D24',
    body: '#1F5C3A',
    icon: 'checkmark-circle',
    iconBg: ['#146C43', colors.success],
  },
  warning: {
    bg: colors.warningLight,
    border: colors.warning,
    fg: colors.navy,
    body: colors.textSecondary,
    icon: 'warning',
    iconBg: [colors.navy, colors.warning],
  },
  danger: {
    bg: '#B42318',
    border: '#8F1A12',
    fg: colors.white,
    body: 'rgba(255, 255, 255, 0.88)',
    icon: 'alert-circle',
    iconBg: ['rgba(255,255,255,0.22)', 'rgba(255,255,255,0.12)'],
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
  const reduced = useReducedMotion();
  const isSuccess = variant === 'success';

  return (
    <Animated.View
      entering={reduced ? undefined : FadeInDown.duration(360)}
      style={[
        styles.banner,
        {
          backgroundColor: palette.bg,
          borderColor: palette.border,
        },
        isSuccess && styles.bannerSuccess,
        style,
      ]}
      accessibilityRole="alert"
    >
      {isSuccess ? (
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(25, 135, 84, 0.14)', 'rgba(25, 135, 84, 0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      <View style={styles.row}>
        <LinearGradient
          colors={palette.iconBg}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.iconWrap}
        >
          <Ionicons name={icon ?? palette.icon} size={16} color={colors.white} />
        </LinearGradient>
        <View style={styles.copy}>
          <Text style={[styles.title, { color: palette.fg }]}>{title}</Text>
          {body ? (
            <Text style={[styles.body, { color: palette.body }]}>{body}</Text>
          ) : null}
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
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderRadius: radii.xl,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    overflow: 'hidden',
    position: 'relative',
  },
  bannerSuccess: {
    ...shadows.md,
    borderWidth: 1,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  copy: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  title: {
    fontFamily: typography.fonts.semibold,
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: -0.1,
  },
  body: {
    fontFamily: typography.fonts.regular,
    fontSize: 13,
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingLeft: 40,
  },
});
