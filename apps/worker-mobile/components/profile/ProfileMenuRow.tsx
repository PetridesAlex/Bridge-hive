import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '@/constants/theme';

/** iOS Settings–style icon tile colors */
export const settingsIconColors = {
  blue: '#007AFF',
  indigo: '#5856D6',
  purple: '#AF52DE',
  pink: '#FF2D55',
  red: '#FF3B30',
  orange: '#FF9500',
  yellow: '#FFCC00',
  green: '#34C759',
  teal: '#5AC8FA',
  gray: '#8E8E93',
  navy: '#071A2F',
} as const;

export type SettingsIconColor = keyof typeof settingsIconColors;

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  last?: boolean;
  /** Solid iOS-style icon background */
  tint?: SettingsIconColor;
  subtitle?: string;
  /** Trailing status / value shown before the chevron */
  trailing?: string | null;
  accessibilityHint?: string;
};

export function ProfileMenuRow({
  icon,
  label,
  onPress,
  last = false,
  tint = 'blue',
  subtitle,
  trailing,
  accessibilityHint,
}: Props) {
  const bg = settingsIconColors[tint];
  const a11yLabel = trailing ? `${label}, ${trailing}` : label;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      accessibilityHint={accessibilityHint ?? subtitle}
    >
      <View style={[styles.iconWrap, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={17} color={colors.white} />
      </View>
      <View style={[styles.content, !last && styles.contentBorder]}>
        <View style={styles.copy}>
          <Text style={styles.label} numberOfLines={1}>
            {label}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={2}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {trailing ? (
          <Text style={styles.trailing} numberOfLines={2}>
            {trailing}
          </Text>
        ) : null}
        <Ionicons name="chevron-forward" size={18} color="#C7C7CC" />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: spacing.lg,
    minHeight: 48,
    backgroundColor: colors.white,
  },
  pressed: {
    backgroundColor: '#E5E5EA',
  },
  iconWrap: {
    width: 29,
    height: 29,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingRight: spacing.lg,
    gap: spacing.sm,
    minHeight: 48,
  },
  contentBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#C6C6C8',
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  label: {
    fontFamily: typography.fonts.regular,
    fontSize: 17,
    letterSpacing: -0.2,
    color: colors.navy,
  },
  subtitle: {
    fontFamily: typography.fonts.regular,
    fontSize: 13,
    color: colors.textMuted,
  },
  trailing: {
    maxWidth: '42%',
    fontFamily: typography.fonts.regular,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'right',
  },
});
