import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '@/constants/theme';
import { useLayout } from '@/hooks/useLayout';

export type SegmentTab = {
  key: string;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconFocused?: keyof typeof Ionicons.glyphMap;
  badge?: number;
  accent?: string;
};

type Props = {
  tabs: SegmentTab[];
  activeKey: string;
  onChange: (key: string) => void;
  scrollable?: boolean;
};

function SegmentTabItem({
  tab,
  active,
  flex,
  onPress,
}: {
  tab: SegmentTab;
  active: boolean;
  flex: boolean;
  onPress: () => void;
}) {
  const iconName = active ? (tab.iconFocused ?? tab.icon) : tab.icon;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      style={[styles.tabPress, flex && styles.tabFlex]}
    >
      <View style={[styles.tabShell, active ? styles.tabShellActive : styles.tabShellIdle]}>
        {iconName ? (
          <Ionicons
            name={iconName}
            size={14}
            color={active ? colors.yellow : 'rgba(255,255,255,0.55)'}
          />
        ) : null}
        <Text style={[styles.label, active ? styles.labelActive : styles.labelIdle]} numberOfLines={1}>
          {tab.label}
        </Text>
        {typeof tab.badge === 'number' && tab.badge > 0 ? (
          <View style={[styles.badge, active ? styles.badgeActive : styles.badgeIdle]}>
            <Text style={[styles.badgeText, active ? styles.badgeTextActive : styles.badgeTextIdle]}>
              {tab.badge > 99 ? '99+' : tab.badge}
            </Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

export function SegmentedTabs({ tabs, activeKey, onChange, scrollable = false }: Props) {
  const { gutter, isCompact, width } = useLayout();
  const shouldScroll = scrollable || isCompact || tabs.length > 3 || width < 420;

  const handleChange = (key: string) => {
    if (key === activeKey) return;
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync().catch(() => undefined);
    }
    onChange(key);
  };

  const content = (
    <View style={[styles.track, shouldScroll && styles.scrollTrack]}>
      {tabs.map((tab) => (
        <SegmentTabItem
          key={tab.key}
          tab={tab}
          active={tab.key === activeKey}
          flex={!shouldScroll}
          onPress={() => handleChange(tab.key)}
        />
      ))}
    </View>
  );

  if (shouldScroll) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.scroll, { marginHorizontal: -gutter }]}
        contentContainerStyle={{ paddingHorizontal: gutter, paddingBottom: 2 }}
      >
        {content}
      </ScrollView>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  scroll: {
    marginBottom: spacing.md,
  },
  track: {
    flexDirection: 'row',
    backgroundColor: colors.navy,
    borderRadius: radii.lg,
    padding: 4,
    marginBottom: spacing.lg,
    gap: 2,
  },
  scrollTrack: {
    alignSelf: 'flex-start',
    minWidth: '100%',
    marginBottom: spacing.sm,
  },
  tabPress: {
    minWidth: 108,
  },
  tabFlex: {
    flex: 1,
    minWidth: 0,
  },
  tabShell: {
    borderRadius: radii.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  tabShellActive: {
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  tabShellIdle: {
    backgroundColor: 'transparent',
  },
  label: {
    fontFamily: typography.fonts.medium,
    fontSize: 13,
    letterSpacing: -0.1,
  },
  labelIdle: {
    color: 'rgba(255,255,255,0.48)',
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
  },
  badgeIdle: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  badgeActive: {
    backgroundColor: colors.yellow,
  },
  badgeText: {
    fontFamily: typography.fonts.bold,
    fontSize: 10,
  },
  badgeTextIdle: {
    color: 'rgba(255,255,255,0.7)',
  },
  badgeTextActive: {
    color: colors.navy,
  },
});
