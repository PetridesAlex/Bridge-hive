import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '@/constants/theme';

export type SegmentTab = {
  key: string;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconFocused?: keyof typeof Ionicons.glyphMap;
  badge?: number;
};

type Props = {
  tabs: SegmentTab[];
  activeKey: string;
  onChange: (key: string) => void;
};

/** Accessible light segmented control for Money and similar surfaces. */
export function SegmentedTabs({ tabs, activeKey, onChange }: Props) {
  const handleChange = (key: string) => {
    if (key === activeKey) return;
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync().catch(() => undefined);
    }
    onChange(key);
  };

  return (
    <View style={styles.track} accessibilityRole="tablist">
      {tabs.map((tab) => {
        const active = tab.key === activeKey;
        const iconName = active ? (tab.iconFocused ?? tab.icon) : tab.icon;
        return (
          <Pressable
            key={tab.key}
            onPress={() => handleChange(tab.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={[styles.tab, active && styles.tabActive]}
          >
            {iconName ? (
              <Ionicons
                name={iconName}
                size={14}
                color={active ? colors.tealStrong : colors.textMuted}
              />
            ) : null}
            <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceSubdued,
    borderRadius: radii.md,
    padding: 4,
    marginBottom: spacing.md,
    gap: 4,
  },
  tab: {
    flex: 1,
    minHeight: 40,
    borderRadius: radii.sm,
    paddingVertical: 8,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  tabActive: {
    backgroundColor: colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.teal,
  },
  label: {
    fontFamily: typography.fonts.medium,
    fontSize: 14,
    color: colors.textMuted,
  },
  labelActive: {
    fontFamily: typography.fonts.semibold,
    color: colors.tealStrong,
  },
});
