import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, View } from 'react-native';

/**
 * Soft light canvas for auth chrome.
 * Self-contained gradients only — no cross-app image asset dependency.
 */
export const hiveFlowCanvas = '#eef5fb';

export function HiveFlowBackground() {
  return (
    <View style={styles.root} pointerEvents="none">
      <LinearGradient
        colors={['#e8f1f8', '#f4f8fb', '#eef5fb', '#f7fafc']}
        locations={[0, 0.28, 0.62, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.flowA} />
      <View style={styles.flowB} />
      <View style={styles.flowC} />
      <LinearGradient
        colors={[
          'rgba(248, 251, 253, 0.2)',
          'rgba(255, 255, 255, 0.12)',
          'rgba(248, 251, 253, 0.18)',
          'rgba(255, 255, 255, 0.22)',
          'rgba(247, 250, 252, 0.38)',
        ]}
        locations={[0, 0.2, 0.5, 0.78, 1]}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: hiveFlowCanvas,
    overflow: 'hidden',
  },
  flowA: {
    position: 'absolute',
    width: 420,
    height: 420,
    borderRadius: 210,
    backgroundColor: 'rgba(20, 169, 181, 0.08)',
    top: -120,
    right: -140,
  },
  flowB: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(11, 42, 67, 0.05)',
    bottom: -80,
    left: -100,
  },
  flowC: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 40,
    borderWidth: 1,
    borderColor: 'rgba(228, 179, 52, 0.12)',
    transform: [{ rotate: '28deg' }],
    top: '42%',
    right: 36,
  },
});
