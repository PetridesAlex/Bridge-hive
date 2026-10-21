import { WORKER_ROLE_LABELS } from '@bridge-hive/domain';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { AssignmentTimeline } from '@/components/ui/AssignmentTimeline';
import { StatusBadge, type StatusTone } from '@/components/ui/StatusBadge';
import { colors, radii, shadows, spacing, typography } from '@/constants/theme';
import {
  WORK_SEGMENTS,
  type WorkSegment,
} from '@/constants/workSegments';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import type { AssignmentWithShift } from '@/lib/queries';
import { canSubmitCompletedHours, shiftHasEnded } from '@/lib/rpcs';
import {
  formatDayLabel,
  formatMoney,
  formatTimeRange,
  isoDateFromTimestamp,
} from '@/utils/format';

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

export function AssignmentCard({
  assignment,
  segment,
  expanded,
  onToggle,
  now,
}: Props) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
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

  const motionStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.card,
        {
          borderColor: theme.border,
          backgroundColor: colors.card,
        },
        motionStyle,
      ]}
    >
      <LinearGradient
        pointerEvents="none"
        colors={[theme.accentSoft, colors.card]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.accentRail, { backgroundColor: theme.accent }]} />

      <Pressable
        onPressIn={() => {
          if (!reduced) scale.value = withSpring(0.985, { damping: 18, stiffness: 320 });
        }}
        onPressOut={() => {
          if (!reduced) scale.value = withSpring(1, { damping: 16, stiffness: 280 });
        }}
        onPress={() => router.push(`/shifts/${assignment.shift_id}`)}
        accessibilityRole="button"
        accessibilityLabel={`${title}, ${visual.label}`}
        style={styles.cardPress}
      >
        <View style={styles.segmentTag}>
          <View style={[styles.segmentDot, { backgroundColor: theme.accent }]} />
          <Text style={[styles.segmentTagText, { color: theme.accent }]}>
            {theme.shortLabel}
          </Text>
        </View>

        <View style={styles.cardTop}>
          <View style={styles.copy}>
            <Text style={[styles.role, { color: theme.accent }]}>{roleLabel}</Text>
            <Text style={styles.cardTitle} numberOfLines={2}>
              {title}
            </Text>
            {shift ? (
              <View style={styles.metaRow}>
                <View style={[styles.metaChip, { backgroundColor: theme.accentSoft }]}>
                  <Ionicons name="calendar-outline" size={13} color={theme.accent} />
                  <Text style={[styles.metaText, { color: theme.accent }]}>
                    {formatDayLabel(isoDateFromTimestamp(shift.starts_at))}
                  </Text>
                </View>
                <View style={[styles.metaChip, { backgroundColor: theme.accentSoft }]}>
                  <Ionicons name="time-outline" size={13} color={theme.accent} />
                  <Text style={[styles.metaText, { color: theme.accent }]}>
                    {formatTimeRange(shift.starts_at, shift.ends_at)}
                  </Text>
                </View>
              </View>
            ) : null}
          </View>

          <View style={styles.statusCol}>
            <StatusBadge
              label={visual.label}
              tone={visual.tone}
              icon={visual.icon}
              solid={visual.solid}
            />
            <Ionicons name="chevron-forward" size={16} color={theme.accent} />
          </View>
        </View>

        <View style={[styles.footer, { borderTopColor: theme.border }]}>
          {shift ? (
            <Text style={[styles.cardPay, { color: theme.accent }]}>
              {formatMoney(shift.rate_minor, shift.currency)}
              <Text style={styles.cardPayUnit}>/hr</Text>
            </Text>
          ) : (
            <View />
          )}
          <Text style={styles.statusDetail} numberOfLines={1}>
            {visual.detail}
          </Text>
        </View>
      </Pressable>

      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityLabel={expanded ? 'Hide progress' : 'Show progress'}
        style={({ pressed }) => [
          styles.progressToggle,
          { backgroundColor: theme.accentSoft },
          pressed && styles.progressTogglePressed,
        ]}
      >
        <View style={styles.progressToggleLeft}>
          <LinearGradient
            colors={theme.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.progressIcon}
          >
            <Ionicons
              name={expanded ? 'chevron-up' : 'git-network-outline'}
              size={14}
              color={colors.white}
            />
          </LinearGradient>
          <Text style={[styles.progressToggleText, { color: theme.accent }]}>
            {expanded ? 'Hide workday progress' : 'View workday progress'}
          </Text>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={theme.accent}
        />
      </Pressable>

      {expanded ? (
        <View style={styles.timeline}>
          <AssignmentTimeline status={assignment.status} shiftEnded={ended} />
        </View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.lg,
    borderWidth: 1.5,
    overflow: 'hidden',
    position: 'relative',
    ...shadows.sm,
  },
  accentRail: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 5,
  },
  cardPress: {
    paddingLeft: spacing.lg + 6,
    paddingRight: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  segmentTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  segmentDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  segmentTagText: {
    fontFamily: typography.fonts.bold,
    fontSize: 11,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  cardTop: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  copy: {
    flex: 1,
    gap: 6,
    minWidth: 0,
  },
  role: {
    fontFamily: typography.fonts.semibold,
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  cardTitle: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.2,
    color: colors.text,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: radii.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  metaText: {
    fontFamily: typography.fonts.semibold,
    fontSize: 12,
  },
  statusCol: {
    alignItems: 'flex-end',
    gap: 10,
    paddingTop: 2,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  cardPay: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 16,
    letterSpacing: -0.2,
  },
  cardPayUnit: {
    fontFamily: typography.fonts.medium,
    fontSize: 13,
    color: colors.textSecondary,
  },
  statusDetail: {
    flex: 1,
    textAlign: 'right',
    fontFamily: typography.fonts.regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textSecondary,
  },
  progressToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    marginLeft: spacing.lg + 6,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    minHeight: 44,
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
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressToggleText: {
    fontFamily: typography.fonts.semibold,
    fontSize: 13,
  },
  timeline: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    paddingLeft: spacing.lg + 6,
  },
});
