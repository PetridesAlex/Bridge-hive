import { Ionicons } from '@expo/vector-icons';
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

import { colors, spacing, typography } from '@/constants/theme';
import { layout, useLayout } from '@/hooks/useLayout';

type Props = {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  showBack?: boolean;
  centered?: boolean;
};

/** Light premium auth chrome — keep opacity animation non-essential. */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
  showBack = true,
  centered = true,
}: Props) {
  const { gutter } = useLayout();
  const reveal = useSharedValue(1);

  useEffect(() => {
    reveal.value = 0.98;
    reveal.value = withDelay(40, withSpring(1, { damping: 16, stiffness: 160 }));
  }, [reveal]);

  const motion = useAnimatedStyle(() => ({
    opacity: reveal.value,
    transform: [
      { translateY: interpolate(reveal.value, [0.98, 1], [6, 0], Extrapolation.CLAMP) },
    ],
  }));

  return (
    <View style={styles.root}>
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
                <Ionicons name="chevron-back" size={20} color={colors.navy} />
              </View>
            </Pressable>
          ) : null}

          <ScrollView
            contentContainerStyle={[
              styles.scroll,
              centered && styles.scrollCentered,
              !showBack && styles.scrollNoBack,
              {
                paddingHorizontal: Math.max(gutter, 20),
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
    </View>
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
  root: { flex: 1, backgroundColor: colors.background },
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
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceSubdued,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: {
    marginBottom: spacing.xl,
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  mark: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  markLetter: {
    fontFamily: typography.fonts.displayExtra,
    fontSize: 22,
    color: colors.yellow,
    letterSpacing: -0.5,
  },
  brand: {
    fontFamily: typography.fonts.semibold,
    fontSize: 12,
    color: colors.navy,
    letterSpacing: 0.8,
  },
  title: {
    fontFamily: typography.fonts.display,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.4,
    color: colors.text,
  },
  subtitle: {
    fontFamily: typography.fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
    maxWidth: 340,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: spacing.xl,
    gap: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  stepBar: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: spacing.sm,
  },
  stepSeg: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  stepSegDone: {
    backgroundColor: colors.success,
  },
  stepSegActive: {
    backgroundColor: colors.navy,
  },
});
