import React from 'react';
import { Image, StyleSheet, type ImageStyle, type StyleProp } from 'react-native';

/** Official Bridge Hive app icon — used across auth, welcome, home chrome. */
const OFFICIAL_ICON = require('../../assets/images/icon.png');

/**
 * Transparent official mark (navy rounded tile kept; no white canvas).
 * Boot splash only — transparent mark on the navy launch canvas.
 */
const BOOT_MARK = require('../../assets/images/splash-icon.png');

/** Official Bridge Hive mark for in-app chrome (Apple/Android cover icon). */
export function BridgeHiveMark({
  size = 40,
  style,
  variant = 'app',
}: {
  size?: number;
  style?: StyleProp<ImageStyle>;
  /** `boot` uses the transparent mark; default `app` keeps the square home-screen icon. */
  variant?: 'app' | 'boot';
}) {
  const isBoot = variant === 'boot';
  return (
    <Image
      source={isBoot ? BOOT_MARK : OFFICIAL_ICON}
      accessibilityIgnoresInvertColors
      style={[
        styles.mark,
        { width: size, height: size },
        // App chrome clips to a soft squircle; boot mark is already a transparent tile — do not re-clip.
        !isBoot ? { borderRadius: size * 0.22 } : null,
        style,
      ]}
      resizeMode="contain"
    />
  );
}

const styles = StyleSheet.create({
  mark: {
    flexShrink: 0,
  },
});
