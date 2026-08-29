import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '@/constants/theme';

type Props = {
  title: string;
  eyebrow?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function SectionHeader({ title, eyebrow, actionLabel, onAction }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <View style={styles.left}>
          <View style={styles.accent} />
          <View style={styles.copy}>
            {eyebrow ? (
              <Text style={styles.eyebrow} numberOfLines={1}>
                {eyebrow}
              </Text>
            ) : null}
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
          </View>
        </View>
        {actionLabel && onAction ? (
          <Pressable
            onPress={onAction}
            hitSlop={8}
            accessibilityRole="button"
            style={styles.actionBtn}
          >
            <Text style={styles.action} numberOfLines={1}>
              {actionLabel}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.md,
    marginTop: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  left: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  accent: {
    width: 3,
    height: 22,
    borderRadius: radii.full,
    backgroundColor: colors.yellow,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  eyebrow: {
    fontFamily: typography.fonts.semibold,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.textMuted,
  },
  title: {
    fontFamily: typography.fonts.displayExtra,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.5,
    color: colors.navy,
  },
  actionBtn: {
    flexShrink: 0,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    backgroundColor: colors.blueLight,
  },
  action: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.size.sm,
    color: colors.blue,
  },
});
