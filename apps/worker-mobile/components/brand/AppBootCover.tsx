import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BridgeHiveMark } from '@/components/brand/BridgeHiveMark';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { typography } from '@/constants/theme';

/** Native-splash-matching navy used for the post-splash JS boot cover. */
export const APP_BOOT_NAVY = '#071A2F';

/**
 * Continuity cover after the native Expo splash closes (fonts / auth loading).
 * Must stay navy — never flash to a pale or white canvas.
 */
export function AppBootCover() {
  const reducedMotion = useReducedMotion();

  return (
    <View
      style={styles.root}
      accessibilityRole="progressbar"
      accessibilityLabel="BridgeHive App loading"
    >
      {!reducedMotion ? <View pointerEvents="none" style={styles.glowTeal} /> : null}
      {!reducedMotion ? <View pointerEvents="none" style={styles.glowGold} /> : null}
      <BridgeHiveMark size={88} style={styles.mark} />
      <Text style={styles.title}>BridgeHive App</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: APP_BOOT_NAVY,
    paddingHorizontal: 24,
  },
  glowTeal: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(20, 169, 181, 0.16)',
  },
  glowGold: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(245, 197, 24, 0.12)',
    transform: [{ translateY: -12 }],
  },
  mark: {
    marginBottom: 18,
  },
  title: {
    fontFamily: typography.fonts.semibold,
    fontSize: 20,
    letterSpacing: -0.2,
    color: '#F8FBFD',
    textAlign: 'center',
  },
});
