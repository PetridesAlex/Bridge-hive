import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { colors, motion, radii, spacing, typography } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useTranslation } from '@/i18n/locale-provider';
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

function rangeTitle(
  start: Date,
  offset: number,
  labels: { thisWeek: string; nextWeek: string; lastWeek: string },
): string {
  if (offset === 0) return labels.thisWeek;
  if (offset === 1) return labels.nextWeek;
  if (offset === -1) return labels.lastWeek;
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

function monthContext(start: Date): string {
  const end = addDays(start, 6);
  if (start.getMonth() === end.getMonth()) {
    return start.toLocaleDateString('en-CY', { month: 'long', year: 'numeric' });
  }
  const left = start.toLocaleDateString('en-CY', { month: 'short' });
  const right = end.toLocaleDateString('en-CY', { month: 'short', year: 'numeric' });
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
  const motionStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const busy = day.booked > 0 || day.open > 0;

  return (
    <Animated.View style={[styles.dayWrap, motionStyle]}>
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
          busy && !selected && !day.isToday && styles.dayBusy,
          selected && styles.dayOn,
        ]}
      >
        {selected ? (
          <LinearGradient
            pointerEvents="none"
            colors={['#FFD25A', '#F08C00']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        ) : null}

        <Text
          style={[
            styles.dayLabel,
            selected && styles.dayLabelOn,
            day.isToday && !selected && styles.dayLabelToday,
          ]}
        >
          {day.label}
        </Text>
        <Text
          style={[
            styles.dayNum,
            selected && styles.dayNumOn,
            day.isToday && !selected && styles.dayNumToday,
          ]}
        >
          {day.dayNum}
        </Text>

        {day.isToday && !selected ? <View style={styles.todayRule} /> : null}

        <View style={styles.marks}>
          {day.booked > 0 ? (
            <View style={[styles.countPill, styles.countPillBooked, selected && styles.countPillOn]}>
              <Text style={[styles.countPillText, selected && styles.countPillTextOn]}>
                {day.booked}
              </Text>
            </View>
          ) : null}
          {day.open > 0 ? (
            <View style={[styles.countPill, styles.countPillOpen, selected && styles.countPillOn]}>
              <Text style={[styles.countPillText, selected && styles.countPillTextOn]}>
                {day.open}
              </Text>
            </View>
          ) : null}
          {!busy ? <View style={styles.markSpacer} /> : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}

function AvailabilityInsight({
  open,
  booked,
  openDays,
  selectedIso,
  selectedOpen,
  selectedBooked,
}: {
  open: number;
  booked: number;
  openDays: number;
  selectedIso: string | null;
  selectedOpen: number;
  selectedBooked: number;
}) {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const pulse = useSharedValue(reduced || open === 0 ? 0 : 0.35);
  const enter = useSharedValue(reduced ? 1 : 0);

  useEffect(() => {
    enter.value = reduced
      ? 1
      : withTiming(1, { duration: motion.duration.normal, easing: Easing.out(Easing.cubic) });
  }, [enter, open, booked, selectedIso, reduced]);

  useEffect(() => {
    if (reduced || open === 0) {
      pulse.value = 0;
      return;
    }
    pulse.value = withRepeat(
      withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [open, pulse, reduced]);

  const shellStyle = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [{ translateY: interpolate(enter.value, [0, 1], [6, 0]) }],
  }));
  const pulseStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.18, 0.5]),
    transform: [{ scale: interpolate(pulse.value, [0, 1], [1, 1.18]) }],
  }));

  const focusOpen = selectedIso ? selectedOpen : open;
  const focusBooked = selectedIso ? selectedBooked : booked;
  const availableLabel =
    focusOpen === 1
      ? t('home.availableCountOne')
      : t('home.availableCount', { count: focusOpen });
  const meta = selectedIso
    ? t('home.dayAvailableMeta', { count: selectedOpen, booked: selectedBooked })
    : open === 0
      ? t('home.noneOpenThisWeek')
      : openDays === 1
        ? t('home.openDaysMetaOne')
        : t('home.openDaysMeta', { count: openDays });

  return (
    <Animated.View style={[styles.insight, shellStyle]}>
      <View style={styles.insightHero}>
        <View style={styles.insightLive}>
          {focusOpen > 0 ? (
            <Animated.View pointerEvents="none" style={[styles.insightPulse, pulseStyle]} />
          ) : null}
          <View style={[styles.insightLiveCore, focusOpen > 0 && styles.insightLiveCoreHot]} />
        </View>
        <View style={styles.insightCopy}>
          <Text style={styles.insightKicker}>{t('home.availableToClaim')}</Text>
          <Text style={styles.insightValue}>{availableLabel}</Text>
          <Text style={styles.insightMeta}>{meta}</Text>
        </View>
        <View style={styles.insightSide}>
          <Text style={styles.insightSideLabel}>{t('home.booked')}</Text>
          <Text style={styles.insightSideValue}>{focusBooked}</Text>
        </View>
      </View>
      <View style={styles.insightMeters}>
        <View style={styles.insightMeter}>
          <View style={[styles.statDot, styles.markOpen]} />
          <Text style={styles.insightMeterValue}>{focusOpen}</Text>
          <Text style={styles.insightMeterLabel}>{t('home.open')}</Text>
        </View>
        <View style={styles.insightMeterRule} />
        <View style={styles.insightMeter}>
          <View style={[styles.statDot, styles.markBooked]} />
          <Text style={styles.insightMeterValue}>{focusBooked}</Text>
          <Text style={styles.insightMeterLabel}>{t('home.booked')}</Text>
        </View>
        {!selectedIso ? (
          <>
            <View style={styles.insightMeterRule} />
            <View style={styles.insightMeter}>
              <Ionicons name="sunny-outline" size={12} color="rgba(255,255,255,0.72)" />
              <Text style={styles.insightMeterValue}>{openDays}</Text>
              <Text style={styles.insightMeterLabel}>{t('home.daysWithOpen')}</Text>
            </View>
          </>
        ) : null}
      </View>
    </Animated.View>
  );
}

/** Week calendar for booked work and open marketplace shifts. */
export function ShiftCalendar({ selectedIso, workDates, openDates, onSelect }: Props) {
  const { t } = useTranslation();
  const [weekOffset, setWeekOffset] = useState(0);
  const reduced = useReducedMotion();
  const today = todayIso();
  const workCount = useMemo(() => counts(workDates), [workDates]);
  const openCount = useMemo(() => counts(openDates), [openDates]);
  const enter = useSharedValue(reduced ? 1 : 0);
  const wash = useSharedValue(0);
  const orb = useSharedValue(0);

  useEffect(() => {
    if (reduced) {
      enter.value = 1;
      wash.value = 0.35;
      orb.value = 0.5;
      return;
    }
    enter.value = withTiming(1, {
      duration: motion.duration.slow,
      easing: Easing.out(Easing.cubic),
    });
    wash.value = withRepeat(
      withTiming(1, { duration: 5400, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
    orb.value = withRepeat(
      withTiming(1, { duration: 7000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [enter, orb, reduced, wash]);

  const cardMotion = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [{ translateY: (1 - enter.value) * 10 }],
  }));

  const washStyle = useAnimatedStyle(() => ({
    opacity: interpolate(wash.value, [0, 1], [0.14, 0.38]),
    transform: [{ translateX: interpolate(wash.value, [0, 1], [-44, 72]) }],
  }));

  const orbStyle = useAnimatedStyle(() => ({
    opacity: interpolate(orb.value, [0, 1], [0.18, 0.42]),
    transform: [
      { translateX: interpolate(orb.value, [0, 1], [0, 16]) },
      { translateY: interpolate(orb.value, [0, 1], [0, -12]) },
      { scale: interpolate(orb.value, [0, 1], [0.94, 1.08]) },
    ],
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
  const openDays = days.reduce((sum, day) => sum + (day.open > 0 ? 1 : 0), 0);
  const selectedDay = selectedIso ? days.find((day) => day.iso === selectedIso) : null;
  const moveWeek = (delta: number) => {
    const nextOffset = weekOffset + delta;
    const start = addDays(mondayOf(today), nextOffset * 7);
    const visible = new Set(Array.from({ length: 7 }, (_, index) => toIso(addDays(start, index))));
    if (selectedIso && !visible.has(selectedIso)) onSelect(null);
    setWeekOffset(nextOffset);
  };

  const showingToday = weekOffset === 0;
  const todaySelected = showingToday && selectedIso === today;

  return (
    <Animated.View style={[styles.card, cardMotion]}>
      <LinearGradient
        pointerEvents="none"
        colors={['#071E33', '#0B2A43', '#0E4A5C', '#0F6B6B']}
        locations={[0, 0.34, 0.7, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View pointerEvents="none" style={[styles.wash, washStyle]}>
        <LinearGradient
          colors={['transparent', 'rgba(255,255,255,0.15)', 'transparent']}
          start={{ x: 0, y: 0.2 }}
          end={{ x: 1, y: 0.8 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      <Animated.View pointerEvents="none" style={[styles.orb, orbStyle]} />
      <View pointerEvents="none" style={styles.glow} />

      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous week"
          onPress={() => moveWeek(-1)}
          hitSlop={10}
          style={({ pressed }) => [styles.nav, pressed && styles.navPressed]}
        >
          <Ionicons name="chevron-back" size={18} color={colors.white} />
        </Pressable>

        <View style={styles.heading}>
          <Text style={styles.kicker}>{t('home.schedule')}</Text>
          <Text style={styles.title}>
            {rangeTitle(weekStart, weekOffset, {
              thisWeek: t('home.thisWeek'),
              nextWeek: t('home.nextWeek'),
              lastWeek: t('home.lastWeek'),
            })}
          </Text>
          <Text style={styles.month}>{monthContext(weekStart)}</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next week"
          onPress={() => moveWeek(1)}
          hitSlop={10}
          style={({ pressed }) => [styles.nav, pressed && styles.navPressed]}
        >
          <Ionicons name="chevron-forward" size={18} color={colors.white} />
        </Pressable>
      </View>

      <AvailabilityInsight
        open={weekOpen}
        booked={weekBooked}
        openDays={openDays}
        selectedIso={selectedIso}
        selectedOpen={selectedDay?.open ?? 0}
        selectedBooked={selectedDay?.booked ?? 0}
      />

      <View style={styles.tools}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: selectedIso == null }}
          accessibilityLabel="Show all upcoming"
          onPress={() => onSelect(null)}
          style={[styles.tool, selectedIso == null && styles.toolOn]}
        >
          <Text style={[styles.toolText, selectedIso == null && styles.toolTextOn]}>
            {t('home.allDays')}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Jump to today"
          onPress={() => {
            setWeekOffset(0);
            onSelect(today);
          }}
          style={[styles.tool, todaySelected && styles.toolOn]}
        >
          <Ionicons
            name="today-outline"
            size={13}
            color={todaySelected ? colors.navy : colors.white}
          />
          <Text style={[styles.toolText, todaySelected && styles.toolTextOn]}>
            {t('home.today')}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open full month calendar"
          onPress={() => router.push('/shifts/calendar')}
          style={styles.tool}
        >
          <Ionicons name="calendar-outline" size={13} color={colors.white} />
          <Text style={styles.toolText}>{t('home.month')}</Text>
        </Pressable>
      </View>

      <Animated.View
        entering={reduced ? undefined : FadeIn.delay(60).duration(320)}
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
          <Text style={styles.legendText}>{t('home.legendBooked')}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.mark, styles.markOpen]} />
          <Text style={styles.legendText}>{t('home.legendOpen')}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={styles.todayLegend} />
          <Text style={styles.legendText}>{t('home.legendToday')}</Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.xl,
    overflow: 'hidden',
    backgroundColor: '#0B2A43',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.14)',
    paddingTop: spacing.md + 2,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  wash: {
    position: 'absolute',
    top: -24,
    bottom: -24,
    width: 140,
  },
  orb: {
    position: 'absolute',
    right: -48,
    top: -56,
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: 'rgba(22, 166, 182, 0.28)',
  },
  glow: {
    position: 'absolute',
    left: -36,
    bottom: -60,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 210, 90, 0.10)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  nav: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  navPressed: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    transform: [{ scale: 0.96 }],
  },
  heading: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  kicker: {
    fontFamily: typography.fonts.bold,
    fontSize: 10.5,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: colors.yellow,
  },
  title: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 20,
    lineHeight: 24,
    letterSpacing: -0.4,
    color: colors.white,
  },
  month: {
    fontFamily: typography.fonts.medium,
    fontSize: 12,
    color: 'rgba(255,255,255,0.62)',
  },
  insight: {
    gap: spacing.sm,
    padding: spacing.md - 2,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  insightHero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
  },
  insightLive: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightPulse: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.yellow,
  },
  insightLiveCore: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  insightLiveCoreHot: {
    backgroundColor: colors.yellow,
  },
  insightCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  insightKicker: {
    fontFamily: typography.fonts.semibold,
    fontSize: 10.5,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    color: 'rgba(255, 236, 190, 0.88)',
  },
  insightValue: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 20,
    lineHeight: 24,
    letterSpacing: -0.3,
    color: colors.white,
  },
  insightMeta: {
    fontFamily: typography.fonts.medium,
    fontSize: 12,
    lineHeight: 16,
    color: 'rgba(255,255,255,0.62)',
  },
  insightSide: {
    alignItems: 'flex-end',
    gap: 2,
    minWidth: 56,
  },
  insightSideLabel: {
    fontFamily: typography.fonts.medium,
    fontSize: 11,
    color: 'rgba(255,255,255,0.58)',
  },
  insightSideValue: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: -0.4,
    color: colors.white,
  },
  insightMeters: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.12)',
  },
  insightMeter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  insightMeterRule: {
    width: StyleSheet.hairlineWidth,
    height: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  insightMeterValue: {
    fontFamily: typography.fonts.displaySemibold,
    fontSize: 13,
    color: colors.white,
  },
  insightMeterLabel: {
    fontFamily: typography.fonts.medium,
    fontSize: 11,
    color: 'rgba(255,255,255,0.62)',
  },
  statDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  countPill: {
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countPillBooked: {
    backgroundColor: 'rgba(20, 169, 181, 0.92)',
  },
  countPillOpen: {
    backgroundColor: 'rgba(255, 210, 90, 0.95)',
  },
  countPillOn: {
    backgroundColor: 'rgba(11, 42, which, 0.88)',
  },
  countPillText: {
    fontFamily: typography.fonts.bold,
    fontSize: 9,
    lineHeight: 11,
    color: colors.navy,
  },
  countPillTextOn: {
    color: colors.white,
  },
  tools: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  tool: {
    minHeight: 32,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  toolOn: {
    backgroundColor: colors.yellow,
    borderColor: colors.yellow,
  },
  toolText: {
    fontFamily: typography.fonts.semibold,
    fontSize: 12,
    color: colors.white,
  },
  toolTextOn: {
    color: colors.navy,
  },
  grid: {
    flexDirection: 'row',
    gap: 6,
  },
  dayWrap: {
    flex: 1,
  },
  day: {
    minHeight: 88,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingVertical: 10,
    overflow: 'hidden',
    gap: 3,
  },
  dayToday: {
    backgroundColor: 'rgba(255, 210, 90, 0.18)',
    borderColor: 'rgba(255, 210, 90, 0.42)',
  },
  dayBusy: {
    backgroundColor: 'rgba(22, 166, 182, 0.18)',
    borderColor: 'rgba(22, 166, 182, 0.38)',
  },
  dayOn: {
    borderColor: 'transparent',
  },
  dayLabel: {
    fontFamily: typography.fonts.semibold,
    fontSize: 10,
    color: 'rgba(255,255,255,0.55)',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  dayLabelToday: {
    color: colors.yellow,
  },
  dayLabelOn: {
    color: 'rgba(11,42,67,0.72)',
  },
  dayNum: {
    fontFamily: typography.fonts.displayExtra,
    fontSize: 20,
    lineHeight: 24,
    letterSpacing: -0.5,
    color: colors.white,
  },
  dayNumToday: {
    color: colors.yellow,
  },
  dayNumOn: {
    color: colors.navy,
  },
  todayRule: {
    width: 14,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.yellow,
    marginTop: 1,
  },
  marks: {
    flexDirection: 'row',
    gap: 3,
    minHeight: 16,
    marginTop: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markSpacer: {
    width: 5,
    height: 5,
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
    backgroundColor: colors.navy,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: spacing.md,
    paddingTop: 2,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendText: {
    fontFamily: typography.fonts.medium,
    fontSize: 11,
    color: 'rgba(255,255,255,0.62)',
  },
  todayLegend: {
    width: 10,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.yellow,
  },
});
