import React from 'react';
import { Image, StyleSheet, type ImageStyle, type StyleProp } from 'react-native';

const MARK = require('../../assets/images/brand-mark.png');

/** Official navy-tile Bridge Hive mark for in-app chrome (not the launcher asset). */
export function BridgeHiveMark({
  size = 40,
  style,
}: {
  size?: number;
  style?: StyleProp<ImageStyle>;
}) {
  return (
    <Image
      source={MARK}
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
