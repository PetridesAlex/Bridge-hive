import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { brandGradient, colors, spacing, typography } from '@/constants/theme';
import { layout, useLayout } from '@/hooks/useLayout';

type Props = {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  showBack?: boolean;
  centered?: boolean;
};

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
  showBack = true,
  centered = true,
}: Props) {
  const { gutter } = useLayout();
  const reveal = useSharedValue(0);

  useEffect(() => {
    reveal.value = withDelay(40, withSpring(1, { damping: 16, stiffness: 160 }));
  }, [reveal]);

  const motion = useAnimatedStyle(() => ({
    opacity: reveal.value,
    transform: [
      { translateY: interpolate(reveal.value, [0, 1], [18, 0], Extrapolation.CLAMP) },
    ],
  }));

  return (
    <LinearGradient colors={[...brandGradient]} style={styles.gradient}>
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {showBack ? (
            <Pressable
              onPress={() => router.back()}
              style={[styles.back, { marginLeft: gutter }]}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <View style={styles.backBtn}>
                <Ionicons name="chevron-back" size={20} color={colors.white} />
              </View>
            </Pressable>
          ) : null}

          <ScrollView
            contentContainerStyle={[
              styles.scroll,
              centered && styles.scrollCentered,
              !showBack && styles.scrollNoBack,
              {
                paddingHorizontal: gutter,
                maxWidth: layout.contentMaxWidth,
                alignSelf: 'center',
                width: '100%',
              },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Animated.View style={[styles.hero, motion]}>
              <View style={styles.mark}>
                <Text style={styles.markLetter}>B</Text>
              </View>
              <Text style={styles.brand}>Bridge Hive</Text>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.subtitle}>{subtitle}</Text>
            </Animated.View>

            <Animated.View style={[styles.card, motion]}>{children}</Animated.View>
            {footer}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

export function AuthStepBar({ current, total }: { current: number; total: number }) {
  return (
    <View style={styles.stepBar}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.stepSeg,
            i < current && styles.stepSegDone,
            i === current - 1 && styles.stepSegActive,
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingBottom: spacing.xxxl,
  },
  scrollCentered: {
    justifyContent: 'center',
  },
  scrollNoBack: {
    paddingTop: spacing.xxl,
  },
  back: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: {
    marginBottom: spacing.xl,
    gap: spacing.sm,
    alignItems: 'center',
  },
  mark: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.yellow,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  markLetter: {
    fontFamily: typography.fonts.displayExtra,
    fontSize: 26,
    color: colors.navy,
    letterSpacing: -0.5,
  },
  brand: {
    fontFamily: typography.fonts.semibold,
    fontSize: 12,
    color: colors.yellow,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: typography.fonts.displayExtra,
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -0.8,
    color: colors.white,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: typography.fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    color: 'rgba(255,255,255,0.68)',
    maxWidth: 320,
    textAlign: 'center',
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderRadius: 22,
    padding: spacing.xl,
    gap: spacing.md,
    overflow: 'hidden',
  },
  stepBar: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: spacing.sm,
  },
  stepSeg: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  stepSegDone: {
    backgroundColor: colors.success,
  },
  stepSegActive: {
    backgroundColor: colors.yellow,
  },
});
