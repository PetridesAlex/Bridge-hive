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
import { ChevronLeft, ChevronRight } from 'lucide-react';
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

const DURATION_PRESETS = [8, 10, 12] as const;

const DEADLINE_PRESETS = [
  { id: 'none', label: 'None', hoursBefore: null },
  { id: '4h', label: '4h before', hoursBefore: 4 },
  { id: '12h', label: '12h before', hoursBefore: 12 },
  { id: '24h', label: '1 day before', hoursBefore: 24 },
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

      <div className="space-y-2.5">
        <div>
          <p className="text-sm font-semibold text-bh-text">Working pattern</p>
          <p className="mt-0.5 text-xs text-bh-text-muted">
            Common ward schedules — adjust times below if needed.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {SHIFT_PATTERNS.map((pattern) => {
            const selected = activePattern?.id === pattern.id;
            return (
              <button
                key={pattern.id}
                type="button"
                onClick={() => applyPattern(pattern)}
                className={cn(
                  'rounded-2xl border px-3.5 py-3 text-left transition-[border-color,background-color,box-shadow]',
                  selected
                    ? 'border-bh-teal bg-bh-teal-soft/70 shadow-sm ring-1 ring-bh-teal/25'
                    : 'border-bh-border bg-bh-surface hover:border-bh-border-strong hover:bg-bh-subtle/50',
                )}
              >
                <span className="block text-sm font-semibold text-bh-text">{pattern.label}</span>
                <span className="bh-tabular mt-0.5 block text-xs font-medium text-bh-text-secondary">
                  {pattern.detail}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="startTime">
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
            className={fieldClass}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="endTime">
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
            className={fieldClass}
          />
        </div>
      </div>

      <div className="space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-bh-text">Duration</p>
          {hours != null ? (
            <p className="bh-tabular text-xs font-semibold text-bh-teal-strong">
              {hours}h total
              {endDate && date && endDate !== date ? ' · overnight' : ''}
            </p>
          ) : null}
        </div>
        <div
          role="group"
          aria-label="Shift duration"
          className="grid grid-cols-3 gap-1 rounded-2xl border border-bh-border bg-bh-subtle/50 p-1"
        >
          {DURATION_PRESETS.map((preset) => {
            const selected = hours === preset;
            return (
              <button
                key={preset}
                type="button"
                onClick={() => applyDuration(preset)}
                className={cn(
                  'rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors',
                  selected
                    ? 'bg-bh-sidebar text-white shadow-sm'
                    : 'text-bh-text-secondary hover:bg-bh-surface hover:text-bh-text',
                )}
              >
                {preset}h
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-semibold text-bh-text">Claim deadline</p>
        <div className="flex flex-wrap gap-1.5">
          {DEADLINE_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => applyDeadlinePreset(preset.id)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
                deadlineMode === preset.id
                  ? 'border-bh-teal bg-bh-teal-soft text-bh-teal-strong'
                  : 'border-bh-border bg-bh-surface text-bh-text-secondary hover:bg-bh-subtle',
              )}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
