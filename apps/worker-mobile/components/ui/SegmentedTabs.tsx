import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { colors, radii, shadows, spacing, typography } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/useReducedMotion';

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

const SPRING = { damping: 18, stiffness: 240 };
const PAD = 4;
const GAP = 4;

/** Sliding segmented control for Work, Money, and similar surfaces. */
export function SegmentedTabs({ tabs, activeKey, onChange }: Props) {
  const reduced = useReducedMotion();
  const [trackWidth, setTrackWidth] = useState(0);
  const [hovered, setHovered] = useState<string | null>(null);
  const index = Math.max(
    0,
    tabs.findIndex((tab) => tab.key === activeKey),
  );
  const offset = useSharedValue(index);

  useEffect(() => {
    offset.value = reduced ? index : withSpring(index, SPRING);
  }, [index, offset, reduced]);

  const inner = Math.max(0, trackWidth - PAD * 2);
  const tabWidth =
    tabs.length > 0 ? (inner - GAP * Math.max(0, tabs.length - 1)) / tabs.length : 0;

  const indicatorStyle = useAnimatedStyle(() => ({
    width: tabWidth,
    transform: [{ translateX: offset.value * (tabWidth + GAP) }],
  }));

  const handleChange = (key: string) => {
    if (key === activeKey) return;
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync().catch(() => undefined);
    }
    onChange(key);
  };

  return (
    <View
      style={styles.track}
      accessibilityRole="tablist"
      onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
    >
      {tabWidth > 0 ? (
        <Animated.View pointerEvents="none" style={[styles.indicator, indicatorStyle]}>
          <LinearGradient
            colors={[colors.navy, '#0C3E56', colors.tealStrong]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      ) : null}
      {tabs.map((tab) => {
        const active = tab.key === activeKey;
        const iconName = active ? (tab.iconFocused ?? tab.icon) : tab.icon;
        return (
          <Pressable
            key={tab.key}
            onPress={() => handleChange(tab.key)}
            onHoverIn={() => setHovered(tab.key)}
            onHoverOut={() => setHovered((current) => (current === tab.key ? null : current))}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={[styles.tab, !active && hovered === tab.key && styles.tabHover]}
          >
            {iconName ? (
              <Ionicons
                name={iconName}
                size={15}
                color={active ? colors.white : colors.navy}
              />
            ) : null}
            <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1}>
              {tab.label}
            </Text>
            {tab.badge && tab.badge > 0 ? (
              <View style={[styles.badge, active && styles.badgeActive]}>
                <Text style={[styles.badgeText, active && styles.badgeTextActive]}>
                  {tab.badge}
                </Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.78)',
    borderRadius: radii.xl,
    padding: PAD,
    marginBottom: spacing.md,
    gap: GAP,
    overflow: 'hidden',
    ...shadows.sm,
  },
  indicator: {
    position: 'absolute',
    top: PAD,
    bottom: PAD,
    left: PAD,
    borderRadius: 16,
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    minHeight: 42,
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    zIndex: 1,
  },
  tabHover: {
    backgroundColor: 'rgba(11, 42, 67, 0.05)',
  },
  label: {
    fontFamily: typography.fonts.semibold,
    fontSize: 13,
    color: colors.navy,
  },
  labelActive: {
    fontFamily: typography.fonts.displaySemibold,
    color: colors.white,
  },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.tealSoft,
  },
  badgeActive: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  badgeText: {
    fontFamily: typography.fonts.semibold,
    fontSize: 11,
    color: colors.tealStrong,
  },
  badgeTextActive: {
    color: colors.white,
  },
});
