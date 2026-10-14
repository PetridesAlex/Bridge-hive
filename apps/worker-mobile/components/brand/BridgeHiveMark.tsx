import React from 'react';
import { Image, StyleSheet, type ImageStyle, type StyleProp } from 'react-native';

/** Official Bridge Hive app icon — used across auth, welcome, home, and launch. */
const OFFICIAL_ICON = require('../../assets/images/icon.png');

/** Official Bridge Hive mark for in-app chrome (Apple/Android cover icon). */
export function BridgeHiveMark({
  size = 40,
  style,
}: {
  size?: number;
  style?: StyleProp<ImageStyle>;
}) {
  return (
    <Image
      source={OFFICIAL_ICON}
      accessibilityIgnoresInvertColors
      style={[styles.mark, { width: size, height: size, borderRadius: size * 0.22 }, style]}
      resizeMode="contain"
    />
  );
}

const styles = StyleSheet.create({
  mark: {
    flexShrink: 0,
  },
});
