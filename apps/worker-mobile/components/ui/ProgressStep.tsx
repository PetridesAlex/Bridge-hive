import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { StatusBadge, type StatusTone } from '@/components/ui/StatusBadge';
import { colors, spacing, typography } from '@/constants/theme';

export type ProgressStepState =
  | 'not_started'
  | 'in_progress'
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'action_required'
  | 'complete';

type Props = {
  step: number;
  title: string;
  description?: string;
  statusLabel: string;
  state: ProgressStepState;
  actionLabel?: string;
  onAction?: () => void;
  isCurrent?: boolean;
  isLast?: boolean;
  style?: StyleProp<ViewStyle>;
};

function toneForState(state: ProgressStepState): StatusTone {
  switch (state) {
    case 'approved':
    case 'complete':
      return 'success';
    case 'rejected':
    case 'action_required':
      return 'danger';
    case 'under_review':
    case 'submitted':
      return 'info';
    case 'in_progress':
      return 'accent';
    default:
      return 'neutral';
  }
}

function iconForState(state: ProgressStepState): keyof typeof Ionicons.glyphMap {
  switch (state) {
    case 'approved':
    case 'complete':
      return 'checkmark-circle';
    case 'rejected':
    case 'action_required':
      return 'alert-circle';
    case 'under_review':
    case 'submitted':
      return 'time';
    case 'in_progress':
      return 'ellipse';
    default:
      return 'ellipse-outline';
  }
}

/** Compact connected progress row — not a large independent card. */
export function ProgressStep({
  step,
  title,
  description,
  statusLabel,
  state,
  actionLabel,
  onAction,
  isCurrent = false,
  isLast = false,
  style,
}: Props) {
  const tone = toneForState(state);
  const done = state === 'approved' || state === 'complete';

  return (
    <View style={[styles.row, style]} accessibilityRole="summary">
      <View style={styles.rail}>
        <View
          style={[
            styles.stepMark,
            done && styles.stepMarkDone,
            isCurrent && styles.stepMarkCurrent,
          ]}
        >
          {done ? (
            <Ionicons name="checkmark" size={12} color={colors.white} />
          ) : (
            <Text style={[styles.stepNum, isCurrent && styles.stepNumCurrent]}>{step}</Text>
          )}
        </View>
        {!isLast ? <View style={styles.connector} /> : null}
      </View>
      <View style={styles.body}>
        <View style={styles.top}>
          <View style={styles.copy}>
            <Text style={styles.title}>{title}</Text>
            {description ? <Text style={styles.description}>{description}</Text> : null}
          </View>
          {statusLabel ? (
            <StatusBadge label={statusLabel} tone={tone} icon={iconForState(state)} />
          ) : null}
        </View>
        {actionLabel && onAction ? (
          <Pressable
            onPress={onAction}
            accessibilityRole="button"
            accessibilityLabel={actionLabel}
            style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
          >
            <Text style={styles.actionText}>{actionLabel}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.navy} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 56,
  },
  rail: {
    alignItems: 'center',
    width: 28,
  },
  stepMark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surfaceSubdued,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepMarkDone: {
    backgroundColor: colors.success,
  },
  stepMarkCurrent: {
    backgroundColor: colors.teal,
  },
  stepNum: {
    fontFamily: typography.fonts.bold,
    fontSize: 12,
    color: colors.textSecondary,
  },
  stepNumCurrent: {
    color: colors.white,
  },
  connector: {
    flex: 1,
    width: 2,
    backgroundColor: colors.border,
    marginVertical: 4,
    minHeight: 16,
  },
  body: {
    flex: 1,
    minWidth: 0,
    paddingBottom: spacing.md,
    gap: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  title: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.size.lg,
    color: colors.text,
  },
  description: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    lineHeight: typography.lineHeight.sm,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceSubdued,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 44,
  },
  actionPressed: {
    opacity: 0.88,
  },
  actionText: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.size.sm,
    color: colors.navy,
  },
});
