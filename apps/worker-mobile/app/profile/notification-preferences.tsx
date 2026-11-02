import { notificationEnableAction, type OsNotificationPermission } from '@bridge-hive/domain';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Platform, StyleSheet, Switch, Text, View } from 'react-native';

import { AppScreen } from '@/components/ui/AppScreen';
import { Button } from '@/components/ui/Button';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { colors, radii, spacing, typography } from '@/constants/theme';
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

export default function NotificationPreferencesScreen() {
  const { t, language } = useTranslation();
  const { user } = useAuth();
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

  return (
    <AppScreen edges={['top']}>
      <ScreenHeader title={t('profile.notificationPreferences')} showBack />
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.copy}>
            <Text style={styles.label}>New matching shifts</Text>
            <Text style={styles.help}>
              Alerts when a published shift matches your professional role and still has open
              positions.
            </Text>
          </View>
          <Switch
            accessibilityLabel="New matching shifts"
            value={enabled}
            disabled={working}
            onValueChange={(value) => void onToggle(value)}
            trackColor={{ false: colors.borderStrong, true: colors.navy }}
            thumbColor={enabled ? colors.yellow : colors.white}
          />
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <View style={styles.copy}>
            <Text style={styles.label}>Sound</Text>
            <Text style={styles.help}>Follows device settings</Text>
            <Text style={styles.help}>
              Silent mode, Do Not Disturb, and system notification settings can override sound
              and vibration.
            </Text>
          </View>
          <Text style={styles.value}>Device</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <View style={styles.copy}>
            <Text style={styles.label}>{t('calendar.syncLabel')}</Text>
            <Text style={styles.help}>{t('calendar.syncHelp')}</Text>
          </View>
          <Switch
            accessibilityLabel={t('calendar.syncLabel')}
            value={calendarEnabled}
            disabled={working || Platform.OS === 'web' || !user?.id}
            onValueChange={(value) => void onToggleCalendar(value)}
            trackColor={{ false: colors.borderStrong, true: colors.navy }}
            thumbColor={calendarEnabled ? colors.yellow : colors.white}
          />
        </View>
      </View>

      {calendarEnabled && Platform.OS !== 'web' ? (
        <View style={styles.note}>
          <Button
            label={t('calendar.syncManual')}
            variant="secondary"
            size="sm"
            onPress={() => void onManualSync()}
          />
        </View>
      ) : null}

      {denied ? (
        <View style={styles.note}>
          <Text style={styles.noteTitle}>
            {Platform.OS === 'web'
              ? 'Push alerts are available in the BridgeHive app'
              : 'Notifications are off for BridgeHive'}
          </Text>
          <Text style={styles.help}>
            {Platform.OS === 'web'
              ? 'This browser cannot open phone notification settings. New matching shifts still appear in Notifications. Enable alerts from the iOS or Android app.'
              : 'You can turn them on later in your device settings. The app stays fully usable without them, and new shifts still appear in Notifications.'}
          </Text>
          {Platform.OS === 'web' ? null : (
            <Button
              label="Open device settings"
              variant="secondary"
              size="sm"
              onPress={() => void openDeviceNotificationSettings()}
            />
          )}
        </View>
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  copy: {
    flex: 1,
    gap: 4,
  },
  label: {
    fontFamily: typography.fonts.semibold,
    fontSize: 16,
    color: colors.text,
  },
  help: {
    fontFamily: typography.fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  value: {
    fontFamily: typography.fonts.medium,
    fontSize: 13,
    color: colors.navy,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  note: {
    marginTop: spacing.md,
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceSubdued,
  },
  noteTitle: {
    fontFamily: typography.fonts.semibold,
    fontSize: 15,
    color: colors.text,
  },
});
