import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { StatusBadge } from '@/components/ui/StatusBadge';
import { WORKER_ROLE_LABELS } from '@/constants/config';
import { colors, radii, spacing, typography } from '@/constants/theme';
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

function statusLabel(status?: string): string {
  if (!status) return '';
  const map: Record<string, string> = {
    accepted: 'Accepted',
    checked_in: 'Checked in',
    checked_out: 'Checked out',
    submitted: 'Timesheet submitted',
    approved: 'Approved',
    rejected: 'Rejected',
  };
  return map[status] ?? status.replace(/_/g, ' ');
}

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
    <Pressable
      style={styles.card}
      onPress={() => router.push(`/shifts/${shift.shift_id}`)}
      accessibilityRole="button"
      accessibilityLabel="View next shift"
    >
      <View style={styles.accent} />
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Next shift</Text>
        {assignmentStatus ? (
          <StatusBadge
            label={statusLabel(assignmentStatus)}
            tone={assignmentStatus === 'checked_in' ? 'accent' : 'info'}
            icon="time"
          />
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
          label={formatDayLabel(isoDateFromTimestamp(shift.starts_at))}
        />
        <MetaRow
          icon="time-outline"
          label={formatTimeRange(shift.starts_at, shift.ends_at)}
        />
        <MetaRow icon="hourglass-outline" label={formatDurationMinutes(minutes)} />
      </View>

      <Text style={styles.pay}>{formatMoney(shift.rate_minor, shift.currency)}/hr</Text>
    </Pressable>
  );
}

function MetaRow({
  icon,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}) {
  return (
    <View style={styles.metaRow}>
      <Ionicons name={icon} size={15} color={colors.navy} />
      <Text style={styles.metaLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
    overflow: 'hidden',
  },
  accent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: colors.teal,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  eyebrow: {
    fontFamily: typography.fonts.semibold,
    fontSize: 12,
    color: colors.textMuted,
  },
  org: {
    fontFamily: typography.fonts.medium,
    fontSize: 13,
    color: colors.textSecondary,
  },
  role: {
    fontFamily: typography.fonts.display,
    fontSize: 20,
    lineHeight: 26,
    color: colors.text,
  },
  dept: {
    fontFamily: typography.fonts.regular,
    fontSize: 14,
    color: colors.textSecondary,
  },
  meta: { gap: 6, marginTop: spacing.xs },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  metaLabel: {
    fontFamily: typography.fonts.medium,
    fontSize: 14,
    color: colors.text,
  },
  pay: {
    fontFamily: typography.fonts.bold,
    fontSize: 18,
    color: colors.navy,
    marginTop: spacing.xs,
  },
});
