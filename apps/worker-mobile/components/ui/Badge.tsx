import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radii, spacing, typography } from '@/constants/theme';

type Props = {
  label: string;
  color?: string;
  backgroundColor?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: StyleProp<ViewStyle>;
};

export function Badge({
  label,
  color = colors.navy,
  backgroundColor = colors.blueLight,
  icon,
  style,
}: Props) {
  return (
    <View style={[styles.badge, { backgroundColor }, style]}>
      {icon ? <Ionicons name={icon} size={12} color={color} /> : null}
      <Text style={[styles.text, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.full,
    alignSelf: 'flex-start',
  },
  text: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.size.xs,
    letterSpacing: 0.2,
  },
});
