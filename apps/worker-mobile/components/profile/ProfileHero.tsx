import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Avatar } from '@/components/ui/Avatar';
import { colors, motion, radii, spacing, typography } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/useReducedMotion';

type HeroChip = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone: 'success' | 'danger' | 'warning' | 'info';
  solid?: boolean;
  pulse?: boolean;
};

type Props = {
  name: string;
  roleLabel: string;
  initials: string;
  imageUri?: string | null;
  avatarLoading?: boolean;
  onPressAvatar: () => void;
  changePhotoLabel: string;
  chips: HeroChip[];
};

const CHIP_TONE: Record<
  HeroChip['tone'],
  { fg: string; bg: string; solidBg: string; ring: string }
> = {
  success: {
    fg: '#B7E4C7',
    bg: 'rgba(46, 125, 50, 0.28)',
    solidBg: 'rgba(46, 160, 90, 0.92)',
    ring: 'rgba(183, 228, 199, 0.55)',
  },
  danger: {
    fg: '#F5C2BC',
    bg: 'rgba(180, 50, 40, 0.30)',
    solidBg: 'rgba(196, 70, 55, 0.92)',
    ring: 'rgba(245, 194, 188, 0.5)',
  },
  warning: {
    fg: colors.yellow,
    bg: 'rgba(240, 140, 0, 0.28)',
    solidBg: 'rgba(240, 140, 0, 0.9)',
    ring: 'rgba(255, 210, 90, 0.55)',
  },
  info: {
    fg: '#9AD7E8',
    bg: 'rgba(20, 120, 160, 0.28)',
    solidBg: 'rgba(20, 130, 170, 0.9)',
    ring: 'rgba(154, 215, 232, 0.5)',
  },
};

/**
 * Profile identity hero — navy→teal wash, premium display type,
 * role capsule, and glass status chips with light motion.
 */
export function ProfileHero({
  name,
  roleLabel,
  initials,
  imageUri,
  avatarLoading = false,
  onPressAvatar,
  changePhotoLabel,
  chips,
}: Props) {
  const reduced = useReducedMotion();
  const enter = useSharedValue(reduced ? 1 : 0);
  const sheen = useSharedValue(0);
  const ring = useSharedValue(1);
  const press = useSharedValue(1);

  useEffect(() => {
    if (reduced) {
      enter.value = 1;
      return;
    }
    enter.value = withTiming(1, {
      duration: motion.duration.slow,
      easing: Easing.out(Easing.cubic),
    });
    sheen.value = withDelay(
      180,
      withRepeat(
        withTiming(1, { duration: 4200, easing: Easing.inOut(Easing.quad) }),
        -1,
        true,
      ),
    );
  }, [enter, reduced, sheen]);

  useEffect(() => {
    const shouldPulse = chips.some((chip) => chip.pulse);
    if (reduced || !shouldPulse) {
      ring.value = 1;
      return;
    }
    ring.value = withRepeat(
      withTiming(1.12, {
        duration: motion.duration.slow * 5,
        easing: Easing.inOut(Easing.quad),
      }),
      -1,
      true,
    );
  }, [chips, reduced, ring]);

  const shellStyle = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [{ translateY: interpolate(enter.value, [0, 1], [12, 0]) }],
  }));

  const sheenStyle = useAnimatedStyle(() => ({
    opacity: interpolate(sheen.value, [0, 1], [0.15, 0.42]),
    transform: [{ translateX: interpolate(sheen.value, [0, 1], [-40, 60]) }],
  }));

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ring.value }],
    opacity: interpolate(ring.value, [1, 1.12], [0.55, 0]),
  }));

  const avatarPressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: press.value }],
  }));

  return (
    <Animated.View style={[styles.shell, shellStyle]}>
      <LinearGradient
        colors={['#071E33', '#0B2A43', '#0E4A5C', '#0F6B6B']}
        locations={[0, 0.35, 0.72, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View pointerEvents="none" style={[styles.sheen, sheenStyle]}>
        <LinearGradient
          colors={['transparent', 'rgba(255,255,255,0.14)', 'transparent']}
          start={{ x: 0, y: 0.2 }}
          end={{ x: 1, y: 0.8 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      <View pointerEvents="none" style={styles.glow} />

      <Animated.View
        entering={reduced ? undefined : FadeInDown.delay(40).duration(420)}
        style={avatarPressStyle}
      >
        <Pressable
          onPress={onPressAvatar}
          onPressIn={() => {
            if (!reduced) press.value = withSpring(0.96, { damping: 16, stiffness: 320 });
          }}
          onPressOut={() => {
            press.value = withSpring(1, { damping: 14, stiffness: 260 });
          }}
          accessibilityRole="button"
          accessibilityLabel={changePhotoLabel}
          style={styles.avatarPress}
        >
          <View style={styles.avatarWrap}>
            <Animated.View style={[styles.avatarRing, ringStyle]} />
            <View style={styles.avatarFrame}>
              {avatarLoading && !imageUri ? (
                <View style={[styles.avatarPlaceholder, { width: 96, height: 96 }]}>
                  <ActivityIndicator color={colors.white} />
                </View>
              ) : (
                <Avatar
                  initials={initials}
                  size={96}
                  imageUri={imageUri}
                  backgroundColor="rgba(255,255,255,0.16)"
                  textColor={colors.white}
                />
              )}
            </View>
            <View style={styles.cameraBadge} accessibilityElementsHidden>
              <Ionicons name="camera" size={15} color={colors.navy} />
            </View>
          </View>
        </Pressable>
      </Animated.View>

      <Animated.View
        entering={reduced ? undefined : FadeInDown.delay(110).duration(420)}
        style={styles.copy}
      >
        <Text style={styles.name} numberOfLines={2}>
          {name}
        </Text>
        <View style={styles.roleRule} />
        <View style={styles.rolePill}>
          <Ionicons name="medkit-outline" size={13} color={colors.yellow} />
          <Text style={styles.role} numberOfLines={1}>
            {roleLabel}
          </Text>
        </View>
      </Animated.View>

      <Animated.View
        entering={reduced ? undefined : FadeInDown.delay(180).duration(420)}
        style={styles.chipRow}
      >
        {chips.map((chip) => (
          <HeroStatusChip key={chip.label} {...chip} />
        ))}
      </Animated.View>
    </Animated.View>
  );
}

function HeroStatusChip({ label, icon, tone, solid = false, pulse = false }: HeroChip) {
  const reduced = useReducedMotion();
  const pulseProgress = useSharedValue(1);
  const palette = CHIP_TONE[tone];

  useEffect(() => {
    if (!pulse || reduced) {
      pulseProgress.value = 1;
      return;
    }
    pulseProgress.value = withRepeat(
      withTiming(0.4, {
        duration: motion.duration.slow * 5,
        easing: Easing.inOut(Easing.quad),
      }),
      -1,
      true,
    );
  }, [pulse, pulseProgress, reduced]);

  const liveDot = useAnimatedStyle(() => ({
    opacity: pulse && !reduced ? pulseProgress.value : 1,
    transform: [
      { scale: pulse && !reduced ? 0.85 + pulseProgress.value * 0.2 : 1 },
    ],
  }));

  return (
    <View
      style={[
        styles.chip,
        {
          backgroundColor: solid ? palette.solidBg : palette.bg,
          borderColor: palette.ring,
        },
      ]}
      accessibilityRole="text"
      accessibilityLabel={label}
    >
      {pulse ? (
        <Animated.View
          style={[styles.chipDot, { backgroundColor: colors.white }, liveDot]}
        />
      ) : (
        <Ionicons name={icon} size={12} color={solid ? colors.white : palette.fg} />
      )}
      <Text style={[styles.chipText, { color: solid ? colors.white : palette.fg }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderRadius: radii.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg + 2,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  sheen: {
    position: 'absolute',
    top: -20,
    bottom: -20,
    width: 120,
  },
  glow: {
    position: 'absolute',
    top: -40,
    right: -30,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(22, 166, 182, 0.18)',
  },
  avatarPress: {
    alignItems: 'center',
  },
  avatarWrap: {
    position: 'relative',
    width: 104,
    height: 104,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarRing: {
    position: 'absolute',
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 2,
    borderColor: colors.yellow,
  },
  avatarFrame: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.28)',
    overflow: 'hidden',
  },
  avatarPlaceholder: {
    borderRadius: 48,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.yellow,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#0B2A43',
  },
  copy: {
    alignItems: 'center',
    gap: 8,
    maxWidth: 420,
  },
  name: {
    fontFamily: typography.fonts.displayExtra,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.7,
    color: colors.white,
    textAlign: 'center',
  },
  roleRule: {
    width: 28,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.yellow,
  },
  rolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radii.full,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,210,90,0.28)',
  },
  role: {
    fontFamily: typography.fonts.semibold,
    fontSize: 13,
    letterSpacing: 0.2,
    color: 'rgba(255,255,255,0.92)',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 2,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: radii.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  chipText: {
    fontFamily: typography.fonts.semibold,
    fontSize: 11,
    letterSpacing: 0.3,
  },
});
