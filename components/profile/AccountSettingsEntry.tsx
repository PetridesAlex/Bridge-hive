import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '@/constants/theme';

type Props = {
  title: string;
  subtitle: string;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
};

export function AccountSettingsEntry({
  title,
  subtitle,
  onPress,
  icon = 'settings-outline',
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={22} color={colors.yellow} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
      <View style={styles.chevron}>
        <Ionicons name="chevron-forward" size={18} color={colors.yellow} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.navy,
    borderRadius: radii.xl,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  pressed: {
    opacity: 0.92,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: radii.md,
    backgroundColor: 'rgba(245,176,0,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  title: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 16,
    letterSpacing: -0.3,
    color: colors.white,
  },
  subtitle: {
    fontFamily: typography.fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.65)',
  },
  chevron: {
    width: 32,
    height: 32,
    borderRadius: radii.full,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
