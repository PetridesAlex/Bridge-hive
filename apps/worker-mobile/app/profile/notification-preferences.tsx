import { notificationEnableAction, type OsNotificationPermission } from '@bridge-hive/domain';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Platform, StyleSheet, Switch, Text, View } from 'react-native';

import { AppScreen } from '@/components/ui/AppScreen';
import { Button } from '@/components/ui/Button';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { colors, radii, spacing, typography } from '@/constants/theme';
import {
  enableShiftNotifications,
  openDeviceNotificationSettings,
  probeNotificationPermission,
  readShiftPushPreference,
  setShiftPushPreference,
} from '@/lib/push/client';

export default function NotificationPreferencesScreen() {
  const [permission, setPermission] = useState<OsNotificationPermission>('undetermined');
  const [enabled, setEnabled] = useState(false);
  const [working, setWorking] = useState(false);

  const refresh = useCallback(async () => {
    const status = await probeNotificationPermission();
    setPermission(status);
    if (status !== 'granted') {
      setEnabled(false);
      return;
    }
    const preference = await readShiftPushPreference();
    setEnabled(preference ?? true);
  }, []);

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

  const denied = permission === 'denied';

  return (
    <AppScreen edges={['top']}>
      <ScreenHeader title="Notification preferences" showBack />
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
      </View>

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
