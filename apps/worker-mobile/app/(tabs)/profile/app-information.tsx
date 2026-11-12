import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { BridgeHiveMark } from '@/components/brand/BridgeHiveMark';
import { AppScreen } from '@/components/ui/AppScreen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { colors, shadows, spacing, typography } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useTranslation } from '@/i18n/locale-provider';

type SpecRow = {
  key: string;
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone: 'navy' | 'teal' | 'honey';
};

const TONE = {
  navy: {
    mark: ['#2A6BD6', '#0B2A43'] as [string, string],
  },
  teal: {
    mark: [colors.tealStrong, '#0E7A8A'] as [string, string],
  },
  honey: {
    mark: [colors.yellow, colors.honeyStrong] as [string, string],
  },
} as const;

function SpecCard({
  row,
  delay,
  last,
}: {
  row: SpecRow;
  delay: number;
  last: boolean;
}) {
  const reduced = useReducedMotion();
  const tone = TONE[row.tone];

  return (
    <Animated.View
      entering={
        reduced
          ? undefined
          : FadeInDown.delay(delay).duration(400).springify().damping(18)
      }
      style={[styles.specRow, !last && styles.specRowBorder]}
    >
      <LinearGradient
        colors={tone.mark}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.specIcon}
      >
        <Ionicons
          name={row.icon}
          size={16}
          color={row.tone === 'honey' ? colors.navy : colors.white}
        />
      </LinearGradient>
      <View style={styles.specCopy}>
        <Text style={styles.specLabel}>{row.label}</Text>
        <Text style={styles.specValue} numberOfLines={2}>
          {row.value}
        </Text>
      </View>
    </Animated.View>
  );
}

export default function AppInformationScreen() {
  const { t } = useTranslation();
  const reduced = useReducedMotion();

  const version =
    Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? '1.0.0';
  const build =
    Constants.expoConfig?.ios?.buildNumber ??
    Constants.expoConfig?.android?.versionCode?.toString() ??
    Constants.nativeBuildVersion ??
    null;
  const channel =
    (Constants.expoConfig?.extra as { eas?: { channel?: string } } | undefined)
      ?.eas?.channel ??
    Constants.executionEnvironment ??
    null;
  const platformLabel =
    Platform.OS === 'ios'
      ? 'iOS'
      : Platform.OS === 'android'
        ? 'Android'
        : Platform.OS === 'web'
          ? 'Web'
          : Platform.OS;

  const rows = useMemo<SpecRow[]>(() => {
    const next: SpecRow[] = [
      {
        key: 'version',
        label: t('profile.appInfoVersion'),
        value: version,
        icon: 'pricetag',
        tone: 'honey',
      },
    ];
    if (build) {
      next.push({
        key: 'build',
        label: t('profile.appInfoBuild'),
        value: String(build),
        icon: 'construct',
        tone: 'teal',
      });
    }
    next.push({
      key: 'platform',
      label: t('profile.appInfoPlatform'),
      value: platformLabel,
      icon: Platform.OS === 'ios' ? 'logo-apple' : Platform.OS === 'android' ? 'logo-android' : 'globe',
      tone: 'navy',
    });
    if (channel) {
      next.push({
        key: 'channel',
        label: t('profile.appInfoChannel'),
        value: String(channel),
        icon: 'git-branch',
        tone: 'teal',
      });
    }
    return next;
  }, [build, channel, platformLabel, t, version]);

  return (
    <AppScreen contentKind="detail" clearTabBar>
      <ScreenHeader
        title={t('profile.appInformation')}
        showBack
        backFallback="/(tabs)/profile"
        titleSize="detail"
        eyebrow={t('profile.appInfoEyebrow')}
        subtitle={t('profile.appInfoLead')}
      />

      <Animated.View
        entering={
          reduced
            ? undefined
            : FadeInDown.delay(40).duration(420).springify().damping(18)
        }
        style={styles.hero}
      >
        <LinearGradient
          pointerEvents="none"
          colors={[
            'rgba(11, 42, 67, 0.06)',
            'rgba(20, 169, 181, 0.08)',
            'rgba(224, 170, 24, 0.12)',
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.heroMarkWrap}>
          <BridgeHiveMark size={72} />
        </View>
        <View style={styles.heroCopy}>
          <Text style={styles.heroBrand}>{t('common.brandName')}</Text>
          <Text style={styles.heroTag}>{t('profile.workerApp')}</Text>
          <View style={styles.heroBadges}>
            <View style={[styles.badge, styles.badgeHoney]}>
              <View style={styles.badgeDotHoney} />
              <Text style={styles.badgeText}>v{version}</Text>
            </View>
            {build ? (
              <View style={[styles.badge, styles.badgeTeal]}>
                <View style={styles.badgeDotTeal} />
                <Text style={[styles.badgeText, styles.badgeTextTeal]}>
                  {t('profile.appInfoBuild')} {build}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </Animated.View>

      <Text style={styles.group}>{t('profile.appInfoSpecs')}</Text>
      <View style={styles.specCard}>
        {rows.map((row, index) => (
          <SpecCard
            key={row.key}
            row={row}
            delay={90 + index * 50}
            last={index === rows.length - 1}
          />
        ))}
      </View>

      <Animated.View
        entering={
          reduced
            ? undefined
            : FadeInDown.delay(280).duration(400).springify().damping(18)
        }
        style={styles.footnote}
      >
        <Ionicons name="information-circle" size={16} color={colors.textMuted} />
        <Text style={styles.footnoteText}>{t('profile.appInfoFootnote')}</Text>
      </Animated.View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md + 2,
    padding: spacing.lg,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(11, 42, 67, 0.10)',
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  heroMarkWrap: {
    borderRadius: 18,
    overflow: 'hidden',
    ...shadows.sm,
  },
  heroCopy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  heroBrand: {
    fontFamily: typography.fonts.displayExtra,
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: -0.6,
    color: colors.navy,
  },
  heroTag: {
    fontFamily: typography.fonts.medium,
    fontSize: 13,
    color: colors.textSecondary,
  },
  heroBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  badgeHoney: {
    backgroundColor: 'rgba(224, 170, 24, 0.14)',
    borderColor: 'rgba(224, 170, 24, 0.36)',
  },
  badgeTeal: {
    backgroundColor: 'rgba(20, 169, 181, 0.12)',
    borderColor: 'rgba(20, 169, 181, 0.28)',
  },
  badgeDotHoney: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.yellow,
  },
  badgeDotTeal: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.tealStrong,
  },
  badgeText: {
    fontFamily: typography.fonts.semibold,
    fontSize: 12,
    letterSpacing: -0.1,
    color: colors.navy,
  },
  badgeTextTeal: {
    color: '#0E7A8A',
  },
  group: {
    fontFamily: typography.fonts.semibold,
    fontSize: 12,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: spacing.sm,
  },
  specCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(11, 42, 67, 0.10)',
    ...shadows.sm,
  },
  specRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.md,
  },
  specRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(11, 42, 67, 0.08)',
  },
  specIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  specCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  specLabel: {
    fontFamily: typography.fonts.medium,
    fontSize: 12,
    color: colors.textMuted,
  },
  specValue: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 16,
    letterSpacing: -0.2,
    color: colors.navy,
  },
  footnote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xs,
  },
  footnoteText: {
    flex: 1,
    fontFamily: typography.fonts.regular,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textMuted,
  },
});
