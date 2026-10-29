import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { StatusBadge, type StatusTone } from '@/components/ui/StatusBadge';
import { colors, radii, spacing, typography } from '@/constants/theme';

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
  /** When true, the connector below this step renders as completed. */
  connectorDone?: boolean;
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
  connectorDone = false,
  style,
}: Props) {
  const tone = toneForState(state);
  const done = state === 'approved' || state === 'complete';
  const rejected = state === 'rejected' || state === 'action_required';
  const active = isCurrent || state === 'in_progress' || state === 'under_review';

  return (
    <View
      style={[styles.row, isCurrent && styles.rowCurrent, style]}
      accessibilityRole="summary"
    >
      <View style={styles.rail}>
        {done ? (
          <LinearGradient
            colors={['#146C43', colors.success]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.stepMark}
          >
            <Ionicons name="checkmark" size={14} color={colors.white} />
          </LinearGradient>
        ) : rejected ? (
          <View style={[styles.stepMark, styles.stepMarkRejected]}>
            <Ionicons name="close" size={14} color={colors.white} />
          </View>
        ) : active ? (
          <LinearGradient
            colors={[colors.navy, colors.tealStrong]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.stepMark, styles.stepMarkRing]}
          >
            <Text style={styles.stepNumActive}>{step}</Text>
          </LinearGradient>
        ) : (
          <View style={styles.stepMark}>
            <Text style={styles.stepNum}>{step}</Text>
          </View>
        )}
        {!isLast ? (
          <View
            style={[
              styles.connector,
              (done || connectorDone) && styles.connectorDone,
              rejected && styles.connectorRejected,
            ]}
          />
        ) : null}
      </View>
      <View style={[styles.body, isLast && styles.bodyLast, isCurrent && styles.bodyCurrent]}>
        <View style={styles.top}>
          <Text style={[styles.title, (done || active) && styles.titleActive]}>{title}</Text>
          {statusLabel ? (
            <StatusBadge
              label={statusLabel}
              tone={tone}
              icon={iconForState(state)}
              solid={done || rejected}
            />
          ) : null}
        </View>
        {description ? <Text style={styles.description}>{description}</Text> : null}
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
    minHeight: 64,
    marginHorizontal: -spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
  },
  rowCurrent: {
    backgroundColor: 'rgba(14, 116, 144, 0.06)',
  },
  rail: {
    alignItems: 'center',
    width: 32,
  },
  stepMark: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceSubdued,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepMarkRing: {
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  stepMarkRejected: {
    backgroundColor: colors.error,
  },
  stepNum: {
    fontFamily: typography.fonts.bold,
    fontSize: 12,
    color: colors.textSecondary,
  },
  stepNumActive: {
    fontFamily: typography.fonts.bold,
    fontSize: 12,
    color: colors.white,
  },
  connector: {
    flex: 1,
    width: 2,
    backgroundColor: colors.border,
    marginVertical: 4,
    minHeight: 18,
    borderRadius: 1,
  },
  connectorDone: {
    backgroundColor: colors.success,
  },
  connectorRejected: {
    backgroundColor: colors.error,
  },
  body: {
    flex: 1,
    minWidth: 0,
    paddingBottom: spacing.md,
    paddingTop: 4,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  bodyLast: {
    borderBottomWidth: 0,
    paddingBottom: spacing.xs,
  },
  bodyCurrent: {
    backgroundColor: 'transparent',
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  title: {
    flexShrink: 1,
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: -0.2,
    color: colors.textSecondary,
  },
  titleActive: {
    color: colors.text,
  },
  description: {
    fontFamily: typography.fonts.regular,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.tealSoft,
    borderRadius: radii.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(20, 169, 181, 0.28)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 40,
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
