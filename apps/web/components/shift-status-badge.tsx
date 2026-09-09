import { Badge } from '@/components/ui/badge';
import { shiftStatusLabel } from '@/lib/format';

const VARIANT: Record<
  string,
  'default' | 'success' | 'warning' | 'danger' | 'muted'
> = {
  draft: 'muted',
  published: 'warning',
  filled: 'default',
  in_progress: 'default',
  awaiting_approval: 'warning',
  completed: 'success',
  cancelled: 'danger',
  disputed: 'danger',
};

export function ShiftStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={VARIANT[status] ?? 'muted'}>{shiftStatusLabel(status)}</Badge>
  );
}
