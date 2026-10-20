import React from 'react';
import { Image, StyleSheet, type ImageStyle, type StyleProp } from 'react-native';

/** Official Bridge Hive transparent mark — used across auth, welcome, home, and launch. */
const OFFICIAL_MARK = require('../../assets/images/brand-mark.png');

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
      source={OFFICIAL_MARK}
      accessibilityIgnoresInvertColors
      style={[styles.mark, { width: size, height: size }, style]}
      resizeMode="contain"
    />
  );
}

const styles = StyleSheet.create({
  mark: {
    flexShrink: 0,
  },
});
