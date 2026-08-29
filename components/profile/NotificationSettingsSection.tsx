import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { colors, radii, spacing, typography } from '@/constants/theme';

type LanguageCode = 'EL' | 'EN';

type PrefKey = 'shiftReminders' | 'paymentAlerts' | 'accountUpdates';

const NOTIFICATION_PREFS: {
  key: PrefKey;
  label: string;
  description: string;
}[] = [
  {
    key: 'shiftReminders',
    label: 'Shift reminders',
    description: 'Upcoming shift times and check-in alerts',
  },
  {
    key: 'paymentAlerts',
    label: 'Payment alerts',
    description: 'Payouts, invoices, and balance updates',
  },
  {
    key: 'accountUpdates',
    label: 'Account notifications',
    description: 'Documents, verification, and important account news',
  },
];

export function NotificationSettingsSection() {
  const [language, setLanguage] = useState<LanguageCode>('EL');
  const [showPrefs, setShowPrefs] = useState(false);
  const [prefs, setPrefs] = useState<Record<PrefKey, boolean>>({
    shiftReminders: true,
    paymentAlerts: true,
    accountUpdates: true,
  });

  const cycleLanguage = () => {
    setLanguage((current) => (current === 'EL' ? 'EN' : 'EL'));
  };

  const togglePref = (key: PrefKey) => {
    setPrefs((current) => ({ ...current, [key]: !current[key] }));
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.block}>
        <Pressable
          onPress={cycleLanguage}
          style={({ pressed }) => [pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Communication language"
        >
          <Card padded={false}>
            <View style={styles.settingRow}>
              <View style={styles.iconWrap}>
                <Ionicons name="document-text-outline" size={18} color={colors.blue} />
              </View>
              <Text style={styles.settingLabel}>Communication language</Text>
              <Text style={styles.settingValue}>{language}</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </View>
          </Card>
        </Pressable>
        <Text style={styles.help}>
          Preferred language for email and payment attachments.
        </Text>
      </View>

      <View style={styles.block}>
        <Pressable
          onPress={() => setShowPrefs((open) => !open)}
          style={({ pressed }) => [pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Notifications"
          accessibilityState={{ expanded: showPrefs }}
        >
          <Card padded={false}>
            <View style={styles.settingRow}>
              <View style={styles.iconWrap}>
                <Ionicons name="notifications-outline" size={18} color={colors.blue} />
              </View>
              <Text style={styles.settingLabel}>Notifications</Text>
              <Ionicons
                name={showPrefs ? 'chevron-down' : 'chevron-forward'}
                size={18}
                color={colors.textMuted}
              />
            </View>
          </Card>
        </Pressable>
        <Text style={styles.help}>
          Choose which updates you want to receive, whether it's shift reminders, payment alerts,
          or important account notifications.
        </Text>
      </View>

      {showPrefs ? (
        <Card padded={false} style={styles.prefsCard}>
          <Text style={styles.prefsTitle}>Notification preferences</Text>
          {NOTIFICATION_PREFS.map((item, index) => (
            <View
              key={item.key}
              style={[
                styles.prefRow,
                index < NOTIFICATION_PREFS.length - 1 && styles.prefBorder,
              ]}
            >
              <View style={styles.prefText}>
                <Text style={styles.prefLabel}>{item.label}</Text>
                <Text style={styles.prefDescription}>{item.description}</Text>
              </View>
              <Switch
                value={prefs[item.key]}
                onValueChange={() => togglePref(item.key)}
                trackColor={{ false: colors.border, true: colors.blue }}
                thumbColor={colors.white}
                ios_backgroundColor={colors.border}
              />
            </View>
          ))}
        </Card>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.xl,
  },
  block: {
    gap: spacing.sm,
  },
  pressed: {
    opacity: 0.92,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    minHeight: 60,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    backgroundColor: colors.blueLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingLabel: {
    flex: 1,
    fontFamily: typography.fonts.semibold,
    fontSize: typography.size.md,
    color: colors.navy,
  },
  settingValue: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.size.md,
    color: colors.textSecondary,
  },
  help: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    color: colors.textMuted,
    marginHorizontal: spacing.xs,
  },
  prefsCard: {
    marginTop: -spacing.sm,
  },
  prefsTitle: {
    fontFamily: typography.fonts.medium,
    fontSize: typography.size.sm,
    color: colors.blue,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  prefBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  prefText: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  prefLabel: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.size.md,
    color: colors.navy,
  },
  prefDescription: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    lineHeight: typography.lineHeight.sm,
  },
});
