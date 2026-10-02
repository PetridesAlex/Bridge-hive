import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '@/constants/theme';

type Props = {
  onPress: () => void;
  loading?: boolean;
  label?: string;
};

/** Light destructive-adjacent sign-out row — not a navy slab. */
export function SignOutButton({
  onPress,
  loading = false,
  label = 'Sign out',
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: loading, busy: loading }}
      style={({ pressed }) => [styles.shell, pressed && styles.pressed]}
    >
      <View style={styles.iconWrap}>
        {loading ? (
          <ActivityIndicator color={colors.error} size="small" />
        ) : (
          <Ionicons name="log-out-outline" size={20} color={colors.error} />
        )}
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>{loading ? 'Signing out…' : label}</Text>
        <Text style={styles.subtitle}>End your Bridge Hive session securely</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: 64,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  pressed: {
    backgroundColor: colors.surfaceSubdued,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: colors.errorLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  title: {
    fontFamily: typography.fonts.semibold,
    fontSize: 15,
    color: colors.error,
  },
  subtitle: {
    fontFamily: typography.fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
  },
});
