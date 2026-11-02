import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useReducedMotion } from '@/hooks/useReducedMotion';

/**
 * Soft navy→mist canvas with honey accents — shared page atmosphere for
 * worker-mobile (tabs, detail, auth). Self-contained gradients only.
 */
export const hiveFlowCanvas = '#D5E3EF';

const DRIFT_MS = 11000;
const WASH_MS = 8200;

export function HiveFlowBackground() {
  const reduced = useReducedMotion();
  const drift = useSharedValue(reduced ? 0.5 : 0);
  const wash = useSharedValue(reduced ? 0.35 : 0);
  const pulse = useSharedValue(reduced ? 0.5 : 0);

  useEffect(() => {
    if (reduced) {
      drift.value = 0.5;
      wash.value = 0.35;
      pulse.value = 0.5;
      return;
    }
    drift.value = withRepeat(
      withTiming(1, { duration: DRIFT_MS, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    wash.value = withRepeat(
      withTiming(1, { duration: WASH_MS, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
    pulse.value = withRepeat(
      withTiming(1, { duration: 6400, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [drift, pulse, reduced, wash]);

  const navyOrb = useAnimatedStyle(() => ({
    opacity: interpolate(drift.value, [0, 1], [0.22, 0.38]),
    transform: [
      { translateX: interpolate(drift.value, [0, 1], [-12, 18]) },
      { translateY: interpolate(drift.value, [0, 1], [8, -16]) },
      { scale: interpolate(drift.value, [0, 1], [0.96, 1.08]) },
    ],
  }));

  const tealOrb = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.16, 0.3]),
    transform: [
      { translateX: interpolate(pulse.value, [0, 1], [10, -14]) },
      { translateY: interpolate(pulse.value, [0, 1], [-6, 14]) },
      { scale: interpolate(pulse.value, [0, 1], [1, 1.1]) },
    ],
  }));

  const honeyOrb = useAnimatedStyle(() => ({
    opacity: interpolate(drift.value, [0, 1], [0.12, 0.26]),
    transform: [
      { translateX: interpolate(drift.value, [0, 1], [6, -10]) },
      { translateY: interpolate(drift.value, [0, 1], [-8, 12]) },
      { scale: interpolate(pulse.value, [0, 1], [0.94, 1.06]) },
    ],
  }));

  const washStyle = useAnimatedStyle(() => ({
    opacity: interpolate(wash.value, [0, 1], [0.18, 0.42]),
    transform: [{ translateX: interpolate(wash.value, [0, 1], [-60, 80]) }],
  }));

  return (
    <View style={styles.root} pointerEvents="none" accessibilityElementsHidden>
      <LinearGradient
        colors={['#B9CEDF', '#D0E0EC', '#DCE8F2', '#E6EEF4']}
        locations={[0, 0.28, 0.64, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <Animated.View style={[styles.navyPool, navyOrb]} />
      <Animated.View style={[styles.tealPool, tealOrb]} />
      <Animated.View style={[styles.honeyPool, honeyOrb]} />

      <Animated.View style={[styles.wash, washStyle]}>
        <LinearGradient
          colors={[
            'transparent',
            'rgba(255, 255, 255, 0.28)',
            'rgba(255, 210, 90, 0.08)',
            'transparent',
          ]}
          start={{ x: 0, y: 0.15 }}
          end={{ x: 1, y: 0.85 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <View style={styles.honeySheen} />
      <View style={styles.navyVignette} />

      <LinearGradient
        colors={[
          'rgba(11, 42, 67, 0.06)',
          'rgba(255, 255, 255, 0.08)',
          'rgba(224, 170, 24, 0.05)',
          'rgba(220, 232, 242, 0.35)',
        ]}
        locations={[0, 0.32, 0.72, 1]}
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
  navyPool: {
    position: 'absolute',
    width: 420,
    height: 420,
    borderRadius: 210,
    backgroundColor: 'rgba(11, 42, 67, 0.18)',
    top: -140,
    right: -120,
  },
  tealPool: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(22, 166, 182, 0.16)',
    bottom: '18%',
    left: -90,
  },
  honeyPool: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(224, 170, 24, 0.16)',
    top: '38%',
    right: -40,
  },
  wash: {
    position: 'absolute',
    top: -40,
    bottom: -40,
    width: 160,
  },
  honeySheen: {
    position: 'absolute',
    left: '18%',
    top: -30,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255, 210, 90, 0.10)',
  },
  navyVignette: {
    position: 'absolute',
    left: -60,
    bottom: -80,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(7, 30, 51, 0.10)',
  },
});
