"use client";

import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import type { MarketingLocale } from "@/lib/marketing-i18n/locales";

/* ----------------------------- civil-date helpers ----------------------------- */
/* Everything works on plain Y/M/D (no time zones), so a picked day is never shifted. */

type Ymd = { y: number; m: number; d: number }; // m is 1-12

const pad = (n: number) => String(n).padStart(2, "0");
const toYmd = (v: Ymd) => `${v.y}-${pad(v.m)}-${pad(v.d)}`;

function parseYmd(value: string | null | undefined): Ymd | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? "");
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  const probe = new Date(Date.UTC(y, m - 1, d));
  if (
    probe.getUTCFullYear() !== y ||
    probe.getUTCMonth() !== m - 1 ||
    probe.getUTCDate() !== d
  ) {
    return null;
  }
  return { y, m, d };
}

const fromDate = (t: Date): Ymd => ({
  y: t.getUTCFullYear(),
  m: t.getUTCMonth() + 1,
  d: t.getUTCDate(),
});

const addDays = (v: Ymd, n: number): Ymd =>
  fromDate(new Date(Date.UTC(v.y, v.m - 1, v.d + n)));

function addMonths(v: Ymd, n: number): Ymd {
  const first = new Date(Date.UTC(v.y, v.m - 1 + n, 1));
  const daysInMonth = new Date(
    Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0),
  ).getUTCDate();
  return {
    y: first.getUTCFullYear(),
    m: first.getUTCMonth() + 1,
    d: Math.min(v.d, daysInMonth),
  };
}

const compare = (a: Ymd, b: Ymd) => {
  const x = toYmd(a);
  const y = toYmd(b);
  return x < y ? -1 : x > y ? 1 : 0;
};

/** Monday = 0 … Sunday = 6. */
const mondayIndex = (v: Ymd) =>
  (new Date(Date.UTC(v.y, v.m - 1, v.d)).getUTCDay() + 6) % 7;

function todayInCyprus(): Ymd {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Nicosia",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return parseYmd(parts) ?? fromDate(new Date());
}

const INTL_LOCALE: Record<MarketingLocale, string> = {
  en: "en-GB",
  el: "el-GR",
};

/* --------------------------------- component --------------------------------- */

export type PremiumDatePickerProps = {
  id?: string;
  /** `YYYY-MM-DD` or empty. */
  value: string;
  onChange: (value: string) => void;
  locale: MarketingLocale;
  /** Earliest selectable day, `YYYY-MM-DD`. */
  min?: string;
  /** Latest selectable day, `YYYY-MM-DD`. */
  max?: string;
  invalid?: boolean;
  describedBy?: string;
  labels: {
    placeholder: string;
    today: string;
    clear: string;
    previousMonth: string;
    nextMonth: string;
    chooseYear: string;
    dialog: string;
  };
};

type View = "days" | "years";

export function PremiumDatePicker({
  id,
  value,
  onChange,
  locale,
  min,
  max,
  invalid,
  describedBy,
  labels,
}: PremiumDatePickerProps) {
  const autoId = useId();
  const triggerId = id ?? `${autoId}-trigger`;
  const dialogId = `${autoId}-dialog`;
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{
    top: number;
    left: number;
    width: number;
    above: boolean;
  } | null>(null);

  const intl = INTL_LOCALE[locale];
  const selected = parseYmd(value);
  const minYmd = parseYmd(min);
  const maxYmd = parseYmd(max);
  const today = useMemo(() => todayInCyprus(), []);

  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("days");
  const [cursor, setCursor] = useState<Ymd>(selected ?? today); // month on screen
  const [focused, setFocused] = useState<Ymd>(selected ?? today); // roving focus day
  const [yearPage, setYearPage] = useState(today.y);

  const isDisabled = (v: Ymd) =>
    (minYmd !== null && compare(v, minYmd) < 0) ||
    (maxYmd !== null && compare(v, maxYmd) > 0);

  const clamp = (v: Ymd): Ymd => {
    if (minYmd && compare(v, minYmd) < 0) return minYmd;
    if (maxYmd && compare(v, maxYmd) > 0) return maxYmd;
    return v;
  };

  const fmt = useMemo(
    () => ({
      full: new Intl.DateTimeFormat(intl, {
        timeZone: "UTC",
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
      month: new Intl.DateTimeFormat(intl, {
        timeZone: "UTC",
        month: "long",
        year: "numeric",
      }),
      weekday: new Intl.DateTimeFormat(intl, {
        timeZone: "UTC",
        weekday: "short",
      }),
      weekdayLong: new Intl.DateTimeFormat(intl, {
        timeZone: "UTC",
        weekday: "long",
      }),
    }),
    [intl],
  );
  const utc = (v: Ymd) => new Date(Date.UTC(v.y, v.m - 1, v.d));

  // 2024-01-01 is a Monday: build Monday-first weekday headings in the active language.
  const weekdays = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const day = new Date(Date.UTC(2024, 0, 1 + i));
        return {
          short: fmt.weekday.format(day),
          long: fmt.weekdayLong.format(day),
        };
      }),
    [fmt],
  );

  // 6 full weeks so the popover height never jumps between months.
  const cells = useMemo(() => {
    const first: Ymd = { y: cursor.y, m: cursor.m, d: 1 };
    const start = addDays(first, -mondayIndex(first));
    return Array.from({ length: 42 }, (_, i) => addDays(start, i));
  }, [cursor.y, cursor.m]);

  function openPicker() {
    const start = clamp(selected ?? today);
    setCursor(start);
    setFocused(start);
    setYearPage(start.y);
    setView("days");
    setOpen(true);
  }

  function close(returnFocus = true) {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  }

  function pick(v: Ymd) {
    if (isDisabled(v)) return;
    onChange(toYmd(v));
    close();
  }

  // The popover is portaled out of the page layout (which clips overflow) and
  // positioned against the trigger; it flips above when there is no room below.
  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    function place() {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const margin = 10;
      const width = Math.min(336, window.innerWidth - margin * 2);
      const height = popRef.current?.offsetHeight ?? 420;
      const spaceBelow = window.innerHeight - rect.bottom - margin;
      const spaceAbove = rect.top - margin;
      const above = spaceBelow < height + 8 && spaceAbove > spaceBelow;
      const left = Math.max(
        margin,
        Math.min(rect.left, window.innerWidth - width - margin),
      );
      const top = above
        ? Math.max(margin, rect.top - height - 8)
        : rect.bottom + 8;
      setPos({ top, left, width, above });
    }
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, view, cursor.y, cursor.m]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node;
      if (
        !rootRef.current?.contains(target) &&
        !popRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  // Move real focus to the roving day whenever it changes.
  useEffect(() => {
    if (!open || view !== "days") return;
    gridRef.current
      ?.querySelector<HTMLButtonElement>('[data-focus="true"]')
      ?.focus({ preventScroll: true });
  }, [open, view, focused, cursor.y, cursor.m]);

  function moveFocus(next: Ymd) {
    const target = clamp(next);
    setFocused(target);
    if (target.y !== cursor.y || target.m !== cursor.m) setCursor(target);
  }

  function onGridKeyDown(e: React.KeyboardEvent) {
    let next: Ymd | null = null;
    switch (e.key) {
      case "ArrowLeft":
        next = addDays(focused, -1);
        break;
      case "ArrowRight":
        next = addDays(focused, 1);
        break;
      case "ArrowUp":
        next = addDays(focused, -7);
        break;
      case "ArrowDown":
        next = addDays(focused, 7);
        break;
      case "PageUp":
        next = addMonths(focused, e.shiftKey ? -12 : -1);
        break;
      case "PageDown":
        next = addMonths(focused, e.shiftKey ? 12 : 1);
        break;
      case "Home":
        next = addDays(focused, -mondayIndex(focused));
        break;
      case "End":
        next = addDays(focused, 6 - mondayIndex(focused));
        break;
      default:
        return;
    }
    e.preventDefault();
    moveFocus(next);
  }

  const prevMonth = addMonths({ ...cursor, d: 1 }, -1);
  const nextMonth = addMonths({ ...cursor, d: 1 }, 1);
  // Can step back only if the previous month still has a selectable day.
  const lastDayOfPrevMonth = addDays({ ...cursor, d: 1 }, -1);
  const canGoPrev = !minYmd || compare(lastDayOfPrevMonth, minYmd) >= 0;
  const canGoNext = !maxYmd || compare({ ...nextMonth, d: 1 }, maxYmd) <= 0;

  const minYear = minYmd?.y ?? 1900;
  const maxYear = maxYmd?.y ?? 2200;
  const years = Array.from({ length: 12 }, (_, i) => yearPage - 4 + i).filter(
    (y) => y >= minYear && y <= maxYear,
  );

  return (
    <div
      ref={rootRef}
      className={`m-cal${open ? " is-open" : ""}${invalid ? " has-error" : ""}`}
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) {
          e.stopPropagation();
          close();
        }
      }}
    >
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        className={`m-cal-trigger${selected ? " has-value" : ""}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? dialogId : undefined}
        aria-describedby={describedBy}
        onClick={() => (open ? close(false) : openPicker())}
      >
        <CalendarDays size={18} strokeWidth={2.1} aria-hidden="true" />
        <span className="m-cal-trigger-text">
          {selected ? fmt.full.format(utc(selected)) : labels.placeholder}
        </span>
        <ChevronDown
          className="m-cal-trigger-chevron"
          size={16}
          strokeWidth={2.4}
          aria-hidden="true"
        />
      </button>

      {open
        ? createPortal(
            <div
              ref={popRef}
              id={dialogId}
              role="dialog"
              aria-label={labels.dialog}
              className={`m-cal-pop${pos?.above ? " is-above" : ""}`}
              style={
                pos
                  ? { top: pos.top, left: pos.left, width: pos.width }
                  : { visibility: "hidden" }
              }
            >
              <div className="m-cal-head">
                <button
                  type="button"
                  className="m-cal-nav"
                  aria-label={labels.previousMonth}
                  disabled={view !== "days" || !canGoPrev}
                  onClick={() => {
                    setCursor(prevMonth);
                    setFocused(
                      clamp({ ...prevMonth, d: Math.min(focused.d, 28) }),
                    );
                  }}
                >
                  <ChevronLeft size={18} strokeWidth={2.4} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="m-cal-title"
                  aria-label={labels.chooseYear}
                  aria-expanded={view === "years"}
                  onClick={() => {
                    setYearPage(cursor.y);
                    setView(view === "days" ? "years" : "days");
                  }}
                >
                  {fmt.month.format(utc({ ...cursor, d: 1 }))}
                  <ChevronDown
                    className={view === "years" ? "is-flipped" : undefined}
                    size={14}
                    strokeWidth={2.6}
                    aria-hidden="true"
                  />
                </button>
                <button
                  type="button"
                  className="m-cal-nav"
                  aria-label={labels.nextMonth}
                  disabled={view !== "days" || !canGoNext}
                  onClick={() => {
                    setCursor(nextMonth);
                    setFocused(
                      clamp({ ...nextMonth, d: Math.min(focused.d, 28) }),
                    );
                  }}
                >
                  <ChevronRight
                    size={18}
                    strokeWidth={2.4}
                    aria-hidden="true"
                  />
                </button>
              </div>

              {view === "days" ? (
                <div
                  ref={gridRef}
                  role="group"
                  aria-label={fmt.month.format(utc({ ...cursor, d: 1 }))}
                  className="m-cal-grid"
                  onKeyDown={onGridKeyDown}
                >
                  <div className="m-cal-weekdays" aria-hidden="true">
                    {weekdays.map((w) => (
                      <span key={w.long}>{w.short}</span>
                    ))}
                  </div>
                  <div className="m-cal-days">
                    {cells.map((cell) => {
                      const outside = cell.m !== cursor.m;
                      const disabled = isDisabled(cell);
                      const isSelected =
                        selected !== null && compare(cell, selected) === 0;
                      const isToday = compare(cell, today) === 0;
                      const isFocus = compare(cell, focused) === 0;
                      return (
                        <button
                          key={toYmd(cell)}
                          type="button"
                          className={[
                            "m-cal-day",
                            outside ? "is-outside" : "",
                            isSelected ? "is-selected" : "",
                            isToday ? "is-today" : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          disabled={disabled}
                          tabIndex={isFocus ? 0 : -1}
                          data-focus={isFocus ? "true" : undefined}
                          aria-label={fmt.full.format(utc(cell))}
                          aria-pressed={isSelected}
                          aria-current={isToday ? "date" : undefined}
                          onClick={() => pick(cell)}
                        >
                          {cell.d}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div
                  className="m-cal-years"
                  role="listbox"
                  aria-label={labels.chooseYear}
                >
                  <div className="m-cal-years-pager">
                    <button
                      type="button"
                      className="m-cal-nav"
                      aria-label={labels.previousMonth}
                      disabled={yearPage - 12 + 7 < minYear}
                      onClick={() => setYearPage((p) => p - 12)}
                    >
                      <ChevronLeft
                        size={16}
                        strokeWidth={2.4}
                        aria-hidden="true"
                      />
                    </button>
                    <span>
                      {years[0]} – {years[years.length - 1]}
                    </span>
                    <button
                      type="button"
                      className="m-cal-nav"
                      aria-label={labels.nextMonth}
                      disabled={yearPage + 12 - 4 > maxYear}
                      onClick={() => setYearPage((p) => p + 12)}
                    >
                      <ChevronRight
                        size={16}
                        strokeWidth={2.4}
                        aria-hidden="true"
                      />
                    </button>
                  </div>
                  <div className="m-cal-years-grid">
                    {years.map((y) => (
                      <button
                        key={y}
                        type="button"
                        role="option"
                        aria-selected={y === cursor.y}
                        className={`m-cal-year${y === cursor.y ? " is-selected" : ""}${
                          y === today.y ? " is-today" : ""
                        }`}
                        onClick={() => {
                          const next = clamp({ y, m: cursor.m, d: 1 });
                          setCursor(next);
                          setFocused(next);
                          setView("days");
                        }}
                      >
                        {y}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="m-cal-foot">
                <button
                  type="button"
                  className="m-cal-link"
                  disabled={!value}
                  onClick={() => {
                    onChange("");
                    close();
                  }}
                >
                  {labels.clear}
                </button>
                <button
                  type="button"
                  className="m-cal-link m-cal-link--accent"
                  disabled={isDisabled(today)}
                  onClick={() => pick(today)}
                >
                  {labels.today}
                </button>
              </div>
            </div>,
            rootRef.current?.closest(".marketing") ?? document.body,
          )
        : null}
    </div>
  );
}
