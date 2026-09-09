import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { WORKER_ROLE_LABELS } from '@/constants/config';
import { colors, spacing, typography } from '@/constants/theme';
import type { WorkerShiftDetails } from '@/lib/rpcs';
import {
  formatDayLabel,
  formatDurationMinutes,
  formatMoney,
  formatTimeRange,
  isoDateFromTimestamp,
} from '@/utils/format';

type Props = {
  shift: WorkerShiftDetails;
  assignmentStatus?: string;
};

export function NextShiftCard({ shift, assignmentStatus }: Props) {
  const router = useRouter();
  const minutes = Math.max(
    0,
    Math.round((new Date(shift.ends_at).getTime() - new Date(shift.starts_at).getTime()) / 60000) -
      shift.break_minutes,
  );
  const roleLabel =
    WORKER_ROLE_LABELS[shift.required_role as keyof typeof WORKER_ROLE_LABELS] ??
    shift.required_role;

  return (
    <Card style={styles.card}>
      <View style={styles.accent} />
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Next Shift</Text>
        {assignmentStatus ? (
          <Text style={styles.status}>{assignmentStatus.replace(/_/g, ' ')}</Text>
        ) : null}
      </View>
      <Text style={styles.org}>{shift.organization_name}</Text>
      <Text style={styles.role}>{roleLabel}</Text>
      <Text style={styles.dept}>
        {shift.location_name}
        {shift.ward_name ? ` · ${shift.ward_name}` : ''}
      </Text>

      <View style={styles.meta}>
        <MetaRow
          icon="calendar-outline"
          caption="Date"
          label={formatDayLabel(isoDateFromTimestamp(shift.starts_at))}
        />
        <MetaRow
          icon="time-outline"
          caption="Schedule"
          label={formatTimeRange(shift.starts_at, shift.ends_at)}
        />
        <MetaRow
          icon="hourglass-outline"
          caption="Duration"
          label={formatDurationMinutes(minutes)}
        />
      </View>

      <View style={styles.footer}>
        <Text style={styles.pay}>{formatMoney(shift.rate_minor, shift.currency)}/hr</Text>
        <Button
          label="View Shift"
          variant="primary"
          size="sm"
          fullWidth={false}
          onPress={() => router.push(`/shifts/${shift.shift_id}`)}
        />
      </View>
    </Card>
  );
}

function MetaRow({
  icon,
  caption,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  caption: string;
  label: string;
}) {
  return (
    <View style={styles.metaRow}>
      <Ionicons name={icon} size={16} color={colors.navyLift} />
      <View>
        <Text style={styles.metaCaption}>{caption}</Text>
        <Text style={styles.metaLabel}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { overflow: 'hidden', gap: spacing.md },
  accent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: colors.yellow,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eyebrow: {
    fontFamily: typography.fonts.semibold,
    fontSize: 12,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  status: {
    fontFamily: typography.fonts.semibold,
    fontSize: 12,
    color: colors.navyLift,
    textTransform: 'capitalize',
  },
  org: {
    fontFamily: typography.fonts.semibold,
    fontSize: 13,
    color: colors.navyLift,
  },
  role: {
    fontFamily: typography.fonts.display,
    fontSize: 20,
    color: colors.text,
  },
  dept: {
    fontFamily: typography.fonts.regular,
    fontSize: 14,
    color: colors.textSecondary,
  },
  meta: { gap: spacing.sm },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  metaCaption: {
    fontFamily: typography.fonts.regular,
    fontSize: 11,
    color: colors.textMuted,
  },
  metaLabel: {
    fontFamily: typography.fonts.semibold,
    fontSize: 14,
    color: colors.text,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  pay: {
    fontFamily: typography.fonts.display,
    fontSize: 22,
    color: colors.navy,
  },
});
