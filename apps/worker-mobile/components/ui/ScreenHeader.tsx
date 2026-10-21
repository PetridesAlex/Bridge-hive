import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { IconButton } from '@/components/ui/IconButton';
import { colors, radii, spacing, typography } from '@/constants/theme';

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
}: Props) {
  const router = useRouter();
  const size = titleSize ?? (showBack ? 'detail' : 'page');
  const titleStyle = size === 'detail' ? styles.titleDetail : styles.titlePage;

  if (showBack) {
    return (
      <View style={styles.detailWrap}>
        <View style={styles.detailTop}>
          <IconButton
            icon="chevron-back"
            accessibilityLabel="Go back"
            onPress={onBack ?? (() => router.back())}
            color={colors.navy}
            backgroundColor={colors.surfaceSubdued}
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
        <View style={styles.rule} />
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={3}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.rootWrap}>
      <View style={styles.rootWash} pointerEvents="none" />
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
      <View style={styles.rule} />
      {subtitle ? (
        <Text style={styles.subtitle} numberOfLines={3}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

export const PageHeader = ScreenHeader;
export const RootHeader = ScreenHeader;
export const DetailHeader = ScreenHeader;

const styles = StyleSheet.create({
  rootWrap: {
    paddingTop: spacing.md,
    marginBottom: spacing.lg,
    gap: 8,
    position: 'relative',
    overflow: 'hidden',
    borderRadius: radii.lg,
    paddingBottom: spacing.md,
    paddingHorizontal: 2,
  },
  rootWash: {
    position: 'absolute',
    top: 0,
    left: -8,
    right: -8,
    bottom: 0,
    borderRadius: radii.lg,
    backgroundColor: 'rgba(20, 169, 181, 0.05)',
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
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eyebrowDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.yellow,
  },
  eyebrow: {
    fontFamily: typography.fonts.semibold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 1,
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
    fontFamily: typography.fonts.display,
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -0.5,
    color: colors.navy,
  },
  titleDetail: {
    fontFamily: typography.fonts.display,
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.3,
    color: colors.navy,
  },
  rule: {
    width: 36,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.yellow,
    marginTop: 2,
  },
  subtitle: {
    fontFamily: typography.fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
    maxWidth: 360,
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
