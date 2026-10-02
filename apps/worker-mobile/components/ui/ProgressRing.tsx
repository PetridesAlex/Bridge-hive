import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, typography } from '@/constants/theme';

type RingProps = {
  /** 0–1 progress. Overdue should pass 0 and use danger tone via label. */
  progress: number;
  size?: number;
  label?: string;
  sublabel?: string;
  tone?: 'teal' | 'warning' | 'danger' | 'success' | 'navy';
};

const TONE_COLOR = {
  teal: colors.teal,
  warning: colors.warning,
  danger: colors.error,
  success: colors.success,
  navy: colors.navy,
} as const;

/**
 * Compact progress indicator without SVG dependency.
 * Uses a rounded track + fill arc approximation via bordered circle + center label.
 * Always pair with text — never color alone.
 */
export function ProgressRing({
  progress,
  size = 64,
  label,
  sublabel,
  tone = 'teal',
}: RingProps) {
  const clamped = Math.max(0, Math.min(1, progress));
  const stroke = TONE_COLOR[tone];
  const pct = Math.round(clamped * 100);

  return (
    <View
      style={[
        styles.ring,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: colors.surfaceSubdued,
        },
      ]}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: pct }}
      accessibilityLabel={label ?? `${pct} percent`}
    >
      <View
        style={[
          styles.ringFill,
          {
            width: size - 8,
            height: size - 8,
            borderRadius: (size - 8) / 2,
            borderColor: stroke,
            // Approximate fill: stronger border when progress high
            borderWidth: clamped > 0 ? 3 : 0,
            opacity: 0.35 + clamped * 0.65,
          },
        ]}
      >
        <Text style={styles.ringPct}>{label ?? `${pct}%`}</Text>
        {sublabel ? <Text style={styles.ringSub}>{sublabel}</Text> : null}
      </View>
    </View>
  );
}

/** Linear progress bar for account setup (X of N). */
export function ProgressBar({
  progress,
  label,
}: {
  progress: number;
  label: string;
}) {
  const clamped = Math.max(0, Math.min(1, progress));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      accessibilityLabel={label}
      style={styles.barWrap}
    >
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${clamped * 100}%` }]} />
      </View>
      <Text style={styles.barLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringFill: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringPct: {
    fontFamily: typography.fonts.semibold,
    fontSize: 12,
    color: colors.text,
  },
  ringSub: {
    fontFamily: typography.fonts.regular,
    fontSize: 10,
    color: colors.textMuted,
  },
  barWrap: { gap: 6 },
  barTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surfaceSubdued,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: colors.teal,
  },
  barLabel: {
    fontFamily: typography.fonts.medium,
    fontSize: 13,
    color: colors.textSecondary,
  },
});
