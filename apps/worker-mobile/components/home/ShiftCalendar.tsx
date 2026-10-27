import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { colors, radii, shadows, spacing, typography } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { isoDateFromTimestamp, parseLocalDate } from '@/utils/format';

type Props = {
  selectedIso: string | null;
  workDates: string[];
  openDates: string[];
  onSelect: (isoDate: string | null) => void;
};

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function todayIso(): string {
  return isoDateFromTimestamp(new Date().toISOString());
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function toIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function mondayOf(iso: string): Date {
  const date = parseLocalDate(iso);
  const dow = date.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  return addDays(date, diff);
}

function counts(dates: string[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const date of dates) map.set(date, (map.get(date) ?? 0) + 1);
  return map;
}

function rangeTitle(start: Date, offset: number): string {
  if (offset === 0) return 'This week';
  if (offset === 1) return 'Next week';
  if (offset === -1) return 'Last week';
  const end = addDays(start, 6);
  const sameMonth = start.getMonth() === end.getMonth();
  if (sameMonth) {
    const month = end.toLocaleDateString('en-CY', { month: 'long' });
    return `${start.getDate()}–${end.getDate()} ${month}`;
  }
  const left = start.toLocaleDateString('en-CY', { day: 'numeric', month: 'short' });
  const right = end.toLocaleDateString('en-CY', { day: 'numeric', month: 'short' });
  return `${left} – ${right}`;
}

function DayCell({
  day,
  selected,
  onPress,
}: {
  day: {
    iso: string;
    label: string;
    dayNum: number;
    isToday: boolean;
    booked: number;
    open: number;
  };
  selected: boolean;
  onPress: () => void;
}) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  const motion = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const busy = day.booked > 0 || day.open > 0;

  return (
    <Animated.View style={[styles.dayWrap, motion]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected }}
        accessibilityLabel={`${day.label} ${day.dayNum}${day.booked ? `, ${day.booked} booked` : ''}${day.open ? `, ${day.open} open` : ''}`}
        onPress={onPress}
        onPressIn={() => {
          if (reduced) return;
          scale.value = withSpring(0.94, { damping: 18, stiffness: 420 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 14, stiffness: 260 });
        }}
        style={[
          styles.day,
          day.isToday && !selected && styles.dayToday,
          busy && !selected && styles.dayBusy,
          selected && styles.dayOn,
        ]}
      >
        {selected ? (
          <LinearGradient
            pointerEvents="none"
            colors={[colors.navy, '#0C3E56', colors.tealStrong]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        ) : null}
        <Text style={[styles.dayLabel, selected && styles.dayLabelOn]}>{day.label}</Text>
        <Text style={[styles.dayNum, selected && styles.dayNumOn]}>{day.dayNum}</Text>
        <View style={styles.marks}>
          {day.booked > 0 ? (
            <View style={[styles.mark, styles.markBooked, selected && styles.markOn]} />
          ) : null}
          {day.open > 0 ? (
            <View style={[styles.mark, styles.markOpen, selected && styles.markOn]} />
          ) : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}

/** Week calendar for booked work and open marketplace shifts. */
export function ShiftCalendar({ selectedIso, workDates, openDates, onSelect }: Props) {
  const [weekOffset, setWeekOffset] = useState(0);
  const reduced = useReducedMotion();
  const today = todayIso();
  const workCount = useMemo(() => counts(workDates), [workDates]);
  const openCount = useMemo(() => counts(openDates), [openDates]);
  const enter = useSharedValue(reduced ? 1 : 0);

  useEffect(() => {
    if (reduced) {
      enter.value = 1;
      return;
    }
    enter.value = withSpring(1, { damping: 16, stiffness: 140 });
  }, [enter, reduced]);

  const cardMotion = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [{ translateY: (1 - enter.value) * 10 }],
  }));

  const weekStart = useMemo(
    () => addDays(mondayOf(today), weekOffset * 7),
    [today, weekOffset],
  );

  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) => {
        const date = addDays(weekStart, index);
        const iso = toIso(date);
        return {
          iso,
          label: DAY_LABELS[index] ?? '',
          dayNum: date.getDate(),
          isToday: iso === today,
          booked: workCount.get(iso) ?? 0,
          open: openCount.get(iso) ?? 0,
        };
      }),
    [openCount, today, weekStart, workCount],
  );

  const weekBooked = days.reduce((sum, day) => sum + day.booked, 0);
  const weekOpen = days.reduce((sum, day) => sum + day.open, 0);
  const moveWeek = (delta: number) => {
    const nextOffset = weekOffset + delta;
    const start = addDays(mondayOf(today), nextOffset * 7);
    const visible = new Set(Array.from({ length: 7 }, (_, index) => toIso(addDays(start, index))));
    if (selectedIso && !visible.has(selectedIso)) onSelect(null);
    setWeekOffset(nextOffset);
  };

  const showingToday = weekOffset === 0;

  return (
    <Animated.View style={[styles.card, cardMotion]}>
      <View style={styles.heroBand}>
        <LinearGradient
          pointerEvents="none"
          colors={[colors.navy, '#0C3E56', colors.tealStrong]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Previous week"
            onPress={() => moveWeek(-1)}
            hitSlop={10}
            style={({ pressed }) => [styles.nav, pressed && styles.navPressed]}
          >
            <Ionicons name="chevron-back" size={22} color={colors.white} />
          </Pressable>
          <View style={styles.heading}>
            <Text style={styles.kicker}>Schedule</Text>
            <Text style={styles.title}>{rangeTitle(weekStart, weekOffset)}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Next week"
            onPress={() => moveWeek(1)}
            hitSlop={10}
            style={({ pressed }) => [styles.nav, pressed && styles.navPressed]}
          >
            <Ionicons name="chevron-forward" size={22} color={colors.white} />
          </Pressable>
        </View>

        <View style={styles.statRow}>
          <View style={styles.statChip}>
            <View style={[styles.statDot, styles.markBooked]} />
            <Text style={styles.statValue}>{weekBooked}</Text>
            <Text style={styles.statLabel}>booked</Text>
          </View>
          <View style={styles.statChip}>
            <View style={[styles.statDot, styles.markOpen]} />
            <Text style={styles.statValue}>{weekOpen}</Text>
            <Text style={styles.statLabel}>open</Text>
          </View>
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.tools}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: selectedIso == null }}
            accessibilityLabel="Show all upcoming"
            onPress={() => onSelect(null)}
            style={[styles.tool, selectedIso == null && styles.toolOn]}
          >
            <Text style={[styles.toolText, selectedIso == null && styles.toolTextOn]}>
              All days
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Jump to today"
            onPress={() => {
              setWeekOffset(0);
              onSelect(today);
            }}
            style={[styles.tool, showingToday && selectedIso === today && styles.toolOn]}
          >
            <Ionicons
              name="today-outline"
              size={14}
              color={
                showingToday && selectedIso === today ? colors.white : colors.tealStrong
              }
            />
            <Text
              style={[
                styles.toolText,
                showingToday && selectedIso === today && styles.toolTextOn,
              ]}
            >
              Today
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open full month calendar"
            onPress={() => router.push('/shifts/calendar')}
            style={styles.tool}
          >
            <Ionicons name="calendar-outline" size={14} color={colors.tealStrong} />
            <Text style={styles.toolText}>Month</Text>
          </Pressable>
        </View>

        <Animated.View
          entering={reduced ? undefined : FadeIn.delay(80).duration(320)}
          style={styles.grid}
        >
          {days.map((day) => (
            <DayCell
              key={day.iso}
              day={day}
              selected={selectedIso === day.iso}
              onPress={() => onSelect(selectedIso === day.iso ? null : day.iso)}
            />
          ))}
        </Animated.View>

        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.mark, styles.markBooked]} />
            <Text style={styles.legendText}>Booked</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.mark, styles.markOpen]} />
            <Text style={styles.legendText}>Open to claim</Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.xl,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(20, 169, 181, 0.2)',
    backgroundColor: colors.card,
    ...shadows.lg,
  },
  heroBand: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.md,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  nav: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  navPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.32)',
    transform: [{ scale: 0.96 }],
  },
  heading: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  kicker: {
    fontFamily: typography.fonts.semibold,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.yellow,
  },
  title: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 20,
    color: colors.white,
    letterSpacing: -0.3,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.full,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  statDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statValue: {
    fontFamily: typography.fonts.bold,
    fontSize: 14,
    color: colors.white,
  },
  statLabel: {
    fontFamily: typography.fonts.medium,
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.78)',
  },
  body: {
    padding: spacing.md,
    gap: spacing.md,
    backgroundColor: colors.card,
  },
  tools: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tool: {
    minHeight: 34,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(20, 169, 181, 0.28)',
    backgroundColor: colors.tealSoft,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  toolOn: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  toolText: {
    fontFamily: typography.fonts.semibold,
    fontSize: 12,
    color: colors.tealStrong,
  },
  toolTextOn: {
    color: colors.white,
  },
  grid: {
    flexDirection: 'row',
    gap: 5,
  },
  dayWrap: {
    flex: 1,
  },
  day: {
    minHeight: 74,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceSubdued,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingVertical: 8,
    overflow: 'hidden',
    gap: 2,
  },
  dayToday: {
    borderColor: colors.tealStrong,
    borderWidth: 1.5,
  },
  dayBusy: {
    backgroundColor: colors.tealSoft,
    borderColor: 'rgba(20, 169, 181, 0.35)',
  },
  dayOn: {
    borderColor: 'transparent',
  },
  dayLabel: {
    fontFamily: typography.fonts.medium,
    fontSize: 10,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  dayLabelOn: {
    color: 'rgba(255,255,255,0.75)',
  },
  dayNum: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 17,
    color: colors.navy,
  },
  dayNumOn: {
    color: colors.white,
  },
  marks: {
    flexDirection: 'row',
    gap: 3,
    height: 6,
    marginTop: 4,
    alignItems: 'center',
  },
  mark: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  markBooked: {
    backgroundColor: colors.tealStrong,
  },
  markOpen: {
    backgroundColor: colors.yellow,
  },
  markOn: {
    backgroundColor: colors.white,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendText: {
    fontFamily: typography.fonts.medium,
    fontSize: 12,
    color: colors.textSecondary,
  },
});
