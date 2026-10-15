import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  shouldShowNotificationExplainer,
  type OsNotificationPermission,
} from '@bridge-hive/domain';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { colors, radii, spacing, typography } from '@/constants/theme';
import { PUSH_EXPLAINER_DISMISSED_KEY } from '@/lib/push/channel';
import { enableShiftNotifications, probeNotificationPermission } from '@/lib/push/client';

const TITLE = 'Stay informed about matching shifts';
const BODY =
  'Allow notifications to receive alerts when new shifts matching your professional role become available.';

/**
 * Non-blocking explainer. The OS permission dialog is not requested on mount.
 */
export function ShiftNotificationPrompt({ verified }: { verified: boolean }) {
  const [permission, setPermission] = useState<OsNotificationPermission>('undetermined');
  const [dismissed, setDismissed] = useState(true);
  const [ready, setReady] = useState(false);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [status, stored] = await Promise.all([
        probeNotificationPermission(),
        AsyncStorage.getItem(PUSH_EXPLAINER_DISMISSED_KEY),
      ]);
      if (cancelled) return;
      setPermission(status);
      setDismissed(stored === '1');
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [verified]);

  if (!ready || !shouldShowNotificationExplainer({ verified, permission, dismissed })) {
    return null;
  }

  const onEnable = async () => {
    setWorking(true);
    const status = await enableShiftNotifications();
    setPermission(status);
    if (status === 'denied') {
      await AsyncStorage.setItem(PUSH_EXPLAINER_DISMISSED_KEY, '1');
      setDismissed(true);
    }
    setWorking(false);
  };

  const onLater = async () => {
    await AsyncStorage.setItem(PUSH_EXPLAINER_DISMISSED_KEY, '1');
    setDismissed(true);
  };

  return (
    <View style={styles.card} accessibilityRole="summary">
      <View style={styles.accent} />
      <View style={styles.copy}>
        <Text style={styles.kicker}>Notifications</Text>
        <Text style={styles.title}>{TITLE}</Text>
        <Text style={styles.body}>{BODY}</Text>
        <View style={styles.actions}>
          <Button
            label="Enable notifications"
            onPress={() => void onEnable()}
            loading={working}
            size="sm"
          />
          <Button
            label="Not now"
            onPress={() => void onLater()}
            variant="secondary"
            size="sm"
            disabled={working}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  accent: {
    width: 4,
    backgroundColor: colors.yellow,
  },
  copy: {
    flex: 1,
    padding: spacing.md,
    gap: spacing.sm,
  },
  kicker: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.size.xs,
    color: colors.navy,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.size.lg,
    color: colors.text,
  },
  body: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.size.sm,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
});
