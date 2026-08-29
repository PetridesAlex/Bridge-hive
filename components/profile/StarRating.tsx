import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '@/constants/theme';

type Props = {
  rating: number;
  size?: number;
  color?: string;
  emptyColor?: string;
  showValue?: boolean;
  valueStyle?: object;
};

export function StarRating({
  rating,
  size = 16,
  color = colors.yellow,
  emptyColor = 'rgba(255,255,255,0.22)',
  showValue = false,
  valueStyle,
}: Props) {
  const clamped = Math.max(0, Math.min(5, rating));
  const full = Math.floor(clamped);
  const hasHalf = clamped - full >= 0.4 && clamped - full < 0.9;
  const stars = Array.from({ length: 5 }, (_, i) => {
    if (i < full) return 'star' as const;
    if (i === full && hasHalf) return 'star-half' as const;
    return 'star-outline' as const;
  });

  return (
    <View style={styles.row}>
      {stars.map((name, i) => (
        <Ionicons
          key={`${name}-${i}`}
          name={name}
          size={size}
          color={name === 'star-outline' ? emptyColor : color}
        />
      ))}
      {showValue ? (
        <Text style={[styles.value, valueStyle]}>{clamped.toFixed(1)}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  value: {
    marginLeft: spacing.xs,
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 14,
    color: colors.navy,
  },
});
