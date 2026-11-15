import { cn } from '@/lib/utils';
import { shiftStatusLabel } from '@/lib/format';

type StatusTone = {
  shell: string;
  dot: string;
  label: string;
  /** Pulses the dot for states that are still moving. */
  live?: boolean;
};

/**
 * Status meaning uses label + dot + color — never color alone.
 * Solid, high-contrast pills so the state reads at a glance.
 */
const TONE: Record<string, StatusTone> = {
  draft: {
    shell: 'bg-slate-600 text-white shadow-[0_4px_10px_rgba(71,85,105,0.35)]',
    dot: 'bg-white/80',
    label: 'Draft',
  },
  published: {
    shell: 'bg-[#f5a30a] text-[#2b1a00] shadow-[0_4px_12px_rgba(245,163,10,0.5)]',
    dot: 'bg-[#2b1a00]',
    label: 'Published',
    live: true,
  },
  filled: {
    shell: 'bg-emerald-600 text-white shadow-[0_4px_12px_rgba(5,150,105,0.45)]',
    dot: 'bg-white',
    label: 'Filled',
  },
  in_progress: {
    shell: 'bg-blue-600 text-white shadow-[0_4px_12px_rgba(37,99,235,0.45)]',
    dot: 'bg-white',
    label: 'In progress',
    live: true,
  },
  awaiting_approval: {
    shell: 'bg-orange-600 text-white shadow-[0_4px_12px_rgba(234,88,12,0.45)]',
    dot: 'bg-white',
    label: 'Awaiting approval',
    live: true,
  },
  completed: {
    shell: 'bg-green-700 text-white shadow-[0_4px_12px_rgba(21,128,61,0.45)]',
    dot: 'bg-white',
    label: 'Completed',
  },
  cancelled: {
    shell: 'bg-red-600 text-white shadow-[0_4px_12px_rgba(220,38,38,0.45)]',
    dot: 'bg-white',
    label: 'Cancelled',
  },
  disputed: {
    shell: 'bg-red-800 text-white shadow-[0_4px_12px_rgba(153,27,27,0.5)]',
    dot: 'bg-white',
    label: 'Disputed',
  },
};

const FALLBACK: StatusTone = {
  shell: 'bg-bh-subtle text-bh-text-secondary',
  dot: 'bg-bh-text-muted',
  label: '',
};

export function ShiftStatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const tone = TONE[status] ?? FALLBACK;
  const text = tone.label || shiftStatusLabel(status);

  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-bold leading-none tracking-wide',
        tone.shell,
        className,
      )}
      title={text}
    >
      <span className="relative flex h-2 w-2 shrink-0" aria-hidden>
        {tone.live ? (
          <span
            className={cn(
              'absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 motion-reduce:animate-none',
              tone.dot,
            )}
          />
        ) : null}
        <span className={cn('relative inline-flex h-2 w-2 rounded-full', tone.dot)} />
      </span>
      <span className="truncate">{text}</span>
    </span>
  );
}
