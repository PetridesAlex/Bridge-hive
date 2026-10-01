import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/ui/AppScreen';
import { ListGroup } from '@/components/ui/Card';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { APP_CONFIG } from '@/constants/config';
import { colors, radii, spacing, typography } from '@/constants/theme';

const TOPICS = [
  {
    title: 'Account & verification',
    body: 'Questions about Account Setup, credentials, or marketplace approval.',
  },
  {
    title: 'Shifts & timesheets',
    body: 'Help with check-in, check-out, or submitted hours.',
  },
  {
    title: 'Payouts & invoices',
    body: 'Bank account review, earnings, or Bridge Hive commission invoices.',
  },
] as const;

export default function SupportScreen() {
  const openMail = (subject: string) => {
    void Linking.openURL(
      `mailto:${APP_CONFIG.supportEmail}?subject=${encodeURIComponent(subject)}`,
    );
  };

  return (
    <AppScreen contentKind="detail">
      <ScreenHeader
        title="Support"
        showBack
        titleSize="detail"
        subtitle="Get help with your Bridge Hive worker account."
      />

      <Text style={styles.lead}>
        Browse common topics below, then contact the Bridge Hive team. Include your registered
        email so we can find your account quickly.
      </Text>

      <Text style={styles.group}>Topics</Text>
      <ListGroup>
        {TOPICS.map((topic, index) => (
          <View
            key={topic.title}
            style={[styles.topicRow, index < TOPICS.length - 1 && styles.topicBorder]}
          >
            <Text style={styles.topicTitle}>{topic.title}</Text>
            <Text style={styles.topicBody}>{topic.body}</Text>
          </View>
        ))}
      </ListGroup>

      <Text style={styles.group}>Contact</Text>
      <Pressable
        style={styles.contactCard}
        onPress={() => openMail('Bridge Hive worker support')}
        accessibilityRole="button"
        accessibilityLabel={`Email ${APP_CONFIG.supportEmail}`}
      >
        <View style={styles.contactIcon}>
          <Ionicons name="mail-outline" size={22} color={colors.navy} />
        </View>
        <View style={styles.contactCopy}>
          <Text style={styles.contactTitle}>Email support</Text>
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
