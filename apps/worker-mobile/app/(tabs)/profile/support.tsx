import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { AppScreen } from '@/components/ui/AppScreen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { APP_CONFIG } from '@/constants/config';
import { colors, shadows, spacing, typography } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useTranslation } from '@/i18n/locale-provider';

type TopicTone = 'account' | 'shifts' | 'payouts';

const TOPIC_VISUAL: Record<
  TopicTone,
  {
    icon: keyof typeof Ionicons.glyphMap;
    mark: [string, string];
    wash: [string, string];
  }
> = {
  account: {
    icon: 'shield-checkmark',
    mark: ['#2A6BD6', '#123A5C'],
    wash: ['rgba(42, 107, 214, 0.10)', 'rgba(42, 107, 214, 0)'],
  },
  shifts: {
    icon: 'time',
    mark: [colors.tealStrong, '#0E7A8A'],
    wash: ['rgba(20, 169, 181, 0.10)', 'rgba(20, 169, 181, 0)'],
  },
  payouts: {
    icon: 'wallet',
    mark: [colors.yellow, colors.honeyStrong],
    wash: ['rgba(224, 170, 24, 0.12)', 'rgba(224, 170, 24, 0)'],
  },
};

function TopicCard({
  tone,
  title,
  body,
  cta,
  delay,
  onPress,
}: {
  tone: TopicTone;
  title: string;
  body: string;
  cta: string;
  delay: number;
  onPress: () => void;
}) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  const visual = TOPIC_VISUAL[tone];
  const motionStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      entering={
        reduced
          ? undefined
          : FadeInDown.delay(delay).duration(420).springify().damping(18)
      }
      style={motionStyle}
    >
      <Pressable
        onPress={onPress}
        onPressIn={() => {
          if (!reduced) scale.value = withSpring(0.985, { damping: 18, stiffness: 420 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 14, stiffness: 260 });
        }}
        accessibilityRole="button"
        accessibilityLabel={`${title}. ${cta}`}
        style={({ pressed }) => [styles.topicCard, pressed && styles.pressed]}
      >
        <LinearGradient
          pointerEvents="none"
          colors={visual.wash}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        <LinearGradient
          colors={visual.mark}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.topicMark}
        >
          <Ionicons name={visual.icon} size={18} color={colors.white} />
        </LinearGradient>
        <View style={styles.topicCopy}>
          <Text style={styles.topicTitle}>{title}</Text>
          <Text style={styles.topicBody}>{body}</Text>
          <View style={styles.topicCtaRow}>
            <Text style={styles.topicCta}>{cta}</Text>
            <Ionicons name="arrow-forward" size={14} color={colors.navy} />
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default function SupportScreen() {
  const { t } = useTranslation();
  const reduced = useReducedMotion();

  const topics = useMemo(
    () =>
      [
        {
          tone: 'account' as const,
          title: t('support.topicAccount'),
          body: t('support.topicAccountBody'),
          subject: t('support.topicAccountMail'),
        },
        {
          tone: 'shifts' as const,
          title: t('support.topicShifts'),
          body: t('support.topicShiftsBody'),
          subject: t('support.topicShiftsMail'),
        },
        {
          tone: 'payouts' as const,
          title: t('support.topicPayouts'),
          body: t('support.topicPayoutsBody'),
          subject: t('support.topicPayoutsMail'),
        },
      ] as const,
    [t],
  );

  const openMail = (subject: string) => {
    void Linking.openURL(
      `mailto:${APP_CONFIG.supportEmail}?subject=${encodeURIComponent(subject)}`,
    );
  };

  const contactScale = useSharedValue(1);
  const contactStyle = useAnimatedStyle(() => ({
    transform: [{ scale: contactScale.value }],
  }));

  return (
    <AppScreen contentKind="detail" clearTabBar>
      <ScreenHeader
        title={t('support.title')}
        showBack
        titleSize="detail"
        eyebrow={t('support.eyebrow')}
        subtitle={t('support.subtitle')}
      />

      <Animated.View
        entering={
          reduced ? undefined : FadeInDown.delay(40).duration(400).springify().damping(18)
        }
        style={styles.hero}
      >
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(11, 42, 67, 0.06)', 'rgba(20, 169, 181, 0.08)', 'rgba(224, 170, 24, 0.10)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.heroMark}>
          <LinearGradient
            colors={['#2A6BD6', '#0B2A43']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroMarkFill}
          >
            <Ionicons name="headset" size={22} color={colors.white} />
          </LinearGradient>
        </View>
        <View style={styles.heroCopy}>
          <Text style={styles.heroTitle}>{t('support.leadTitle')}</Text>
          <Text style={styles.heroBody}>{t('support.lead')}</Text>
        </View>
      </Animated.View>

      <Text style={styles.group}>{t('support.topics')}</Text>
      <View style={styles.topicStack}>
        {topics.map((topic, index) => (
          <TopicCard
            key={topic.tone}
            tone={topic.tone}
            title={topic.title}
            body={topic.body}
            cta={t('support.topicCta')}
            delay={80 + index * 55}
            onPress={() => openMail(topic.subject)}
          />
        ))}
      </View>

      <Text style={styles.group}>{t('support.contact')}</Text>
      <Animated.View
        entering={
          reduced
            ? undefined
            : FadeInDown.delay(280).duration(420).springify().damping(18)
        }
        style={contactStyle}
      >
        <Pressable
          onPress={() => openMail(t('support.mailSubject'))}
          onPressIn={() => {
            if (!reduced) {
              contactScale.value = withSpring(0.985, { damping: 18, stiffness: 420 });
            }
          }}
          onPressOut={() => {
            contactScale.value = withSpring(1, { damping: 14, stiffness: 260 });
          }}
          accessibilityRole="button"
          accessibilityLabel={`${t('support.emailCta')} ${APP_CONFIG.supportEmail}`}
          style={({ pressed }) => [styles.contactCard, pressed && styles.pressed]}
        >
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(224, 170, 24, 0.16)', 'rgba(11, 42, 67, 0.04)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
          <LinearGradient
            colors={[colors.yellow, colors.honeyStrong]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.contactIcon}
          >
            <Ionicons name="mail" size={20} color={colors.navy} />
          </LinearGradient>
          <View style={styles.contactCopy}>
            <Text style={styles.contactTitle}>{t('support.emailCta')}</Text>
            <Text style={styles.contactEmail}>{APP_CONFIG.supportEmail}</Text>
            <Text style={styles.contactHint}>{t('support.contactHint')}</Text>
          </View>
          <View style={styles.contactArrow}>
            <Ionicons name="arrow-forward" size={16} color={colors.navy} />
          </View>
        </Pressable>
      </Animated.View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  hero: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(11, 42, 67, 0.10)',
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  heroMark: {
    marginTop: 2,
  },
  heroMarkFill: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCopy: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  heroTitle: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.25,
    color: colors.navy,
  },
  heroBody: {
    fontFamily: typography.fonts.regular,
    fontSize: 14,
    lineHeight: 21,
    color: colors.textSecondary,
  },
  group: {
    fontFamily: typography.fonts.semibold,
    fontSize: 12,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  topicStack: {
    gap: spacing.sm,
  },
  topicCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.md + 2,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(11, 42, 67, 0.10)',
  },
  topicMark: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topicCopy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  topicTitle: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 16,
    lineHeight: 21,
    letterSpacing: -0.2,
    color: colors.navy,
  },
  topicBody: {
    fontFamily: typography.fonts.regular,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
  },
  topicCtaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  topicCta: {
    fontFamily: typography.fonts.semibold,
    fontSize: 13,
    letterSpacing: -0.1,
    color: colors.navy,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(224, 170, 24, 0.36)',
    overflow: 'hidden',
    minHeight: 88,
    ...shadows.sm,
  },
  contactIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  contactTitle: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 16,
    letterSpacing: -0.2,
    color: colors.navy,
  },
  contactEmail: {
    fontFamily: typography.fonts.medium,
    fontSize: 14,
    color: colors.textSecondary,
  },
  contactHint: {
    fontFamily: typography.fonts.regular,
    fontSize: 12,
    lineHeight: 17,
    color: colors.textMuted,
    marginTop: 4,
  },
  contactArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(11, 42, 67, 0.06)',
  },
  pressed: {
    opacity: 0.94,
  },
});
