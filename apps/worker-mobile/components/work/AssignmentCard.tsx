import { WORKER_ROLE_LABELS } from '@bridge-hive/domain';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  ShiftSummaryCard,
  SUMMARY_PILLS,
  type SummaryPill,
  type SummaryRow,
} from '@/components/shifts/ShiftSummaryCard';
import { AssignmentTimeline } from '@/components/ui/AssignmentTimeline';
import { type StatusTone } from '@/components/ui/StatusBadge';
import { colors, spacing, typography } from '@/constants/theme';
import { type WorkSegment } from '@/constants/workSegments';
import { useTranslation } from '@/i18n/locale-provider';
import { getOrCreateConversation } from '@/lib/messaging';
import type { AssignmentWithShift } from '@/lib/queries';
import { canSubmitCompletedHours, shiftHasEnded } from '@/lib/rpcs';
import { useAuth } from '@/providers/AuthProvider';
import { formatDayLabel, isoDateFromTimestamp } from '@/utils/format';

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
    };
  }
  if (status === 'rejected') {
    return {
      label: 'Rejected',
      detail: 'Organization declined this timesheet',
      tone: 'danger',
      icon: 'close-circle',
    };
  }
  if (status === 'submitted') {
    return {
      label: 'Submitted',
      detail: 'Awaiting organization review',
      tone: 'info',
      icon: 'document-text',
    };
  }
  if (segment === 'to_submit' || readyToSubmit) {
    return {
      label: 'Submit hours',
      detail: 'Shift ended — hours ready to send',
      tone: 'warning',
      icon: 'create',
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
  const { t } = useTranslation();
  const { user, isAppReviewDemo } = useAuth();
  const [messagingBusy, setMessagingBusy] = useState(false);
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

  const location =
    [shift?.location_name, shift?.ward_name].filter(Boolean).join(' · ') || undefined;
  const org = shift?.organization_name?.trim() || undefined;

  const extraRows: SummaryRow[] = [
    { icon: 'people-outline', label: 'Availability', value: visual.label },
  ];
  if (title !== roleLabel) {
    extraRows.push({ icon: 'medkit-outline', label: 'Role', value: roleLabel });
  }

  const day = shift ? formatDayLabel(isoDateFromTimestamp(shift.starts_at)) : '';

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
            size={15}
            color={colors.white}
          />
        </View>
        <Text style={styles.progressToggleText}>
          {expanded ? 'Hide progress' : 'Workday progress'}
        </Text>
      </View>
      <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={colors.navy} />
    </Pressable>
  );

  const timeline = expanded ? (
    <View style={styles.timeline}>
      <AssignmentTimeline status={assignment.status} shiftEnded={ended} />
    </View>
  ) : null;

  const canMessageOrg =
    assignment.status === 'approved' &&
    !isAppReviewDemo &&
    Boolean(user?.id) &&
    Boolean(shift?.organization_id);

  const messageCta = canMessageOrg ? (
    <Pressable
      disabled={messagingBusy}
      onPress={() => {
        void (async () => {
          if (!user?.id || !shift?.organization_id || messagingBusy) return;
          setMessagingBusy(true);
          try {
            const created = await getOrCreateConversation(
              shift.organization_id,
              user.id,
            );
            if (created.error || !created.data) {
              Alert.alert(t('messages.loadError'), created.error ?? undefined);
              return;
            }
            router.push(`/messages/${created.data.id}`);
          } finally {
            setMessagingBusy(false);
          }
        })();
      }}
      accessibilityRole="button"
      accessibilityLabel={t('messages.messageOrganization')}
      style={({ pressed }) => [
        styles.messageCta,
        pressed && styles.messageCtaPressed,
        messagingBusy && styles.messageCtaBusy,
      ]}
    >
      <Ionicons name="chatbubbles-outline" size={16} color={colors.tealStrong} />
      <Text style={styles.messageCtaText}>
        {messagingBusy ? t('messages.pending') : t('messages.messageOrganization')}
      </Text>
    </Pressable>
  ) : null;

  if (!shift) {
    return null;
  }

  return (
    <ShiftSummaryCard
      density="compact"
      eyebrow={segment === 'to_submit' ? 'Action needed' : 'My shift'}
      eyebrowIcon={readyToSubmit ? 'create' : 'briefcase'}
      pill={pill}
      title={title}
      org={org}
      startsAt={shift.starts_at}
      endsAt={shift.ends_at}
      breakMinutes={shift.break_minutes ?? 0}
      location={location}
      rateMinor={shift.rate_minor}
      currency={shift.currency}
      extraRows={extraRows}
      ctaLabel={readyToSubmit ? 'Submit hours' : 'View shift details'}
      onPress={() => router.push(`/shifts/${assignment.shift_id}`)}
      accessibilityLabel={`${title}${location ? `, ${location}` : ''}, ${day}, ${visual.label}`}
    >
      {toggle}
      {timeline}
      {messageCta}
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
    borderRadius: 14,
    minHeight: 44,
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
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1F4E96',
  },
  progressToggleText: {
    fontFamily: typography.fonts.semibold,
    fontSize: 13,
    letterSpacing: -0.1,
    color: colors.navy,
  },
  timeline: {
    paddingTop: spacing.xs,
  },
  messageCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 16,
    backgroundColor: colors.tealSoft,
    minHeight: 44,
  },
  messageCtaPressed: {
    opacity: 0.88,
  },
  messageCtaBusy: {
    opacity: 0.7,
  },
  messageCtaText: {
    fontFamily: typography.fonts.semibold,
    fontSize: 14,
    color: colors.navy,
    flexShrink: 1,
  },
});
