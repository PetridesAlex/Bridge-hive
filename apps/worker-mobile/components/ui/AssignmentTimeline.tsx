import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { ProgressStep } from '@/components/ui/ProgressStep';
import { colors, radii, shadows, spacing, typography } from '@/constants/theme';
import {
  buildAssignmentProgress,
  type AssignmentProgressPhase,
} from '@/lib/assignmentProgress';

type Props = {
  /** @deprecated Prefer status + shiftEnded for the shared progress model. */
  title?: string;
  children?: React.ReactNode;
  status?: string;
  shiftEnded?: boolean;
  style?: StyleProp<ViewStyle>;
};

const PHASE_ICON: Record<AssignmentProgressPhase, keyof typeof Ionicons.glyphMap> = {
  waiting_for_end: 'time-outline',
  ready_to_submit: 'create-outline',
  under_review: 'hourglass-outline',
  approved: 'checkmark-circle',
  rejected: 'close-circle',
};

/**
 * Contained workday / assignment progress surface.
 * Pass `status` + `shiftEnded` to render the shared 4-step model correctly
 * across shift detail and My work. Legacy `children` still supported for
 * one-off onboarding timelines.
 */
export function AssignmentTimeline({
  title,
  children,
  status,
  shiftEnded = false,
  style,
}: Props) {
  if (status) {
    const model = buildAssignmentProgress(status, shiftEnded);
    const progress = model.completedCount / model.totalSteps;
    const toneSuccess = model.phase === 'approved';
    const toneDanger = model.phase === 'rejected';

    return (
      <View style={[styles.wrap, style]} accessibilityRole="summary">
        <View style={styles.headingRow}>
          <Text style={styles.heading}>{title ?? 'Workday progress'}</Text>
          <Text style={styles.fraction}>
            {model.completedCount}/{model.totalSteps}
          </Text>
        </View>

        <View style={styles.surface}>
          <LinearGradient
            pointerEvents="none"
            colors={
              toneDanger
                ? ['rgba(220, 53, 69, 0.12)', 'rgba(220, 53, 69, 0)']
                : toneSuccess
                  ? ['rgba(25, 135, 84, 0.12)', 'rgba(25, 135, 84, 0)']
                  : ['rgba(14, 116, 144, 0.12)', 'rgba(14, 116, 144, 0)']
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />

          <View style={styles.phaseCard}>
            <LinearGradient
              colors={
                toneDanger
                  ? [colors.error, '#B02A37']
                  : toneSuccess
                    ? ['#146C43', colors.success]
                    : [colors.navy, colors.tealStrong]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.phaseIcon}
            >
              <Ionicons name={PHASE_ICON[model.phase]} size={18} color={colors.white} />
            </LinearGradient>
            <View style={styles.phaseCopy}>
              <Text style={styles.phaseTitle}>{model.phaseTitle}</Text>
              <Text style={styles.phaseSubtitle}>{model.phaseSubtitle}</Text>
            </View>
          </View>

          <View style={styles.track}>
            <View style={styles.trackBg} />
            <View
              style={[
                styles.trackFill,
                {
                  width: `${Math.max(8, progress * 100)}%`,
                  backgroundColor: toneDanger
                    ? colors.error
                    : toneSuccess
                      ? colors.success
                      : colors.tealStrong,
                },
              ]}
            />
          </View>

          <View style={styles.steps}>
            {model.steps.map((step, index) => (
              <ProgressStep
                key={step.step}
                step={step.step}
                title={step.title}
                description={step.description}
                statusLabel={step.statusLabel}
                state={step.state}
                isCurrent={step.isCurrent}
                isLast={index === model.steps.length - 1}
                connectorDone={
                  step.state === 'complete' ||
                  step.state === 'approved' ||
                  model.steps[index + 1]?.state === 'complete' ||
                  model.steps[index + 1]?.state === 'approved' ||
                  model.steps[index + 1]?.state === 'under_review' ||
                  model.steps[index + 1]?.state === 'in_progress'
                }
              />
            ))}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.wrap, style]}>
      {title ? <Text style={styles.heading}>{title}</Text> : null}
      <View style={[styles.surface, styles.surfaceLegacy]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  heading: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 13,
    letterSpacing: 0.2,
    textTransform: 'uppercase',
    color: colors.textSecondary,
  },
  fraction: {
    fontFamily: typography.fonts.semibold,
    fontSize: 13,
    color: colors.tealStrong,
  },
  surface: {
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.card,
    overflow: 'hidden',
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.sm,
  },
  surfaceLegacy: {
    paddingTop: spacing.md,
    gap: 0,
  },
  phaseCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  phaseIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phaseCopy: {
    flex: 1,
    gap: 4,
    minWidth: 0,
    paddingTop: 2,
  },
  phaseTitle: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.2,
    color: colors.text,
  },
  phaseSubtitle: {
    fontFamily: typography.fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surfaceSubdued,
    overflow: 'hidden',
    position: 'relative',
  },
  trackBg: {
    ...StyleSheet.absoluteFillObject,
  },
  trackFill: {
    height: '100%',
    borderRadius: 3,
  },
  steps: {
    gap: 0,
    marginTop: spacing.xs,
  },
});
