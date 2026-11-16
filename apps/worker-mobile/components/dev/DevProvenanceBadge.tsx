import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  formatDevProvenanceLine,
  getDevProvenance,
} from '../../../../packages/dev-provenance';

/** Dev-only marker; hidden when BH_DEV_BASE_SHA is unset. */
export function DevProvenanceBadge() {
  const p = getDevProvenance();
  if (!p) return null;

  return (
    <View
      pointerEvents="none"
      style={styles.wrap}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Text style={styles.text} numberOfLines={2}>
        {formatDevProvenanceLine(p)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    zIndex: 99999,
    left: 8,
    bottom: 8,
    maxWidth: '92%',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(11, 42, 67, 0.88)',
  },
  text: {
    color: '#F4FBFC',
    fontSize: 10,
    lineHeight: 14,
    fontFamily: 'Menlo',
  },
});
