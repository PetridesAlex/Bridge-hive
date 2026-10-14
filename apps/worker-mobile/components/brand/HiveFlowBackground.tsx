import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, View } from 'react-native';

const flowBackground = require('../../../web/public/marketing/flow-bg.jpg');

/** Soft blue hive-flow plane — kept light for auth readability, clearly blue. */
export const hiveFlowCanvas = '#d7ebf7';

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
          'rgba(198, 226, 244, 0.42)',
          'rgba(220, 238, 250, 0.28)',
          'rgba(186, 220, 242, 0.34)',
          'rgba(210, 234, 248, 0.30)',
          'rgba(190, 224, 244, 0.48)',
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
