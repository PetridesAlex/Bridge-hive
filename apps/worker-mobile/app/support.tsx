import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/ui/AppScreen';
import { ListGroup } from '@/components/ui/Card';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { APP_CONFIG } from '@/constants/config';
import { colors, radii, spacing, typography } from '@/constants/theme';
import { useTranslation } from '@/i18n/locale-provider';

export default function SupportScreen() {
  const { t } = useTranslation();

  const topics = useMemo(
    () => [
      {
        title: t('support.topicAccount'),
        body: t('support.topicAccountBody'),
      },
      {
        title: t('support.topicShifts'),
        body: t('support.topicShiftsBody'),
      },
      {
        title: t('support.topicPayouts'),
        body: t('support.topicPayoutsBody'),
      },
    ],
    [t],
  );

  const openMail = (subject: string) => {
    void Linking.openURL(
      `mailto:${APP_CONFIG.supportEmail}?subject=${encodeURIComponent(subject)}`,
    );
  };

  return (
    <AppScreen contentKind="detail">
      <ScreenHeader
        title={t('support.title')}
        showBack
        titleSize="detail"
        subtitle={t('support.subtitle')}
      />

      <Text style={styles.lead}>{t('support.lead')}</Text>

      <Text style={styles.group}>{t('support.topics')}</Text>
      <ListGroup>
        {topics.map((topic, index) => (
          <View
            key={topic.title}
            style={[styles.topicRow, index < topics.length - 1 && styles.topicBorder]}
          >
            <Text style={styles.topicTitle}>{topic.title}</Text>
            <Text style={styles.topicBody}>{topic.body}</Text>
          </View>
        ))}
      </ListGroup>

      <Text style={styles.group}>{t('support.contact')}</Text>
      <Pressable
        style={styles.contactCard}
        onPress={() => openMail(t('support.mailSubject'))}
        accessibilityRole="button"
        accessibilityLabel={`${t('support.emailCta')} ${APP_CONFIG.supportEmail}`}
      >
        <View style={styles.contactIcon}>
          <Ionicons name="mail-outline" size={22} color={colors.navy} />
        </View>
        <View style={styles.contactCopy}>
          <Text style={styles.contactTitle}>{t('support.emailCta')}</Text>
          <Text style={styles.contactEmail}>{APP_CONFIG.supportEmail}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </Pressable>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  lead: {
    fontFamily: typography.fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  group: {
    fontFamily: typography.fonts.semibold,
    fontSize: 12,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  topicRow: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
  },
  topicBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  topicTitle: {
    fontFamily: typography.fonts.semibold,
    fontSize: 16,
    color: colors.navy,
    marginBottom: 4,
  },
  topicBody: {
    fontFamily: typography.fonts.regular,
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    minHeight: 64,
  },
  contactIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.tealSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactCopy: {
    flex: 1,
    minWidth: 0,
  },
  contactTitle: {
    fontFamily: typography.fonts.semibold,
    fontSize: 16,
    color: colors.navy,
  },
  contactEmail: {
    fontFamily: typography.fonts.regular,
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
