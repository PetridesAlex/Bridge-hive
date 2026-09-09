import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, typography } from '@/constants/theme';

type Props = {
  initials: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
  backgroundColor?: string;
  textColor?: string;
};

export function Avatar({
  initials,
  size = 48,
  style,
  backgroundColor = colors.blueLight,
  textColor = colors.navy,
}: Props) {
  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            color: textColor,
            fontSize: size * 0.34,
          },
        ]}
      >
        {initials}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontFamily: typography.fonts.bold,
  },
});
