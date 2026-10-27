import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { StatusBadge } from '@/components/ui/StatusBadge';
import { WORKER_ROLE_LABELS } from '@/constants/config';
import { colors, radii, shadows, spacing, typography } from '@/constants/theme';
import type { WorkerShiftDetails } from '@/lib/rpcs';
import {
  formatDate,
  formatDurationMinutes,
  formatMoney,
  formatTimeRange,
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
  const location =
    [shift.location_name, shift.ward_name].filter(Boolean).join(' · ') || 'Location not listed';
  const dateLabel = formatDate(shift.starts_at);
  const timeLabel = formatTimeRange(shift.starts_at, shift.ends_at);
  const durationLabel = formatDurationMinutes(minutes).toLowerCase();
  const payLabel = `${formatMoney(shift.rate_minor, shift.currency)} per hour`;

  return (
    <Pressable
      onPress={() => router.push(`/shifts/${shift.shift_id}`)}
      accessibilityRole="button"
      accessibilityLabel={`View next shift: ${roleLabel} at ${shift.organization_name}`}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(20, 169, 181, 0.12)', 'rgba(20, 169, 181, 0.03)', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.wash}
      />

      <View style={styles.header}>
        <View style={styles.eyebrowRow}>
          <View style={styles.mark}>
            <Ionicons name="briefcase" size={14} color={colors.white} />
          </View>
          <Text style={styles.eyebrow}>Next shift</Text>
        </View>
        {assignmentStatus ? (
          <StatusBadge
            label={statusLabel(assignmentStatus)}
            tone={assignmentStatus === 'checked_in' ? 'accent' : 'info'}
            icon="time"
          />
        ) : null}
      </View>

      <View style={styles.titleBlock}>
        <Text style={styles.org} numberOfLines={2}>
          {shift.organization_name}
        </Text>
        <Text style={styles.role} numberOfLines={2}>
          {roleLabel}
        </Text>
      </View>

      <View style={styles.meta}>
        <DetailRow icon="location" label="Location" value={location} accent />
        <DetailRow icon="calendar-outline" label="Date" value={dateLabel} />
        <DetailRow icon="time-outline" label="Hours" value={timeLabel} />
        <DetailRow icon="hourglass-outline" label="Duration" value={durationLabel} />
      </View>

      <View style={styles.footer}>
        <View style={styles.payChip}>
          <Text style={styles.payLabel}>Pay rate</Text>
          <Text style={styles.payValue}>{payLabel}</Text>
        </View>
        <View style={styles.chevron}>
          <Ionicons name="chevron-forward" size={18} color={colors.tealStrong} />
        </View>
      </View>
    </Pressable>
  );
}

function DetailRow({
  icon,
  label,
  value,
  accent = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <View style={[styles.detailRow, accent && styles.detailRowAccent]}>
      <View style={[styles.detailIcon, accent && styles.detailIconAccent]}>
        <Ionicons name={icon} size={15} color={accent ? colors.white : colors.navy} />
      </View>
      <View style={styles.detailCopy}>
        <Text style={[styles.detailLabel, accent && styles.detailLabelAccent]}>{label}</Text>
        <Text
          style={[styles.detailValue, accent && styles.detailValueAccent]}
          numberOfLines={2}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: 'rgba(20, 169, 181, 0.18)',
    padding: spacing.lg,
    gap: spacing.md,
    overflow: 'hidden',
    ...shadows.md,
  },
  cardPressed: {
    opacity: 0.94,
    transform: [{ scale: 0.995 }],
  },
  wash: {
    ...StyleSheet.absoluteFillObject,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  mark: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.tealStrong,
  },
  eyebrow: {
    fontFamily: typography.fonts.semibold,
    fontSize: 13,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: colors.tealStrong,
  },
  titleBlock: {
    gap: 4,
    paddingBottom: 2,
  },
  org: {
    fontFamily: typography.fonts.medium,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  role: {
    fontFamily: typography.fonts.display,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.3,
    color: colors.text,
  },
  meta: {
    gap: 10,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: radii.lg,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: colors.surfaceSubdued,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  detailRowAccent: {
    backgroundColor: colors.tealSoft,
    borderColor: 'rgba(20, 169, 181, 0.28)',
  },
  detailIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
  },
  detailIconAccent: {
    backgroundColor: colors.tealStrong,
  },
  detailCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  detailLabel: {
    fontFamily: typography.fonts.medium,
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: colors.textMuted,
  },
  detailLabelAccent: {
    color: colors.tealStrong,
  },
  detailValue: {
    fontFamily: typography.fonts.semibold,
    fontSize: 15,
    lineHeight: 20,
    color: colors.text,
  },
  detailValueAccent: {
    color: colors.navy,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 2,
  },
  payChip: {
    flex: 1,
    borderRadius: radii.full,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.tealSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(20, 169, 181, 0.28)',
    gap: 1,
  },
  payLabel: {
    fontFamily: typography.fonts.medium,
    fontSize: 11,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: colors.tealStrong,
  },
  payValue: {
    fontFamily: typography.fonts.bold,
    fontSize: 16,
    color: colors.navy,
  },
  chevron: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.tealSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(20, 169, 181, 0.28)',
  },
});
