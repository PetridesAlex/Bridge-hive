import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radii, spacing, touchTarget, typography } from '@/constants/theme';

type Props = {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  right?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  light?: boolean;
};

export function ScreenHeader({
  title,
  subtitle,
  showBack = false,
  onBack,
  right,
  style,
  light = false,
}: Props) {
  const router = useRouter();
  const fg = light ? colors.white : colors.navy;
  const muted = light ? 'rgba(255,255,255,0.72)' : colors.textSecondary;
  const backBg = light ? 'rgba(255,255,255,0.14)' : colors.blueLight;

  if (showBack) {
    return (
      <View style={[styles.wrap, styles.wrapNested, style]}>
        <View style={styles.nestedTop}>
          <Pressable
            onPress={onBack ?? (() => router.back())}
            hitSlop={8}
            style={[styles.back, { backgroundColor: backBg }]}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="chevron-back" size={22} color={fg} />
          </Pressable>
          {right ? <View style={styles.right}>{right}</View> : <View style={styles.rightSpacer} />}
        </View>

        <View style={styles.nestedTitles}>
          {subtitle ? (
            <Text style={[styles.nestedEyebrow, { color: muted }]} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
          <Text style={[styles.nestedTitle, { color: fg }]} numberOfLines={2}>
            {title}
          </Text>
          {!light ? <View style={styles.accent} /> : null}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.wrap, styles.wrapHero, style]}>
      <View style={styles.row}>
        <View style={styles.left}>
          <View style={styles.titles}>
            {subtitle ? (
              <Text
                style={[styles.eyebrow, { color: muted }, light && styles.eyebrowLight]}
                numberOfLines={1}
              >
                {subtitle}
              </Text>
            ) : null}
            <Text style={[styles.title, styles.titleHero, { color: fg }]} numberOfLines={1}>
              {title}
            </Text>
          </View>
        </View>
        {right ? <View style={styles.right}>{right}</View> : null}
      </View>
      {!light ? <View style={styles.accent} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.lg,
  },
  wrapHero: {
    marginBottom: spacing.xl,
    paddingTop: spacing.xs,
  },
  wrapNested: {
    marginBottom: spacing.xl,
    gap: spacing.md,
  },
  nestedTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: touchTarget,
  },
  nestedTitles: {
    gap: 6,
    paddingRight: spacing.sm,
  },
  nestedEyebrow: {
    fontFamily: typography.fonts.semibold,
    fontSize: 12,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: colors.navyLift,
  },
  nestedTitle: {
    fontFamily: typography.fonts.displayExtra,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.7,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: touchTarget,
    gap: spacing.sm,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
    gap: spacing.md,
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  titles: {
    flex: 1,
    minWidth: 0,
    gap: 5,
  },
  eyebrow: {
    fontFamily: typography.fonts.medium,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  eyebrowLight: {
    letterSpacing: 0.8,
  },
  title: {
    fontFamily: typography.fonts.displayExtra,
    letterSpacing: -0.8,
  },
  titleHero: {
    fontSize: 32,
    lineHeight: 38,
  },
  accent: {
    width: 36,
    height: 3,
    borderRadius: radii.full,
    backgroundColor: colors.yellow,
    marginTop: 2,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },
  rightSpacer: {
    width: 40,
  },
});
