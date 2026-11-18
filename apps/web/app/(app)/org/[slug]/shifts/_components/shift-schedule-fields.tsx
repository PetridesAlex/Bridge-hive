'use client';

import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import {
  AlarmClock,
  ArrowRight,
  BellOff,
  BellRing,
  CalendarClock,
  Check,
  ChevronLeft,
  ChevronRight,
  Hourglass,
  Minus,
  Moon,
  Plus,
  Sun,
  Sunrise,
  Sunset,
  type LucideIcon,
} from 'lucide-react';
import { useMemo, useState } from 'react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const fieldClass =
  'h-11 rounded-xl border-bh-border bg-bh-surface text-bh-text shadow-none focus-visible:border-bh-teal focus-visible:ring-bh-teal/25';

/** Common hospital ward patterns (Cyprus / UK-style). */
const SHIFT_PATTERNS = [
  { id: 'early', label: 'Early', detail: '07:00–15:00', start: '07:00', hours: 8 },
  { id: 'day', label: 'Day', detail: '08:00–16:00', start: '08:00', hours: 8 },
  { id: 'late', label: 'Late', detail: '14:00–22:00', start: '14:00', hours: 8 },
  { id: 'long', label: 'Long day', detail: '07:00–19:00', start: '07:00', hours: 12 },
  { id: 'night', label: 'Night', detail: '20:00–08:00', start: '20:00', hours: 12 },
] as const;

/** Each pattern has its own color so it is recognisable at a glance. */
const PATTERN_THEME: Record<
  (typeof SHIFT_PATTERNS)[number]['id'],
  {
    icon: LucideIcon;
    gradient: string;
    glow: string;
    idle: string;
    idleHover: string;
    bar: string;
    chip: string;
  }
> = {
  early: {
    icon: Sunrise,
    gradient: 'bg-[linear-gradient(135deg,#f59e0b_0%,#d97706_100%)]',
    glow: 'shadow-[0_14px_28px_rgba(217,119,6,0.4)]',
    idle: 'border-amber-200 bg-amber-50/70',
    idleHover: 'hover:border-amber-400 hover:shadow-[0_12px_24px_rgba(217,119,6,0.18)]',
    bar: 'bg-amber-500',
    chip: 'bg-amber-100 text-amber-900',
  },
  day: {
    icon: Sun,
    gradient: 'bg-[linear-gradient(135deg,#eab308_0%,#ca8a04_100%)]',
    glow: 'shadow-[0_14px_28px_rgba(202,138,4,0.4)]',
    idle: 'border-yellow-200 bg-yellow-50/70',
    idleHover: 'hover:border-yellow-400 hover:shadow-[0_12px_24px_rgba(202,138,4,0.18)]',
    bar: 'bg-yellow-500',
    chip: 'bg-yellow-100 text-yellow-900',
  },
  late: {
    icon: Sunset,
    gradient: 'bg-[linear-gradient(135deg,#e11d48_0%,#be123c_100%)]',
    glow: 'shadow-[0_14px_28px_rgba(190,18,60,0.4)]',
    idle: 'border-rose-200 bg-rose-50/70',
    idleHover: 'hover:border-rose-400 hover:shadow-[0_12px_24px_rgba(190,18,60,0.18)]',
    bar: 'bg-rose-500',
    chip: 'bg-rose-100 text-rose-900',
  },
  long: {
    icon: Hourglass,
    gradient: 'bg-[linear-gradient(135deg,#0e8f99_0%,#0a6c75_100%)]',
    glow: 'shadow-[0_14px_28px_rgba(14,143,153,0.4)]',
    idle: 'border-teal-200 bg-teal-50/70',
    idleHover: 'hover:border-teal-400 hover:shadow-[0_12px_24px_rgba(14,143,153,0.18)]',
    bar: 'bg-teal-500',
    chip: 'bg-teal-100 text-teal-900',
  },
  night: {
    icon: Moon,
    gradient: 'bg-[linear-gradient(135deg,#4f46e5_0%,#312e81_100%)]',
    glow: 'shadow-[0_14px_28px_rgba(49,46,129,0.45)]',
    idle: 'border-indigo-200 bg-indigo-50/70',
    idleHover: 'hover:border-indigo-400 hover:shadow-[0_12px_24px_rgba(49,46,129,0.2)]',
    bar: 'bg-indigo-500',
    chip: 'bg-indigo-100 text-indigo-900',
  },
};

const DURATION_PRESETS = [4, 6, 8, 10, 12] as const;

const DEADLINE_PRESETS = [
  { id: 'none', label: 'None', hint: 'No cut-off', hoursBefore: null, icon: BellOff },
  { id: '4h', label: '4h before', hint: 'Last minute', hoursBefore: 4, icon: AlarmClock },
  { id: '12h', label: '12h before', hint: 'Same day', hoursBefore: 12, icon: BellRing },
  { id: '24h', label: '1 day before', hint: 'Plan ahead', hoursBefore: 24, icon: CalendarClock },
] as const;

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function todayLocalDate(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

function splitLocal(value: string): { date: string; time: string } {
  if (!value || !value.includes('T')) return { date: '', time: '' };
  const [date, rest] = value.split('T');
  return { date: date ?? '', time: (rest ?? '').slice(0, 5) };
}

function joinLocal(date: string, time: string): string {
  if (!date || !time) return '';
  return `${date}T${time}`;
}

function addHoursToLocal(date: string, time: string, hours: number): {
  date: string;
  time: string;
} {
  const base = new Date(`${date}T${time}:00`);
  if (Number.isNaN(base.getTime())) return { date, time };
  base.setHours(base.getHours() + hours);
  return {
    date: `${base.getFullYear()}-${pad(base.getMonth() + 1)}-${pad(base.getDate())}`,
    time: `${pad(base.getHours())}:${pad(base.getMinutes())}`,
  };
}

function addMinutesToLocal(date: string, time: string, minutes: number): {
  date: string;
  time: string;
} {
  const base = new Date(`${date}T${time}:00`);
  if (Number.isNaN(base.getTime())) return { date, time };
  base.setMinutes(base.getMinutes() + minutes);
  return {
    date: `${base.getFullYear()}-${pad(base.getMonth() + 1)}-${pad(base.getDate())}`,
    time: `${pad(base.getHours())}:${pad(base.getMinutes())}`,
  };
}

function formatDuration(hours: number): string {
  const total = Math.round(hours * 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m === 0 ? `${h} h` : h === 0 ? `${m} min` : `${h} h ${m} min`;
}

function subtractHoursFromLocal(date: string, time: string, hours: number): string {
  const result = addHoursToLocal(date, time, -hours);
  return joinLocal(result.date, result.time);
}

function durationHours(
  startDate: string,
  startTime: string,
  endDate: string,
  endTime: string,
): number | null {
  const start = new Date(`${startDate}T${startTime}:00`);
  const end = new Date(`${endDate}T${endTime}:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    return null;
  }
  return Math.round(((end.getTime() - start.getTime()) / (1000 * 60 * 60)) * 10) / 10;
}

function formatDisplayDate(ymd: string): string {
  if (!ymd) return 'Select a date';
  try {
    return format(parseISO(`${ymd}T12:00:00`), 'EEE d MMM yyyy');
  } catch {
    return ymd;
  }
}

function ShiftDateCalendar({
  value,
  onChange,
}: {
  value: string;
  onChange: (ymd: string) => void;
}) {
  const selected = value ? parseISO(`${value}T12:00:00`) : null;
  const [cursor, setCursor] = useState(() => selected ?? new Date());

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [cursor]);

  return (
    <div className="overflow-hidden rounded-2xl border border-bh-border bg-bh-surface shadow-[0_1px_2px_rgba(7,29,48,0.04)]">
      <div className="flex items-center justify-between border-b border-bh-border/80 bg-bh-subtle/40 px-3 py-2.5">
        <button
          type="button"
          aria-label="Previous month"
          onClick={() => setCursor((c) => subMonths(c, 1))}
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-bh-text-secondary transition-colors hover:bg-bh-surface hover:text-bh-text"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="text-sm font-semibold tracking-tight text-bh-text">
          {format(cursor, 'MMMM yyyy')}
        </p>
        <button
          type="button"
          aria-label="Next month"
          onClick={() => setCursor((c) => addMonths(c, 1))}
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-bh-text-secondary transition-colors hover:bg-bh-surface hover:text-bh-text"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 px-3 pt-3 text-center text-[10px] font-semibold uppercase tracking-wide text-bh-text-muted">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 p-3 pt-2">
        {days.map((day) => {
          const ymd = format(day, 'yyyy-MM-dd');
          const inMonth = isSameMonth(day, cursor);
          const selectedDay = selected ? isSameDay(day, selected) : false;
          const today = isToday(day);
          return (
            <button
              key={ymd}
              type="button"
              onClick={() => {
                onChange(ymd);
                setCursor(day);
              }}
              aria-label={format(day, 'EEEE d MMMM yyyy')}
              aria-pressed={selectedDay}
              className={cn(
                'flex h-10 items-center justify-center rounded-xl text-sm font-medium transition-colors',
                !inMonth && 'text-bh-text-muted/45',
                inMonth && !selectedDay && 'text-bh-text hover:bg-bh-subtle',
                today && !selectedDay && 'ring-1 ring-bh-teal/35',
                selectedDay &&
                  'bg-bh-sidebar font-semibold text-white shadow-sm hover:bg-bh-sidebar',
              )}
            >
              {format(day, 'd')}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between border-t border-bh-border/80 px-3 py-2.5">
        <button
          type="button"
          className="text-xs font-semibold text-bh-teal-strong hover:underline"
          onClick={() => {
            const today = todayLocalDate();
            onChange(today);
            setCursor(new Date());
          }}
        >
          Today
        </button>
        <p className="text-xs font-medium text-bh-text-secondary">{formatDisplayDate(value)}</p>
      </div>
    </div>
  );
}

export function ShiftScheduleFields({
  startsAt,
  endsAt,
  acceptanceDeadline,
  onStartsAtChange,
  onEndsAtChange,
  onAcceptanceDeadlineChange,
}: {
  startsAt: string;
  endsAt: string;
  acceptanceDeadline: string;
  onStartsAtChange: (value: string) => void;
  onEndsAtChange: (value: string) => void;
  onAcceptanceDeadlineChange: (value: string) => void;
}) {
  const startParts = splitLocal(startsAt);
  const endParts = splitLocal(endsAt);

  const [date, setDate] = useState(startParts.date || todayLocalDate());
  const [startTime, setStartTime] = useState(startParts.time || '');
  const [endTime, setEndTime] = useState(endParts.time || '');
  const [endDate, setEndDate] = useState(endParts.date || startParts.date || todayLocalDate());
  const [deadlineMode, setDeadlineMode] = useState<string>(() => {
    if (!acceptanceDeadline || !startsAt) return 'none';
    for (const preset of DEADLINE_PRESETS) {
      if (preset.hoursBefore == null) continue;
      const expected = subtractHoursFromLocal(
        startParts.date,
        startParts.time,
        preset.hoursBefore,
      );
      if (expected && expected === acceptanceDeadline) return preset.id;
    }
    return 'custom';
  });

  const hours = useMemo(
    () => durationHours(date, startTime, endDate, endTime),
    [date, startTime, endDate, endTime],
  );

  const activePattern = useMemo(() => {
    if (!date || !startTime || hours == null) return undefined;
    return SHIFT_PATTERNS.find((p) => {
      if (startTime !== p.start || hours !== p.hours) return false;
      const expected = addHoursToLocal(date, p.start, p.hours);
      return endDate === expected.date && endTime === expected.time;
    });
  }, [date, startTime, endDate, endTime, hours]);

  function syncStart(
    nextDate: string,
    nextStart: string,
    nextEndDate?: string,
    nextEndTime?: string,
  ) {
    const resolvedEndDate = nextEndDate ?? endDate;
    const resolvedEndTime = nextEndTime ?? endTime;
    setDate(nextDate);
    setStartTime(nextStart);
    onStartsAtChange(joinLocal(nextDate, nextStart));
    if (resolvedEndTime) {
      setEndDate(resolvedEndDate);
      setEndTime(resolvedEndTime);
      onEndsAtChange(joinLocal(resolvedEndDate, resolvedEndTime));
    }
    if (deadlineMode !== 'none' && deadlineMode !== 'custom' && nextStart) {
      const preset = DEADLINE_PRESETS.find((p) => p.id === deadlineMode);
      if (preset?.hoursBefore != null) {
        onAcceptanceDeadlineChange(
          subtractHoursFromLocal(nextDate, nextStart, preset.hoursBefore),
        );
      }
    }
  }

  function applyPattern(pattern: (typeof SHIFT_PATTERNS)[number]) {
    const nextDate = date || todayLocalDate();
    const nextEnd = addHoursToLocal(nextDate, pattern.start, pattern.hours);
    syncStart(nextDate, pattern.start, nextEnd.date, nextEnd.time);
  }

  function applyDuration(hoursToAdd: number) {
    if (!date || !startTime) return;
    const next = addHoursToLocal(date, startTime, hoursToAdd);
    setEndDate(next.date);
    setEndTime(next.time);
    onEndsAtChange(joinLocal(next.date, next.time));
  }

  function nudgeDuration(deltaMinutes: number) {
    if (!date || !startTime) return;
    const current = hours != null ? Math.round(hours * 60) : 8 * 60;
    const nextMinutes = Math.min(24 * 60, Math.max(30, current + deltaMinutes));
    const next = addMinutesToLocal(date, startTime, nextMinutes);
    setEndDate(next.date);
    setEndTime(next.time);
    onEndsAtChange(joinLocal(next.date, next.time));
  }

  function applyDeadlinePreset(id: string) {
    setDeadlineMode(id);
    const preset = DEADLINE_PRESETS.find((p) => p.id === id);
    if (!preset || preset.hoursBefore == null) {
      onAcceptanceDeadlineChange('');
      return;
    }
    if (!date || !startTime) return;
    onAcceptanceDeadlineChange(subtractHoursFromLocal(date, startTime, preset.hoursBefore));
  }

  function onDatePick(nextDate: string) {
    const overnight = Boolean(date && endDate && endDate !== date);
    const nextEndDate = overnight
      ? format(addDays(parseISO(`${nextDate}T12:00:00`), 1), 'yyyy-MM-dd')
      : nextDate;
    syncStart(nextDate, startTime, nextEndDate, endTime);
  }

  return (
    <div className="space-y-5 sm:col-span-2">
      <input type="hidden" name="startsAt" value={startsAt} />
      <input type="hidden" name="endsAt" value={endsAt} />
      <input type="hidden" name="acceptanceDeadline" value={acceptanceDeadline} />

      <div className="space-y-2">
        <Label>
          Shift date <span className="text-bh-danger">*</span>
        </Label>
        <ShiftDateCalendar value={date} onChange={onDatePick} />
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-sm font-bold text-[#071d30]">Working pattern</p>
            <p className="mt-0.5 text-xs text-bh-text-muted">
              Pick a common ward schedule. You can still adjust the times below.
            </p>
          </div>
          {activePattern ? (
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-white',
                PATTERN_THEME[activePattern.id].gradient,
              )}
            >
              <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
              {activePattern.label} · {activePattern.detail}
            </span>
          ) : (
            <span className="rounded-full bg-bh-subtle px-2.5 py-1 text-[11px] font-semibold text-bh-text-muted">
              Custom times
            </span>
          )}
        </div>
        <div
          role="radiogroup"
          aria-label="Working pattern"
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
        >
          {SHIFT_PATTERNS.map((pattern) => {
            const selected = activePattern?.id === pattern.id;
            const theme = PATTERN_THEME[pattern.id];
            const PatternIcon = theme.icon;
            return (
              <button
                key={pattern.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => applyPattern(pattern)}
                className={cn(
                  'group relative flex items-center gap-3 overflow-hidden rounded-2xl border-2 px-3.5 py-3.5 text-left transition-[background-color,box-shadow,transform,border-color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bh-teal focus-visible:ring-offset-2 motion-reduce:transition-none motion-reduce:hover:translate-y-0',
                  selected
                    ? cn('-translate-y-0.5 border-transparent text-white', theme.gradient, theme.glow)
                    : cn('hover:-translate-y-0.5', theme.idle, theme.idleHover),
                )}
              >
                {!selected ? (
                  <span aria-hidden className={cn('absolute inset-x-0 top-0 h-1', theme.bar)} />
                ) : (
                  <span
                    aria-hidden
                    className="pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full bg-white/15 blur-xl"
                  />
                )}
                <span
                  className={cn(
                    'relative grid h-11 w-11 shrink-0 place-items-center rounded-xl transition-transform duration-200 group-hover:scale-105 motion-reduce:transition-none',
                    selected
                      ? 'bg-white text-[#071d30] shadow-[0_8px_16px_rgba(0,0,0,0.2)]'
                      : cn('text-white shadow-[0_8px_16px_rgba(7,29,48,0.2)]', theme.gradient),
                  )}
                >
                  <PatternIcon className="h-5 w-5" strokeWidth={2.3} aria-hidden />
                </span>
                <span className="relative min-w-0 flex-1">
                  <span
                    className={cn(
                      'block text-[15px] font-bold tracking-tight',
                      selected ? 'text-white' : 'text-[#071d30]',
                    )}
                  >
                    {pattern.label}
                  </span>
                  <span
                    className={cn(
                      'bh-tabular mt-0.5 block text-xs font-semibold',
                      selected ? 'text-white/90' : 'text-bh-text-secondary',
                    )}
                  >
                    {pattern.detail}
                  </span>
                </span>
                <span
                  className={cn(
                    'relative shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold',
                    selected ? 'bg-white/20 text-white' : theme.chip,
                  )}
                >
                  {pattern.hours}h
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {(() => {
        const startMin = (() => {
          const [h, m] = startTime.split(':').map(Number);
          return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null;
        })();
        const durMin = hours != null ? Math.min(24 * 60, Math.round(hours * 60)) : 0;
        const first =
          startMin != null && durMin > 0
            ? { left: startMin / 1440, width: Math.min(durMin, 1440 - startMin) / 1440 }
            : null;
        const wrap =
          startMin != null && durMin > 1440 - startMin
            ? { left: 0, width: (durMin - (1440 - startMin)) / 1440 }
            : null;
        const overnight = Boolean(date && endDate && endDate !== date);
        const timeInputClass =
          'bh-tabular h-14 rounded-xl border-2 border-[#16384f]/15 bg-white text-center text-2xl font-bold text-[#071d30] shadow-[0_6px_16px_rgba(7,29,48,0.06)] focus-visible:border-bh-teal focus-visible:ring-bh-teal/25';
        return (
          <div className="overflow-hidden rounded-2xl border border-[#16384f]/12 bg-white shadow-[0_10px_28px_rgba(7,29,48,0.07)]">
            <div className="flex flex-wrap items-center justify-between gap-2 bg-[#071d30] px-4 py-3 text-white">
              <p className="inline-flex items-center gap-2 text-sm font-bold">
                <CalendarClock className="h-4 w-4 text-[#e4b334]" aria-hidden />
                Shift hours
              </p>
              <span
                className={cn(
                  'bh-tabular inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold',
                  hours != null ? 'bg-[#e4b334] text-[#071d30]' : 'bg-white/15 text-white/80',
                )}
                aria-live="polite"
              >
                {hours != null ? formatDuration(hours) : 'Set start and end'}
                {overnight ? (
                  <span className="rounded-full bg-[#071d30]/85 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-[#5ec8ff]">
                    Overnight
                  </span>
                ) : null}
              </span>
            </div>

            <div className="space-y-4 p-4 sm:p-5">
              <div className="grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
                <div className="space-y-1.5">
                  <Label htmlFor="startTime" className="inline-flex items-center gap-1.5 font-bold text-[#071d30]">
                    <Sunrise className="h-3.5 w-3.5 text-amber-600" aria-hidden />
                    Starts <span className="text-bh-danger">*</span>
                  </Label>
                  <Input
                    id="startTime"
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => {
                      const nextStart = e.target.value;
                      if (!endTime && nextStart) {
                        const nextEnd = addHoursToLocal(date || todayLocalDate(), nextStart, 8);
                        syncStart(date || todayLocalDate(), nextStart, nextEnd.date, nextEnd.time);
                      } else {
                        syncStart(date || todayLocalDate(), nextStart);
                      }
                    }}
                    className={timeInputClass}
                  />
                </div>
                <span
                  aria-hidden
                  className="mx-auto hidden h-10 w-10 place-items-center rounded-full bg-bh-subtle text-bh-text-muted ring-1 ring-bh-border sm:grid"
                >
                  <ArrowRight className="h-4 w-4" />
                </span>
                <div className="space-y-1.5">
                  <Label htmlFor="endTime" className="inline-flex items-center gap-1.5 font-bold text-[#071d30]">
                    <Moon className="h-3.5 w-3.5 text-indigo-600" aria-hidden />
                    Ends <span className="text-bh-danger">*</span>
                  </Label>
                  <Input
                    id="endTime"
                    type="time"
                    required
                    value={endTime}
                    onChange={(e) => {
                      const nextEndTime = e.target.value;
                      let nextEndDate = endDate || date;
                      if (date && startTime && nextEndTime && nextEndTime < startTime) {
                        nextEndDate = addHoursToLocal(date, '00:00', 24).date;
                      } else if (date && startTime && nextEndTime && nextEndTime >= startTime) {
                        nextEndDate = date;
                      }
                      setEndDate(nextEndDate);
                      setEndTime(nextEndTime);
                      onEndsAtChange(joinLocal(nextEndDate, nextEndTime));
                    }}
                    className={timeInputClass}
                  />
                </div>
              </div>

              <div aria-hidden>
                <div className="relative h-3.5 overflow-hidden rounded-full bg-[#16384f]/10">
                  {[25, 50, 75].map((pct) => (
                    <span
                      key={pct}
                      className="absolute top-0 h-full w-px bg-white/80"
                      style={{ left: `${pct}%` }}
                    />
                  ))}
                  {first ? (
                    <span
                      className="absolute top-0 h-full rounded-full bg-[linear-gradient(90deg,#f59e0b,#e4b334,#312e81)] shadow-[0_0_12px_rgba(228,179,52,0.6)] transition-[left,width] duration-300 motion-reduce:transition-none"
                      style={{ left: `${first.left * 100}%`, width: `${first.width * 100}%` }}
                    />
                  ) : null}
                  {wrap ? (
                    <span
                      className="absolute top-0 h-full rounded-full bg-[linear-gradient(90deg,#312e81,#4f46e5)] transition-[width] duration-300 motion-reduce:transition-none"
                      style={{ left: `${wrap.left * 100}%`, width: `${wrap.width * 100}%` }}
                    />
                  ) : null}
                </div>
                <div className="bh-tabular mt-1 flex justify-between text-[10px] font-semibold text-bh-text-muted">
                  <span>00:00</span>
                  <span>06:00</span>
                  <span>12:00</span>
                  <span>18:00</span>
                  <span>24:00</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-3 border-t border-[#16384f]/10 pt-4">
                <div className="flex items-center gap-1 rounded-2xl bg-[#071d30] p-1 text-white shadow-[0_8px_18px_rgba(7,29,48,0.25)]">
                  <button
                    type="button"
                    aria-label="Shorten shift by 30 minutes"
                    disabled={!startTime}
                    onClick={() => nudgeDuration(-30)}
                    className="grid h-9 w-9 place-items-center rounded-xl transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e4b334] disabled:opacity-40"
                  >
                    <Minus className="h-4 w-4" aria-hidden />
                  </button>
                  <span className="bh-tabular min-w-[5.5rem] text-center text-sm font-bold">
                    {hours != null ? formatDuration(hours) : '— h'}
                  </span>
                  <button
                    type="button"
                    aria-label="Lengthen shift by 30 minutes"
                    disabled={!startTime}
                    onClick={() => nudgeDuration(30)}
                    className="grid h-9 w-9 place-items-center rounded-xl bg-[#e4b334] text-[#071d30] transition-colors hover:bg-[#f0c34d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-40"
                  >
                    <Plus className="h-4 w-4" aria-hidden />
                  </button>
                </div>
                <div role="group" aria-label="Shift duration" className="flex flex-wrap items-center gap-1.5">
                  <span className="mr-1 text-[11px] font-semibold uppercase tracking-wider text-bh-text-muted">
                    Length
                  </span>
                  {DURATION_PRESETS.map((preset) => {
                    const selected = hours === preset;
                    return (
                      <button
                        key={preset}
                        type="button"
                        aria-pressed={selected}
                        disabled={!startTime}
                        onClick={() => applyDuration(preset)}
                        className={cn(
                          'h-8 min-w-11 rounded-full px-3 text-xs font-bold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bh-teal disabled:opacity-40 motion-reduce:transition-none',
                          selected
                            ? 'bg-[#071d30] text-white shadow-[0_6px_14px_rgba(7,29,48,0.25)]'
                            : 'bg-white text-[#071d30] ring-1 ring-[#16384f]/15 hover:-translate-y-0.5 hover:ring-bh-teal motion-reduce:hover:translate-y-0',
                        )}
                      >
                        {preset}h
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      <div className="space-y-3 rounded-2xl border border-[#16384f]/12 bg-white p-4 shadow-[0_10px_28px_rgba(7,29,48,0.07)] sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-bold text-[#071d30]">Claim deadline</p>
            <p className="text-xs text-bh-text-muted">Last moment workers can claim this shift.</p>
          </div>
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold',
              acceptanceDeadline
                ? 'bg-[#fff3cf] text-[#7a5600] ring-1 ring-[#e4b334]/60'
                : 'bg-bh-subtle text-bh-text-muted',
            )}
            aria-live="polite"
          >
            {acceptanceDeadline ? (
              <>
                <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
                {(() => {
                  try {
                    return format(parseISO(acceptanceDeadline), 'EEE d MMM, HH:mm');
                  } catch {
                    return acceptanceDeadline;
                  }
                })()}
              </>
            ) : deadlineMode !== 'none' && !startTime ? (
              'Set a start time first'
            ) : (
              'No deadline set'
            )}
          </span>
        </div>
        <div role="radiogroup" aria-label="Claim deadline" className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {DEADLINE_PRESETS.map((preset) => {
            const selected = deadlineMode === preset.id;
            const PresetIcon = preset.icon;
            return (
              <button
                key={preset.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => applyDeadlinePreset(preset.id)}
                className={cn(
                  'group flex items-center gap-2.5 rounded-2xl border-2 px-3 py-2.5 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bh-teal focus-visible:ring-offset-1 motion-reduce:transition-none',
                  selected
                    ? '-translate-y-0.5 border-transparent bg-[#071d30] text-white shadow-[0_12px_24px_rgba(7,29,48,0.28)]'
                    : 'border-[#16384f]/12 bg-white hover:-translate-y-0.5 hover:border-bh-teal/50 hover:shadow-[0_10px_22px_rgba(7,29,48,0.08)] motion-reduce:hover:translate-y-0',
                )}
              >
                <span
                  className={cn(
                    'grid h-8 w-8 shrink-0 place-items-center rounded-lg',
                    selected ? 'bg-[#e4b334] text-[#071d30]' : 'bg-bh-teal-soft text-bh-teal-strong',
                  )}
                >
                  <PresetIcon className="h-4 w-4" strokeWidth={2.3} aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-bold leading-tight">{preset.label}</span>
                  <span
                    className={cn(
                      'block text-[11px] leading-tight',
                      selected ? 'text-white/70' : 'text-bh-text-muted',
                    )}
                  >
                    {preset.hint}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
