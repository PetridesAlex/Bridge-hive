import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { IconButton } from '@/components/ui/IconButton';
import { colors, spacing, typography } from '@/constants/theme';
import { useRouter } from 'expo-router';

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
  /** page = 28/34 root; detail = 24/30 for long titles / short page names */
  titleSize?: 'page' | 'detail';
  /** Unused — kept for call-site compatibility; premium chrome is always light. */
  light?: boolean;
};

/**
 * Shared page header.
 * - Root (`showBack` false): eyebrow → title + right → subtitle
 * - Detail (`showBack` true): back row → title → subtitle
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
        <Text style={titleStyle} numberOfLines={3}>
          {title}
        </Text>
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
      {eyebrow ? (
        <Text style={styles.eyebrow} numberOfLines={1}>
          {eyebrow}
        </Text>
      ) : null}
      <View style={styles.titleRow}>
        <Text style={[titleStyle, styles.titleFlex]} numberOfLines={3}>
          {title}
        </Text>
        {right ? <View style={styles.rightSlot}>{right}</View> : null}
      </View>
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
    gap: spacing.xs,
  },
  detailWrap: {
    paddingTop: spacing.sm,
    marginBottom: spacing.lg,
    gap: spacing.xs,
  },
  detailTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
    marginBottom: spacing.sm,
  },
  eyebrow: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.tealStrong,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
    minHeight: 44,
  },
  titleFlex: {
    flex: 1,
    minWidth: 0,
  },
  titlePage: {
    fontFamily: typography.fonts.display,
    fontSize: typography.size.xxxl,
    lineHeight: typography.lineHeight.xxxl,
    letterSpacing: -0.3,
    color: colors.navy,
  },
  titleDetail: {
    fontFamily: typography.fonts.display,
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.3,
    color: colors.navy,
  },
  subtitle: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
    color: colors.textSecondary,
  },
  rightSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },
  spacer: {
    width: 44,
    height: 44,
  },
});
