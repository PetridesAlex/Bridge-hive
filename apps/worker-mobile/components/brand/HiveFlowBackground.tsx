import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, View } from 'react-native';

const flowBackground = require('../../../web/public/marketing/flow-bg.jpg');

/** Same light hive-flow plane as the marketing site. */
export const hiveFlowCanvas = '#eef5fb';

export function HiveFlowBackground() {
  return (
    <View style={styles.root} pointerEvents="none">
      <Image
        source={flowBackground}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        contentPosition="center"
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
      <LinearGradient
        colors={[
          'rgba(248, 251, 253, 0.38)',
          'rgba(255, 255, 255, 0.22)',
          'rgba(248, 251, 253, 0.26)',
          'rgba(255, 255, 255, 0.24)',
          'rgba(247, 250, 252, 0.46)',
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
  },
});
