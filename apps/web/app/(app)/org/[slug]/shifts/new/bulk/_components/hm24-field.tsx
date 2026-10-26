'use client';

import { Select } from '@/components/ui/select';
import { cn } from '@/lib/utils';

const HOURS = Array.from({ length: 24 }, (_, i) =>
  String(i).padStart(2, '0'),
);

/** 5-minute steps cover typical shift schedules; odd values stay selectable. */
const MINUTE_STEPS = Array.from({ length: 12 }, (_, i) =>
  String(i * 5).padStart(2, '0'),
);

function parseHm(value: string): { hour: string; minute: string } {
  const match = /^(\d{2}):(\d{2})$/.exec(value.trim());
  if (!match) return { hour: '', minute: '' };
  return { hour: match[1]!, minute: match[2]! };
}

function minuteOptions(currentMinute: string): string[] {
  if (!currentMinute) return MINUTE_STEPS;
  if (MINUTE_STEPS.includes(currentMinute)) return MINUTE_STEPS;
  return [...MINUTE_STEPS, currentMinute].sort();
}

type Hm24FieldProps = {
  value: string;
  onChange: (hm: string) => void;
  'aria-label': string;
  className?: string;
  selectClassName?: string;
  invalid?: boolean;
  id?: string;
};

/** Compact 24-hour hour + minute selects (no locale AM/PM picker). */
export function Hm24Field({
  value,
  onChange,
  'aria-label': ariaLabel,
  className,
  selectClassName,
  invalid,
  id,
}: Hm24FieldProps) {
  const { hour, minute } = parseHm(value);
  const minutes = minuteOptions(minute);

  function commit(nextHour: string, nextMinute: string) {
    if (!nextHour || !nextMinute) {
      onChange('');
      return;
    }
    onChange(`${nextHour}:${nextMinute}`);
  }

  return (
    <div
      className={cn('flex min-w-0 items-center gap-0.5', className)}
      role="group"
      aria-label={ariaLabel}
    >
      <Select
        id={id}
        aria-label={`${ariaLabel} hour`}
        title="Hour (24-hour)"
        className={cn(selectClassName, invalid && 'border-bh-danger')}
        value={hour}
        onChange={(e) =>
          commit(e.target.value, minute || '00')
        }
      >
        <option value="" disabled>
          —
        </option>
        {HOURS.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </Select>
      <span className="shrink-0 text-xs font-semibold text-bh-text-muted" aria-hidden>
        :
      </span>
      <Select
        aria-label={`${ariaLabel} minute`}
        title="Minute"
        className={cn(selectClassName, invalid && 'border-bh-danger')}
        value={minute}
        onChange={(e) =>
          commit(hour || '00', e.target.value)
        }
      >
        <option value="" disabled>
          —
        </option>
        {minutes.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </Select>
    </div>
  );
}
