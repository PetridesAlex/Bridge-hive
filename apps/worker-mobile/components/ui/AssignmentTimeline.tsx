import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { Surface } from '@/components/ui/Surface';
import { colors, spacing, typography } from '@/constants/theme';

type Props = {
  title?: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

/** Contained workday / assignment progress surface around ProgressStep children. */
export function AssignmentTimeline({ title = 'Workday progress', children, style }: Props) {
  return (
    <View style={[styles.wrap, style]}>
      {title ? <Text style={styles.heading}>{title}</Text> : null}
      <Surface variant="group" padded style={styles.surface}>
        {children}
      </Surface>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  heading: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    paddingHorizontal: 2,
  },
  surface: {
    paddingTop: spacing.md,
    gap: 0,
  },
});
