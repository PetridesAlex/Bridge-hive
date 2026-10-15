import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BridgeHiveMark } from '@/components/brand/BridgeHiveMark';
import { HiveFlowBackground } from '@/components/brand/HiveFlowBackground';
import { colors, radii, shadows, spacing, typography } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useAuth } from '@/providers/AuthProvider';

function WelcomeAction({
  label,
  tone,
  onPress,
}: {
  label: string;
  tone: 'primary' | 'secondary';
  onPress: () => void;
}) {
  const reduced = useReducedMotion();
  const [hovered, setHovered] = useState(false);
  const scale = useSharedValue(1);
  const lift = useSharedValue(0);
  const nudge = useSharedValue(0);

  const motionStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: lift.value }, { scale: scale.value }],
  }));
  const arrowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: nudge.value }],
  }));

  return (
    <Animated.View style={[styles.actionWrap, motionStyle]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
        onHoverIn={() => {
          setHovered(true);
          if (!reduced) lift.value = withSpring(-3, { damping: 16, stiffness: 260 });
        }}
        onHoverOut={() => {
          setHovered(false);
          lift.value = withSpring(0, { damping: 16, stiffness: 240 });
        }}
        onPressIn={() => {
          if (reduced) return;
          scale.value = withSpring(0.97, { damping: 18, stiffness: 420 });
          nudge.value = withSpring(6, { damping: 14, stiffness: 320 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 14, stiffness: 260 });
          nudge.value = withSpring(0, { damping: 14, stiffness: 260 });
        }}
        style={[styles.action, tone === 'primary' ? styles.actionPrimary : styles.actionSecondary]}
      >
        <LinearGradient
          pointerEvents="none"
          colors={
            tone === 'primary'
              ? [colors.navy, '#0C3E56', colors.tealStrong]
              : [colors.tealStrong, '#0A6C78', '#086068']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {hovered ? <View pointerEvents="none" style={styles.actionHoverWash} /> : null}
        <Text style={styles.actionLabel}>{label}</Text>
        <Animated.View style={[styles.actionIcon, arrowStyle]}>
          <Ionicons
            name={tone === 'primary' ? 'arrow-forward' : 'person-add-outline'}
            size={18}
            color={tone === 'primary' ? colors.yellow : colors.white}
          />
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

export default function WelcomeScreen() {
  const { session, loading, homeRoute } = useAuth();

  if (!loading && session) {
    return <Redirect href={homeRoute as never} />;
  }

  return (
    <View style={styles.root}>
      <HiveFlowBackground />
      <SafeAreaView style={styles.safe}>
        <View style={styles.hero}>
          <View style={styles.lockup}>
            <BridgeHiveMark size={96} style={styles.mark} />
            <Text style={styles.brand}>Bridge Hive</Text>
          </View>
          <View style={styles.copy}>
            <Text style={styles.title}>Healthcare shifts,{'\n'}built for workers</Text>
            <Text style={styles.subtitle}>
              Find verified nursing, ward assistant, and physiotherapy shifts across Cyprus. Claim
              once — first eligible worker wins.
            </Text>
          </View>
        </View>

        <View style={styles.actions}>
          <WelcomeAction
            label="Sign in"
            tone="primary"
            onPress={() => router.push('/auth/worker/login')}
          />
          <WelcomeAction
            label="Create worker account"
            tone="secondary"
            onPress={() => router.push('/auth/worker/register')}
          />
          <Text style={styles.note}>
            Organization and platform admin accounts use the Bridge Hive web portal.
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'space-between',
    paddingBottom: spacing.xxxl,
  },
  hero: {
    marginTop: spacing.xxl,
    gap: spacing.xl,
  },
  lockup: {
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  mark: {},
  brand: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 17,
    color: '#0B2032',
    letterSpacing: -0.2,
  },
  copy: {
    gap: spacing.md,
    maxWidth: 460,
  },
  title: {
    fontFamily: typography.fonts.displayExtra,
    fontSize: 36,
    lineHeight: 42,
    letterSpacing: -0.8,
    color: colors.text,
  },
  subtitle: {
    fontFamily: typography.fonts.regular,
    fontSize: 17,
    lineHeight: 26,
    color: colors.textSecondary,
  },
  actions: {
    gap: spacing.md,
    alignItems: 'center',
  },
  actionWrap: {
    width: '86%',
    maxWidth: 420,
  },
  action: {
    minHeight: 52,
    borderRadius: radii.xl,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  actionPrimary: {
    ...shadows.lg,
  },
  actionSecondary: {
    ...shadows.md,
  },
  actionHoverWash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  actionLabel: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 16,
    letterSpacing: -0.2,
    color: colors.white,
  },
  actionIcon: {
    position: 'absolute',
    right: 16,
  },
  note: {
    fontFamily: typography.fonts.regular,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
