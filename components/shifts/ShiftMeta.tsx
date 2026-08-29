import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '@/constants/theme';
import type { Shift } from '@/types';
import { formatDayLabel, formatDuration, formatTimeRange } from '@/utils/format';

type MetaItem = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  accent?: boolean;
};

type TileProps = MetaItem;

function MetaTile({ icon, label, value, accent = false }: TileProps) {
  return (
    <View style={[styles.tile, accent && styles.tileAccent]}>
      <View style={styles.tileTop}>
        <View style={[styles.iconWrap, accent && styles.iconWrapAccent]}>
          <Ionicons name={icon} size={14} color={accent ? colors.navy : colors.yellow} />
        </View>
        <Text style={[styles.tileLabel, accent && styles.tileLabelAccent]}>{label}</Text>
      </View>
      <Text style={[styles.tileValue, accent && styles.tileValueAccent]} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

type GridProps = {
  shift: Shift;
};

export function ShiftMetaGrid({ shift }: GridProps) {
  const items: MetaItem[] = [
    {
      icon: 'calendar-outline',
      label: 'Date',
      value: formatDayLabel(shift.date),
    },
    {
      icon: 'time-outline',
      label: 'Schedule',
      value: formatTimeRange(shift.startTime, shift.endTime),
    },
    {
      icon: 'hourglass-outline',
      label: 'Duration',
      value: formatDuration(shift.durationHours),
      accent: true,
    },
    {
      icon: 'location-outline',
      label: 'Location',
      value: shift.city,
    },
  ];

  return (
    <View style={styles.grid}>
      {items.map((item) => (
        <MetaTile key={item.label} {...item} />
      ))}
    </View>
  );
}

/** Compact premium row for single-column lists (e.g. Next Shift card). */
export function MetaRow({
  icon,
  label,
  caption,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  caption?: string;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={15} color={colors.yellow} />
      </View>
      <View style={styles.rowCopy}>
        {caption ? <Text style={styles.rowCaption}>{caption}</Text> : null}
        <Text style={styles.rowLabel} numberOfLines={1}>
          {label}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  tile: {
    width: '48.5%',
    flexGrow: 1,
    minWidth: 132,
    backgroundColor: colors.blueLight,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  tileAccent: {
    backgroundColor: colors.navy,
  },
  tileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: radii.sm,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapAccent: {
    backgroundColor: colors.yellow,
  },
  tileLabel: {
    fontFamily: typography.fonts.semibold,
    fontSize: 10,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    color: colors.navyLift,
  },
  tileLabelAccent: {
    color: 'rgba(255,255,255,0.55)',
  },
  tileValue: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 14,
    lineHeight: 19,
    letterSpacing: -0.25,
    color: colors.navy,
  },
  tileValueAccent: {
    color: colors.white,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.blueLight,
    borderRadius: radii.md,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowCopy: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  rowCaption: {
    fontFamily: typography.fonts.semibold,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.navyLift,
  },
  rowLabel: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 14,
    letterSpacing: -0.2,
    color: colors.navy,
  },
});
