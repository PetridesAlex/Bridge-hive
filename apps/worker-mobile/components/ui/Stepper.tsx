import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '@/constants/theme';

export type StepperStep = {
  key: string;
  label: string;
  done?: boolean;
  active?: boolean;
};

type Props = {
  steps: StepperStep[];
};

export function Stepper({ steps }: Props) {
  return (
    <View style={styles.wrap}>
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        const done = !!step.done;
        const active = !!step.active;
        return (
          <View key={step.key} style={styles.stepRow}>
            <View style={styles.rail}>
              <View style={[styles.dot, done && styles.dotDone, active && styles.dotActive]}>
                {done ? (
                  <Ionicons name="checkmark" size={12} color={colors.white} />
                ) : (
                  <Text style={[styles.dotText, active && styles.dotTextActive]}>{index + 1}</Text>
                )}
              </View>
              {!isLast ? <View style={[styles.line, done && styles.lineDone]} /> : null}
            </View>
            <Text
              style={[
                styles.label,
                (done || active) && styles.labelStrong,
                active && styles.labelActive,
              ]}
            >
              {step.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 0,
  },
  stepRow: {
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 44,
  },
  rail: {
    alignItems: 'center',
    width: 24,
  },
  dot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotDone: {
    backgroundColor: colors.success,
  },
  dotActive: {
    backgroundColor: colors.yellow,
  },
  dotText: {
    fontFamily: typography.fonts.semibold,
    fontSize: 11,
    color: colors.textSecondary,
  },
  dotTextActive: {
    color: colors.navy,
  },
  line: {
    width: 2,
    flex: 1,
    backgroundColor: colors.border,
    marginVertical: 4,
  },
  lineDone: {
    backgroundColor: colors.success,
  },
  label: {
    flex: 1,
    fontFamily: typography.fonts.regular,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    paddingTop: 3,
    paddingBottom: spacing.md,
  },
  labelStrong: {
    fontFamily: typography.fonts.medium,
    color: colors.navy,
  },
  labelActive: {
    fontFamily: typography.fonts.semibold,
  },
});
