import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { colors, credentialStatusStyles, spacing, typography } from '@/constants/theme';
import type { Credential } from '@/lib/queries';
import { formatShortDate } from '@/utils/format';

type Props = {
  credential: Credential;
};

export function CredentialCard({ credential }: Props) {
  const style =
    credentialStatusStyles[credential.status] ?? credentialStatusStyles.pending;

  // Format credential type for display (e.g., "nursing_licence" → "Nursing licence")
  const formatCredentialType = (type: string): string => {
    return type
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  return (
    <Card style={styles.card}>
      <View style={styles.iconWrap}>
        <Ionicons name="document-text-outline" size={22} color={colors.navyLift} />
      </View>
      <View style={styles.body}>
        <Text style={styles.title}>{formatCredentialType(credential.credential_type)}</Text>
        <Text style={styles.meta}>Registered {formatShortDate(credential.created_at)}</Text>
        {credential.expires_at ? (
          <Text style={styles.meta}>Expires {formatShortDate(credential.expires_at)}</Text>
        ) : null}
        {credential.rejection_reason ? (
          <Text style={styles.reject}>{credential.rejection_reason}</Text>
        ) : null}
      </View>
      <View style={[styles.badge, { backgroundColor: style.bg }]}>
        <Text style={[styles.badgeText, { color: style.fg }]}>{style.label}</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.blueLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, gap: 2 },
  title: {
    fontFamily: typography.fonts.semibold,
    fontSize: 15,
    color: colors.text,
  },
  meta: {
    fontFamily: typography.fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
  },
  reject: {
    fontFamily: typography.fonts.regular,
    fontSize: 12,
    color: colors.error,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontFamily: typography.fonts.semibold,
    fontSize: 11,
  },
});
