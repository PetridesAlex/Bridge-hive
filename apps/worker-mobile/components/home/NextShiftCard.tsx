import { useRouter } from 'expo-router';
import React from 'react';

import {
  ShiftSummaryCard,
  SUMMARY_PILLS,
  type SummaryPill,
} from '@/components/shifts/ShiftSummaryCard';
import { WORKER_ROLE_LABELS } from '@/constants/config';
import type { WorkerShiftDetails } from '@/lib/rpcs';
import { formatDayLabel, isoDateFromTimestamp } from '@/utils/format';

type Props = {
  shift: WorkerShiftDetails;
  assignmentStatus?: string;
};

const STATUS_LABELS: Record<string, string> = {
  accepted: 'Accepted',
  checked_in: 'Checked in',
  checked_out: 'Checked out',
  submitted: 'Timesheet submitted',
  approved: 'Approved',
  rejected: 'Rejected',
};

function statusPill(status?: string): SummaryPill | undefined {
  if (!status) return undefined;
  const label = STATUS_LABELS[status] ?? status.replace(/_/g, ' ');
  switch (status) {
    case 'checked_in':
      return { label, ...SUMMARY_PILLS.live };
    case 'accepted':
      return { label, ...SUMMARY_PILLS.accepted };
    case 'approved':
      return { label, ...SUMMARY_PILLS.success };
    case 'rejected':
      return { label, ...SUMMARY_PILLS.danger };
    case 'checked_out':
    case 'submitted':
      return { label, ...SUMMARY_PILLS.warning };
    default:
      return { label, ...SUMMARY_PILLS.neutral };
  }
}

export function NextShiftCard({ shift, assignmentStatus }: Props) {
  const router = useRouter();
  const roleLabel =
    WORKER_ROLE_LABELS[shift.required_role as keyof typeof WORKER_ROLE_LABELS] ??
    shift.required_role;
  const title = shift.title?.trim() || roleLabel;
  const location =
    [shift.location_name, shift.ward_name].filter(Boolean).join(' · ') || 'Location not listed';
  const day = formatDayLabel(isoDateFromTimestamp(shift.starts_at));

  return (
    <ShiftSummaryCard
      density="compact"
      eyebrow="Next shift"
      pill={statusPill(assignmentStatus)}
      title={title}
      org={shift.organization_name}
      startsAt={shift.starts_at}
      endsAt={shift.ends_at}
      breakMinutes={shift.break_minutes}
      location={location}
      rateMinor={shift.rate_minor}
      currency={shift.currency}
      onPress={() => router.push(`/shifts/${shift.shift_id}`)}
      accessibilityLabel={`View next shift: ${title} at ${shift.organization_name}, ${day}`}
    />
  );
}
