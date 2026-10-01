import { cn } from '@/lib/utils';
import { shiftStatusLabel } from '@/lib/format';

type StatusTone = {
  shell: string;
  dot: string;
  label: string;
};

/**
 * Status meaning uses label + dot + color — never color alone.
 * Soft pills tuned to the org shifts list screenshot.
 */
const TONE: Record<string, StatusTone> = {
  draft: {
    shell: 'bg-bh-subtle text-bh-text-secondary',
    dot: 'bg-bh-text-muted',
    label: 'Draft',
  },
  published: {
    shell: 'bg-bh-warning-soft text-bh-warning',
    dot: 'bg-bh-warning',
    label: 'Published',
  },
  filled: {
    shell: 'bg-bh-success-soft text-bh-success',
    dot: 'bg-bh-success',
    label: 'Filled',
  },
  in_progress: {
    shell: 'bg-bh-info-soft text-bh-info',
    dot: 'bg-bh-info',
    label: 'In progress',
  },
  awaiting_approval: {
    shell: 'bg-bh-honey-soft text-bh-sidebar',
    dot: 'bg-bh-honey',
    label: 'Awaiting approval',
  },
  completed: {
    shell: 'bg-bh-success-soft text-bh-success',
    dot: 'bg-bh-success',
    label: 'Completed',
  },
  cancelled: {
    shell: 'bg-bh-danger-soft text-bh-danger',
    dot: 'bg-bh-danger',
    label: 'Cancelled',
  },
  disputed: {
    shell: 'bg-bh-danger-soft text-bh-danger',
    dot: 'bg-bh-danger',
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
        'inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold leading-none tracking-wide',
        tone.shell,
        className,
      )}
      title={text}
    >
      <span
        className={cn('h-1.5 w-1.5 shrink-0 rounded-full', tone.dot)}
        aria-hidden
      />
      <span className="truncate">{text}</span>
    </span>
  );
}
