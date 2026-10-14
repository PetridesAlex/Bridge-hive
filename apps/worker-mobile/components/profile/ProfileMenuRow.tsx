import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { colors, radii, shadows, spacing, typography } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/useReducedMotion';

export type MenuTone = 'neutral' | 'positive' | 'attention' | 'alert';

const TONE: Record<MenuTone, { fg: string; bg: string }> = {
  neutral: { fg: colors.textSecondary, bg: 'rgba(11, 42, 67, 0.06)' },
  positive: { fg: colors.tealStrong, bg: colors.tealSoft },
  attention: { fg: '#8A6410', bg: colors.yellowLight },
  alert: { fg: colors.error, bg: colors.errorLight },
};

const SPRING = { damping: 16, stiffness: 260 };

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  subtitle?: string;
  trailing?: string | null;
  tone?: MenuTone;
  accessibilityHint?: string;
};

export function ProfileMenuRow({
  icon,
  label,
  onPress,
  subtitle,
  trailing,
  tone = 'neutral',
  accessibilityHint,
}: Props) {
  const reduced = useReducedMotion();
  const [hovered, setHovered] = useState(false);
  const scale = useSharedValue(1);
  const lift = useSharedValue(0);
  const nudge = useSharedValue(0);
  const pill = TONE[tone];
  const a11yLabel = trailing ? `${label}, ${trailing}` : label;

  const motionStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: lift.value }, { scale: scale.value }],
  }));
  const arrowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: nudge.value }],
  }));

  return (
    <Animated.View style={[styles.wrap, motionStyle]}>
      <Pressable
        onPress={onPress}
        onHoverIn={() => {
          setHovered(true);
          if (!reduced) lift.value = withSpring(-2, SPRING);
        }}
        onHoverOut={() => {
          setHovered(false);
          lift.value = withSpring(0, SPRING);
        }}
        onPressIn={() => {
          if (reduced) return;
          scale.value = withSpring(0.985, { damping: 18, stiffness: 420 });
          nudge.value = withSpring(4, { damping: 14, stiffness: 320 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, SPRING);
          nudge.value = withSpring(0, SPRING);
        }}
        style={styles.row}
        accessibilityRole="button"
        accessibilityLabel={a11yLabel}
        accessibilityHint={accessibilityHint ?? subtitle}
      >
        <LinearGradient
          pointerEvents="none"
          colors={
            hovered
              ? ['rgba(255,255,255,0.98)', 'rgba(243,250,252,0.96)']
              : ['rgba(255,255,255,0.94)', 'rgba(248,251,253,0.9)']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={[colors.navy, '#0C3E56', colors.tealStrong]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.iconWrap}
        >
          <Ionicons name={icon} size={18} color={colors.white} />
        </LinearGradient>
        <View style={styles.copy}>
          <Text style={styles.label} numberOfLines={1}>
            {label}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={2}>
              {subtitle}
            </Text>
          ) : null}
          {trailing ? (
            <View style={[styles.pill, { backgroundColor: pill.bg }]}>
              <Text style={[styles.pillText, { color: pill.fg }]} numberOfLines={2}>
                {trailing}
              </Text>
            </View>
          ) : null}
        </View>
        <Animated.View style={[styles.chevron, arrowStyle]}>
          <Ionicons name="arrow-forward" size={16} color={colors.navy} />
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 72,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radii.xl,
    overflow: 'hidden',
    ...shadows.sm,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  label: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 16,
    letterSpacing: -0.3,
    color: colors.navy,
  },
  subtitle: {
    fontFamily: typography.fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
  },
  pill: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pillText: {
    fontFamily: typography.fonts.semibold,
    fontSize: 12,
    lineHeight: 16,
  },
  chevron: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(11, 42, 67, 0.05)',
  },
});
