import { WORKER_ROLE_LABELS } from '@bridge-hive/domain';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  ShiftSummaryCard,
  SUMMARY_PILLS,
  type SummaryPill,
} from '@/components/shifts/ShiftSummaryCard';
import { AssignmentTimeline } from '@/components/ui/AssignmentTimeline';
import { type StatusTone } from '@/components/ui/StatusBadge';
import { colors, spacing, typography } from '@/constants/theme';
import {
  WORK_SEGMENTS,
  type WorkSegment,
} from '@/constants/workSegments';
import type { AssignmentWithShift } from '@/lib/queries';
import { canSubmitCompletedHours, shiftHasEnded } from '@/lib/rpcs';

type Props = {
  assignment: AssignmentWithShift;
  segment: WorkSegment;
  expanded: boolean;
  onToggle: () => void;
  now: Date;
};

type StatusVisual = {
  label: string;
  detail: string;
  tone: StatusTone;
  icon: keyof typeof Ionicons.glyphMap;
  solid?: boolean;
};

function statusVisual(
  status: string,
  segment: WorkSegment,
  readyToSubmit: boolean,
): StatusVisual {
  if (status === 'approved') {
    return {
      label: 'Approved',
      detail: 'Hours approved for payroll',
      tone: 'success',
      icon: 'checkmark-circle',
      solid: true,
    };
  }
  if (status === 'rejected') {
    return {
      label: 'Rejected',
      detail: 'Organization declined this timesheet',
      tone: 'danger',
      icon: 'close-circle',
      solid: true,
    };
  }
  if (status === 'submitted') {
    return {
      label: 'Submitted',
      detail: 'Awaiting organization review',
      tone: 'info',
      icon: 'document-text',
      solid: true,
    };
  }
  if (segment === 'to_submit' || readyToSubmit) {
    return {
      label: 'Submit hours',
      detail: 'Shift ended — hours ready to send',
      tone: 'warning',
      icon: 'create',
      solid: true,
    };
  }
  return {
    label: 'Upcoming',
    detail: 'Submit hours after the shift ends',
    tone: 'info',
    icon: 'calendar',
  };
}

const TONE_PILLS: Record<StatusTone, Omit<SummaryPill, 'label' | 'icon'>> = {
  success: SUMMARY_PILLS.success,
  danger: SUMMARY_PILLS.danger,
  info: { fg: colors.info, bg: colors.infoLight },
  warning: { fg: colors.honeyStrong, bg: colors.yellowLight },
  accent: { fg: colors.tealStrong, bg: colors.tealSoft },
  neutral: SUMMARY_PILLS.neutral,
};

export function AssignmentCard({
  assignment,
  segment,
  expanded,
  onToggle,
  now,
}: Props) {
  const theme = WORK_SEGMENTS[segment];
  const shift = assignment.shifts;
  const roleLabel = shift
    ? WORKER_ROLE_LABELS[shift.required_role as keyof typeof WORKER_ROLE_LABELS] ??
      shift.required_role
    : 'Shift';
  const ended = shift?.ends_at != null && shiftHasEnded(shift.ends_at, now);
  const awaitingSubmit = canSubmitCompletedHours(assignment.status);
  const readyToSubmit = awaitingSubmit && ended;
  const visual = statusVisual(assignment.status, segment, readyToSubmit);
  const title = shift?.title?.trim() || roleLabel;
  const pill: SummaryPill = {
    label: visual.label,
    icon: visual.icon,
    ...TONE_PILLS[visual.tone],
  };

  const toggle = (
    <Pressable
      onPress={onToggle}
      accessibilityRole="button"
      accessibilityLabel={expanded ? 'Hide progress' : 'Show progress'}
      style={({ pressed }) => [styles.progressToggle, pressed && styles.progressTogglePressed]}
    >
      <View style={styles.progressToggleLeft}>
        <View style={styles.progressIcon}>
          <Ionicons
            name={expanded ? 'chevron-up' : 'git-network-outline'}
            size={16}
            color={colors.white}
          />
        </View>
        <Text style={styles.progressToggleText}>
          {expanded ? 'Hide workday progress' : 'View workday progress'}
        </Text>
      </View>
      <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.navy} />
    </Pressable>
  );

  const timeline = expanded ? (
    <View style={styles.timeline}>
      <AssignmentTimeline status={assignment.status} shiftEnded={ended} />
    </View>
  ) : null;

  if (!shift) {
    return null;
  }

  return (
    <ShiftSummaryCard
      eyebrow={theme.shortLabel}
      eyebrowIcon="briefcase"
      pill={pill}
      title={title}
      startsAt={shift.starts_at}
      endsAt={shift.ends_at}
      breakMinutes={shift.break_minutes ?? 0}
      rateMinor={shift.rate_minor}
      currency={shift.currency}
      extraRows={
        title !== roleLabel
          ? [{ icon: 'medkit-outline', label: 'Role', value: roleLabel }]
          : undefined
      }
      ctaLabel={readyToSubmit ? 'Submit hours' : 'View shift details'}
      onPress={() => router.push(`/shifts/${assignment.shift_id}`)}
      accessibilityLabel={`${title}, ${visual.label}`}
    >
      {toggle}
      {timeline}
    </ShiftSummaryCard>
  );
}

const styles = StyleSheet.create({
  progressToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 18,
    minHeight: 52,
    backgroundColor: '#EEF3FA',
  },
  progressTogglePressed: {
    opacity: 0.88,
  },
  progressToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    minWidth: 0,
  },
  progressIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1F4E96',
  },
  progressToggleText: {
    fontFamily: typography.fonts.semibold,
    fontSize: 14,
    color: colors.navy,
  },
  timeline: {
    paddingTop: spacing.xs,
  },
});
