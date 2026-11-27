import { notificationEnableAction, type OsNotificationPermission } from '@bridge-hive/domain';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Platform, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { AppScreen } from '@/components/ui/AppScreen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { colors, shadows, spacing, typography } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useTranslation } from '@/i18n/locale-provider';
import {
  getCalendarSyncEnabled,
  setCalendarSyncEnabled,
} from '@/lib/calendar/mapping';
import {
  probeCalendarPermission,
  reconcileCalendarAssignments,
  requestCalendarPermission,
} from '@/lib/calendar/sync';
import { getMyAssignments } from '@/lib/queries';
import {
  enableShiftNotifications,
  openDeviceNotificationSettings,
  probeNotificationPermission,
  readShiftPushPreference,
  setShiftPushPreference,
} from '@/lib/push/client';
import { useAuth } from '@/providers/AuthProvider';

type PrefTone = 'shifts' | 'sound' | 'calendar';

const TONE: Record<
  PrefTone,
  { mark: [string, string]; wash: [string, string]; icon: keyof typeof Ionicons.glyphMap }
> = {
  shifts: {
    mark: [colors.yellow, colors.honeyStrong],
    wash: ['rgba(224, 170, 24, 0.10)', 'rgba(224, 170, 24, 0)'],
    icon: 'notifications',
  },
  sound: {
    mark: [colors.tealStrong, '#0E7A8A'],
    wash: ['rgba(20, 169, 181, 0.10)', 'rgba(20, 169, 181, 0)'],
    icon: 'volume-high',
  },
  calendar: {
    mark: ['#2A6BD6', '#0B2A43'],
    wash: ['rgba(42, 107, 214, 0.10)', 'rgba(42, 107, 214, 0)'],
    icon: 'calendar',
  },
};

function PreferenceRow({
  tone,
  title,
  body,
  delay,
  trailing,
  last = false,
}: {
  tone: PrefTone;
  title: string;
  body: string;
  delay: number;
  trailing: React.ReactNode;
  last?: boolean;
}) {
  const reduced = useReducedMotion();
  const visual = TONE[tone];

  return (
    <Animated.View
      entering={
        reduced
          ? undefined
          : FadeInDown.delay(delay).duration(400).springify().damping(18)
      }
      style={[styles.row, !last && styles.rowBorder]}
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
        style={styles.rowMark}
      >
        <Ionicons
          name={visual.icon}
          size={17}
          color={tone === 'shifts' ? colors.navy : colors.white}
        />
      </LinearGradient>
      <View style={styles.rowCopy}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowBody}>{body}</Text>
      </View>
      <View style={styles.rowTrailing}>{trailing}</View>
    </Animated.View>
  );
}

export default function NotificationPreferencesScreen() {
  const { t, language } = useTranslation();
  const { user } = useAuth();
  const reduced = useReducedMotion();
  const [permission, setPermission] = useState<OsNotificationPermission>('undetermined');
  const [enabled, setEnabled] = useState(false);
  const [calendarEnabled, setCalendarEnabled] = useState(false);
  const [working, setWorking] = useState(false);

  const refresh = useCallback(async () => {
    const status = await probeNotificationPermission();
    setPermission(status);
    if (status !== 'granted') {
      setEnabled(false);
    } else {
      const preference = await readShiftPushPreference();
      setEnabled(preference ?? true);
    }
    if (user?.id) {
      setCalendarEnabled(await getCalendarSyncEnabled(user.id));
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const onToggle = async (next: boolean) => {
    if (working) return;
    const action = notificationEnableAction(permission);
    if (next && action === 'settings') {
      await openDeviceNotificationSettings();
      return;
    }
    if (next && action === 'request') {
      setWorking(true);
      const status = await enableShiftNotifications();
      setPermission(status);
      setEnabled(status === 'granted');
      setWorking(false);
      return;
    }
    if (permission !== 'granted') return;
    setEnabled(next);
    setWorking(true);
    await setShiftPushPreference(next);
    setWorking(false);
  };

  const onToggleCalendar = async (next: boolean) => {
    if (working || !user?.id) return;
    setWorking(true);
    if (next) {
      const status = await requestCalendarPermission();
      if (status !== 'granted') {
        setCalendarEnabled(false);
        setWorking(false);
        return;
      }
      await setCalendarSyncEnabled(user.id, true);
      setCalendarEnabled(true);
      const assignments = await getMyAssignments(user.id);
      await reconcileCalendarAssignments({
        workerId: user.id,
        locale: language,
        assignments: (assignments.data ?? []).map((row) => ({
          assignmentId: row.id,
          status: row.status,
          startsAt: row.shifts?.starts_at ?? '',
          endsAt: row.shifts?.ends_at ?? '',
          organizationName: 'Organization',
          roleLabel: row.shifts?.required_role ?? null,
        })),
      });
    } else {
      await setCalendarSyncEnabled(user.id, false);
      setCalendarEnabled(false);
    }
    setWorking(false);
  };

  const onManualSync = async () => {
    if (!user?.id || working) return;
    setWorking(true);
    const status = await probeCalendarPermission();
    if (status !== 'granted') {
      await requestCalendarPermission();
    }
    const assignments = await getMyAssignments(user.id);
    await reconcileCalendarAssignments({
      workerId: user.id,
      locale: language,
      assignments: (assignments.data ?? []).map((row) => ({
        assignmentId: row.id,
        status: row.status,
        startsAt: row.shifts?.starts_at ?? '',
        endsAt: row.shifts?.ends_at ?? '',
        organizationName: 'Organization',
        roleLabel: row.shifts?.required_role ?? null,
      })),
    });
    setWorking(false);
  };

  const denied = permission === 'denied';
  const alertsActive = enabled && permission === 'granted';

  return (
    <AppScreen contentKind="detail" clearTabBar>
      <ScreenHeader
        title={t('profile.notificationPreferences')}
        showBack
        backFallback="/(tabs)/profile"
        titleSize="detail"
        eyebrow={t('profile.prefsEyebrow')}
        subtitle={t('profile.prefsLead')}
      />

      <Animated.View
        entering={
          reduced
            ? undefined
            : FadeInDown.delay(40).duration(400).springify().damping(18)
        }
        style={styles.hero}
      >
        <LinearGradient
          pointerEvents="none"
          colors={[
            'rgba(11, 42, 67, 0.05)',
            'rgba(20, 169, 181, 0.08)',
            'rgba(224, 170, 24, 0.12)',
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        <LinearGradient
          colors={
            alertsActive
              ? [colors.yellow, colors.honeyStrong]
              : [colors.navy, '#123A5C']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroMark}
        >
          <Ionicons
            name={alertsActive ? 'notifications' : 'notifications-off'}
            size={22}
            color={alertsActive ? colors.navy : colors.white}
          />
        </LinearGradient>
        <View style={styles.heroCopy}>
          <Text style={styles.heroTitle}>
            {alertsActive
              ? t('profile.prefsHeroOn')
              : t('profile.prefsHeroOff')}
          </Text>
          <Text style={styles.heroBody}>{t('profile.prefsHeroBody')}</Text>
          <View style={styles.heroBadges}>
            <View
              style={[
                styles.badge,
                alertsActive ? styles.badgeOn : styles.badgeOff,
              ]}
            >
              <View
                style={[
                  styles.badgeDot,
                  { backgroundColor: alertsActive ? colors.success : colors.textMuted },
                ]}
              />
              <Text
                style={[
                  styles.badgeText,
                  !alertsActive && styles.badgeTextMuted,
                ]}
              >
                {alertsActive
                  ? t('profile.prefsStatusOn')
                  : t('profile.prefsStatusOff')}
              </Text>
            </View>
            {calendarEnabled ? (
              <View style={[styles.badge, styles.badgeTeal]}>
                <View
                  style={[styles.badgeDot, { backgroundColor: colors.tealStrong }]}
                />
                <Text style={[styles.badgeText, styles.badgeTextTeal]}>
                  {t('profile.prefsCalendarOn')}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </Animated.View>

      <Text style={styles.group}>{t('profile.prefsAlerts')}</Text>
      <View style={styles.card}>
        <PreferenceRow
          tone="shifts"
          delay={80}
          title={t('profile.prefsMatchingTitle')}
          body={t('profile.prefsMatchingBody')}
          trailing={
            <Switch
              accessibilityLabel={t('profile.prefsMatchingTitle')}
              value={enabled}
              disabled={working}
              onValueChange={(value) => void onToggle(value)}
              trackColor={{ false: 'rgba(11, 42, 67, 0.18)', true: colors.navy }}
              thumbColor={enabled ? colors.yellow : colors.white}
              ios_backgroundColor="rgba(11, 42, 67, 0.18)"
            />
          }
        />
        <PreferenceRow
          tone="sound"
          delay={130}
          title={t('profile.prefsSoundTitle')}
          body={t('profile.prefsSoundBody')}
          trailing={
            <View style={styles.deviceChip}>
              <Ionicons name="phone-portrait-outline" size={13} color={colors.navy} />
              <Text style={styles.deviceChipText}>{t('profile.prefsSoundDevice')}</Text>
            </View>
          }
        />
        <PreferenceRow
          tone="calendar"
          delay={180}
          last
          title={t('calendar.syncLabel')}
          body={t('calendar.syncHelp')}
          trailing={
            <Switch
              accessibilityLabel={t('calendar.syncLabel')}
              value={calendarEnabled}
              disabled={working || Platform.OS === 'web' || !user?.id}
              onValueChange={(value) => void onToggleCalendar(value)}
              trackColor={{ false: 'rgba(11, 42, 67, 0.18)', true: colors.navy }}
              thumbColor={calendarEnabled ? colors.yellow : colors.white}
              ios_backgroundColor="rgba(11, 42, 67, 0.18)"
            />
          }
        />
      </View>

      {calendarEnabled && Platform.OS !== 'web' ? (
        <Animated.View
          entering={
            reduced
              ? undefined
              : FadeInDown.delay(220).duration(360).springify().damping(18)
          }
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('calendar.syncManual')}
            disabled={working}
            onPress={() => void onManualSync()}
            style={({ pressed }) => [
              styles.syncBtn,
              pressed && styles.pressed,
              working && styles.disabled,
            ]}
          >
            <LinearGradient
              colors={['#2A6BD6', colors.navy]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.syncBtnFill}
            >
              <Ionicons name="sync" size={16} color={colors.white} />
              <Text style={styles.syncBtnLabel}>{t('calendar.syncManual')}</Text>
            </LinearGradient>
          </Pressable>
        </Animated.View>
      ) : null}

      {denied ? (
        <Animated.View
          entering={
            reduced
              ? undefined
              : FadeInDown.delay(240).duration(380).springify().damping(18)
          }
          style={styles.deniedCard}
        >
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(224, 170, 24, 0.14)', 'rgba(11, 42, 67, 0.04)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={styles.deniedMark}>
            <Ionicons name="warning" size={18} color={colors.navy} />
          </View>
          <View style={styles.deniedCopy}>
            <Text style={styles.deniedTitle}>
              {Platform.OS === 'web'
                ? t('profile.prefsDeniedWebTitle')
                : t('profile.prefsDeniedTitle')}
            </Text>
            <Text style={styles.deniedBody}>
              {Platform.OS === 'web'
                ? t('profile.prefsDeniedWebBody')
                : t('profile.prefsDeniedBody')}
            </Text>
            {Platform.OS === 'web' ? null : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('profile.prefsOpenSettings')}
                onPress={() => void openDeviceNotificationSettings()}
                style={({ pressed }) => [
                  styles.settingsBtn,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.settingsBtnLabel}>
                  {t('profile.prefsOpenSettings')}
                </Text>
                <Ionicons name="open-outline" size={15} color={colors.navy} />
              </Pressable>
            )}
          </View>
        </Animated.View>
      ) : null}
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
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
  },
  heroBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
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
  badgeOn: {
    backgroundColor: 'rgba(34, 160, 107, 0.12)',
    borderColor: 'rgba(34, 160, 107, 0.32)',
  },
  badgeOff: {
    backgroundColor: 'rgba(11, 42, 67, 0.05)',
    borderColor: 'rgba(11, 42, 67, 0.10)',
  },
  badgeTeal: {
    backgroundColor: 'rgba(20, 169, 181, 0.12)',
    borderColor: 'rgba(20, 169, 181, 0.28)',
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeText: {
    fontFamily: typography.fonts.semibold,
    fontSize: 12,
    letterSpacing: -0.1,
    color: colors.navy,
  },
  badgeTextMuted: {
    color: colors.textSecondary,
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
  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(11, 42, 67, 0.10)',
    ...shadows.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.md,
    overflow: 'hidden',
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(11, 42, 67, 0.08)',
  },
  rowMark: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  rowCopy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
    paddingRight: 4,
  },
  rowTitle: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: -0.2,
    color: colors.navy,
  },
  rowBody: {
    fontFamily: typography.fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  rowTrailing: {
    paddingTop: 8,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  deviceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(20, 169, 181, 0.12)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(20, 169, 181, 0.28)',
  },
  deviceChipText: {
    fontFamily: typography.fonts.semibold,
    fontSize: 12,
    color: colors.navy,
  },
  syncBtn: {
    marginTop: spacing.md,
    borderRadius: 14,
    overflow: 'hidden',
    alignSelf: 'stretch',
    ...shadows.sm,
  },
  syncBtnFill: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: spacing.md,
  },
  syncBtnLabel: {
    fontFamily: typography.fonts.semibold,
    fontSize: 14,
    letterSpacing: -0.15,
    color: colors.white,
  },
  deniedCard: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(224, 170, 24, 0.36)',
  },
  deniedMark: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(224, 170, 24, 0.22)',
  },
  deniedCopy: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  deniedTitle: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 15,
    letterSpacing: -0.2,
    color: colors.navy,
  },
  deniedBody: {
    fontFamily: typography.fonts.regular,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
  },
  settingsBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(11, 42, 67, 0.06)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(11, 42, 67, 0.12)',
  },
  settingsBtnLabel: {
    fontFamily: typography.fonts.semibold,
    fontSize: 13,
    color: colors.navy,
  },
  pressed: {
    opacity: 0.88,
  },
  disabled: {
    opacity: 0.55,
  },
});
