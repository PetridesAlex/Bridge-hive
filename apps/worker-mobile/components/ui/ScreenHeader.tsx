import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  Easing,
  FadeInDown,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { IconButton } from '@/components/ui/IconButton';
import { colors, radii, spacing, typography } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/useReducedMotion';

type Props = {
  title: string;
  /** Small context label above the title (root screens). */
  eyebrow?: string;
  /** Supporting sentence / meta below the title. */
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  /** Root: aligned with title row. Detail: aligned with back row. */
  right?: React.ReactNode;
  /** page = root; detail = nested screens */
  titleSize?: 'page' | 'detail';
  /** Unused — kept for call-site compatibility; premium chrome is always light. */
  light?: boolean;
  /** Entrance motion. Off when the header scrolls with page content. */
  motion?: boolean;
  /** Hide the honey accent rule (e.g. when the screen owns its own progress). */
  showAccent?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * Shared page header.
 * - Root (`showBack` false): eyebrow → title + right → accent → subtitle
 * - Detail (`showBack` true): back row → title → accent → subtitle
 */
export function ScreenHeader({
  title,
  eyebrow,
  subtitle,
  showBack = false,
  onBack,
  right,
  titleSize,
  motion = true,
  showAccent = true,
  style,
}: Props) {
  const router = useRouter();
  const reduced = useReducedMotion();
  const size = titleSize ?? (showBack ? 'detail' : 'page');
  const titleStyle = size === 'detail' ? styles.titleDetail : styles.titlePage;
  const enter = useSharedValue(reduced ? 1 : 0);

  useEffect(() => {
    if (reduced || !motion) {
      enter.value = 1;
      return;
    }
    enter.value = withTiming(1, {
      duration: 420,
      easing: Easing.out(Easing.cubic),
    });
  }, [enter, motion, reduced, title]);

  const motionStyle = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [{ translateY: interpolate(enter.value, [0, 1], [6, 0]) }],
  }));

  const ruleStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: interpolate(enter.value, [0, 1], [0.35, 1]) }],
    opacity: enter.value,
  }));

  if (showBack) {
    return (
      <View style={[styles.detailWrap, style]}>
        <View style={styles.detailTop} pointerEvents="box-none">
          <IconButton
            icon="chevron-back"
            accessibilityLabel="Go back"
            onPress={
              onBack ??
              (() => {
                if (router.canGoBack()) {
                  router.back();
                  return;
                }
                router.replace('/(tabs)/profile');
              })
            }
            color={colors.navy}
            backgroundColor={colors.surfaceSubdued}
            style={styles.backHit}
          />
          {right ? <View style={styles.rightSlot}>{right}</View> : <View style={styles.spacer} />}
        </View>
        {eyebrow ? (
          <Text style={styles.eyebrow} numberOfLines={1}>
            {eyebrow}
          </Text>
        ) : null}
        <Text style={titleStyle} numberOfLines={3}>
          {title}
        </Text>
        {showAccent ? (
          <Animated.View style={[styles.ruleTrack, ruleStyle]}>
            <LinearGradient
              colors={[colors.yellow, colors.honeyStrong]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.ruleFill}
            />
          </Animated.View>
        ) : null}
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={3}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    );
  }

  const headerBody = (
    <>
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(11, 42, 67, 0.05)', 'rgba(20, 169, 181, 0.07)', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.rootWash}
      />
      {eyebrow ? (
        <View style={styles.eyebrowRow}>
          <View style={styles.eyebrowDot} />
          <Text style={styles.eyebrow} numberOfLines={1}>
            {eyebrow}
          </Text>
        </View>
      ) : null}
      <View style={styles.titleRow}>
        <Text style={[titleStyle, styles.titleFlex]} numberOfLines={3}>
          {title}
        </Text>
        {right ? <View style={styles.rightSlot}>{right}</View> : null}
      </View>
      {showAccent ? (
        <Animated.View style={[styles.ruleTrack, ruleStyle]}>
          <LinearGradient
            colors={[colors.yellow, colors.honeyStrong]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.ruleFill}
          />
        </Animated.View>
      ) : null}
      {subtitle ? (
        <Text style={styles.subtitle} numberOfLines={3}>
          {subtitle}
        </Text>
      ) : null}
    </>
  );

  if (!motion) {
    return <View style={[styles.rootWrap, style]}>{headerBody}</View>;
  }

  return (
    <Animated.View
      style={[styles.rootWrap, motionStyle, style]}
      entering={reduced ? undefined : FadeInDown.duration(380).springify().damping(18)}
    >
      {headerBody}
    </Animated.View>
  );
}

export const PageHeader = ScreenHeader;
export const RootHeader = ScreenHeader;
export const DetailHeader = ScreenHeader;

const styles = StyleSheet.create({
  rootWrap: {
    paddingTop: spacing.md + 2,
    marginBottom: spacing.lg,
    gap: 10,
    position: 'relative',
    overflow: 'hidden',
    borderRadius: radii.lg,
    paddingBottom: spacing.md + 2,
    paddingHorizontal: spacing.xs,
  },
  rootWash: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radii.lg,
  },
  detailWrap: {
    paddingTop: spacing.sm,
    marginBottom: spacing.lg,
    gap: 8,
  },
  detailTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
    marginBottom: spacing.xs,
    zIndex: 4,
    position: 'relative',
  },
  backHit: {
    zIndex: 5,
    elevation: 5,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eyebrowDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.yellow,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.65)',
  },
  eyebrow: {
    fontFamily: typography.fonts.bold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: colors.tealStrong,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
    minHeight: 40,
  },
  titleFlex: {
    flex: 1,
    minWidth: 0,
  },
  titlePage: {
    fontFamily: typography.fonts.displayExtra,
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.7,
    color: colors.navy,
  },
  titleDetail: {
    fontFamily: typography.fonts.displayExtra,
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.4,
    color: colors.navy,
  },
  ruleTrack: {
    width: 44,
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 2,
    alignSelf: 'flex-start',
  },
  ruleFill: {
    flex: 1,
  },
  subtitle: {
    fontFamily: typography.fonts.medium,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
    maxWidth: 380,
    letterSpacing: -0.1,
  },
  rightSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    zIndex: 1,
  },
  spacer: {
    width: 44,
    height: 44,
  },
});
