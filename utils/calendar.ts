export type CalendarDayCell = {
  key: string;
  date: Date;
  iso: string;
  day: number;
  inMonth: boolean;
  isToday: boolean;
};

export function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

export function formatMonthYear(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    month: 'long',
    year: 'numeric',
  }).format(date);
}

/** Monday-first month grid (6 weeks × 7 days). */
export function buildMonthGrid(month: Date, today = new Date()): CalendarDayCell[] {
  const first = startOfMonth(month);
  const weekday = (first.getDay() + 6) % 7; // Mon=0 … Sun=6
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - weekday);

  const todayIso = toIsoDate(today);
  const cells: CalendarDayCell[] = [];

  for (let i = 0; i < 42; i += 1) {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + i);
    const iso = toIsoDate(date);
    cells.push({
      key: iso,
      date,
      iso,
      day: date.getDate(),
      inMonth: date.getMonth() === month.getMonth(),
      isToday: iso === todayIso,
    });
  }

  return cells;
}

export const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
