import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '@/constants/theme';

export type WeekDay = {
  isoDate: string;
  label: string;
  dayNum: number;
  hasWork: boolean;
  isToday: boolean;
};

type Props = {
  selectedIso: string | null;
  workDates: string[];
  onSelect: (isoDate: string | null) => void;
  /** When true, show an "All" chip that clears the day filter. */
  allowAll?: boolean;
};

function startOfLocalDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Compact horizontal seven-day selector. Presentation-only filter. */
export function WeekStrip({
  selectedIso,
  workDates,
  onSelect,
  allowAll = true,
}: Props) {
  const workSet = useMemo(() => new Set(workDates), [workDates]);

  const days = useMemo(() => {
    const today = startOfLocalDay(new Date());
    const start = new Date(today);
    // Start on Monday of current week
    const dow = start.getDay();
    const diff = dow === 0 ? -6 : 1 - dow;
    start.setDate(start.getDate() + diff);

    const out: WeekDay[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const iso = toIsoDate(d);
      out.push({
        isoDate: iso,
        label: DAY_LABELS[d.getDay()] ?? '',
        dayNum: d.getDate(),
        hasWork: workSet.has(iso),
        isToday: iso === toIsoDate(today),
      });
    }
    return out;
  }, [workSet]);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      accessibilityRole="tablist"
    >
      {allowAll ? (
        <Pressable
          onPress={() => onSelect(null)}
          style={[styles.chip, selectedIso == null && styles.chipSelected]}
          accessibilityRole="tab"
          accessibilityState={{ selected: selectedIso == null }}
          accessibilityLabel="All upcoming"
        >
          <Text style={[styles.chipLabel, selectedIso == null && styles.chipLabelSelected]}>
            All
          </Text>
        </Pressable>
      ) : null}
      {days.map((day) => {
        const selected = selectedIso === day.isoDate;
        return (
          <Pressable
            key={day.isoDate}
            onPress={() => onSelect(day.isoDate)}
            style={[
              styles.day,
              selected && styles.daySelected,
              day.isToday && !selected && styles.dayToday,
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={`${day.label} ${day.dayNum}${day.hasWork ? ', has work' : ''}`}
          >
            <Text style={[styles.dayLabel, selected && styles.dayLabelSelected]}>{day.label}</Text>
            <Text style={[styles.dayNum, selected && styles.dayNumSelected]}>{day.dayNum}</Text>
            {day.hasWork ? (
              <View style={[styles.dot, selected && styles.dotSelected]} />
            ) : (
              <View style={styles.dotSpacer} />
            )}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    alignItems: 'center',
  },
  chip: {
    minWidth: 44,
    minHeight: 56,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  chipSelected: {
    backgroundColor: colors.tealSoft,
    borderColor: colors.teal,
  },
  chipLabel: {
    fontFamily: typography.fonts.semibold,
    fontSize: 13,
    color: colors.textSecondary,
  },
  chipLabelSelected: {
    color: colors.tealStrong,
  },
  day: {
    width: 44,
    minHeight: 56,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: 6,
  },
  daySelected: {
    backgroundColor: colors.teal,
    borderColor: colors.tealStrong,
  },
  dayToday: {
    borderColor: colors.navy,
  },
  dayLabel: {
    fontFamily: typography.fonts.medium,
    fontSize: 11,
    color: colors.textMuted,
  },
  dayLabelSelected: {
    color: colors.white,
  },
  dayNum: {
    fontFamily: typography.fonts.semibold,
    fontSize: 15,
    color: colors.text,
  },
  dayNumSelected: {
    color: colors.white,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.teal,
    marginTop: 2,
  },
  dotSelected: {
    backgroundColor: colors.yellow,
  },
  dotSpacer: {
    width: 5,
    height: 5,
    marginTop: 2,
  },
});
