import { useRouter } from 'expo-router';
import React from 'react';

import { openPositionsLabel, remainingOpenPositions } from '@bridge-hive/domain';

import {
  ShiftSummaryCard,
  SUMMARY_PILLS,
  type SummaryPill,
  type SummaryRow,
} from '@/components/shifts/ShiftSummaryCard';
import { WORKER_ROLE_LABELS } from '@/constants/config';
import { colors, shiftStatusStyles } from '@/constants/theme';
import type { MarketplaceShift, Shift } from '@/lib/queries';
import { formatDayLabel, isoDateFromTimestamp } from '@/utils/format';

type Props = {
  shift: Shift | MarketplaceShift;
  organizationName?: string;
  locationName?: string;
  onPress?: () => void;
};

/** Marketplace shift — same premium summary card used on Home and My shifts. */
export function ShiftCard({ shift, organizationName, locationName, onPress }: Props) {
  const router = useRouter();
  const roleLabel =
    WORKER_ROLE_LABELS[shift.required_role as keyof typeof WORKER_ROLE_LABELS] ??
    shift.required_role;
  const title = shift.title?.trim() || roleLabel;
  const isOpen = shift.status === 'published';

  const openCount =
    'open_positions' in shift && typeof shift.open_positions === 'number'
      ? shift.open_positions
      : remainingOpenPositions(shift.required_positions ?? 1, 0);
  const positionsCopy = isOpen ? openPositionsLabel(openCount) : null;

  const marketplace =
    'location_name' in shift || 'organization_name' in shift
      ? (shift as MarketplaceShift)
      : null;
  const resolvedLocation =
    locationName ||
    [marketplace?.location_name, marketplace?.ward_name].filter(Boolean).join(' · ') ||
    undefined;
  const resolvedOrg = organizationName || marketplace?.organization_name || undefined;

  const statusStyle = shiftStatusStyles[shift.status] ?? {
    label: shift.status.replace(/_/g, ' '),
    fg: colors.info,
    bg: colors.infoLight,
    icon: 'ellipse',
  };
  const pill: SummaryPill = isOpen
    ? { label: 'Open', ...SUMMARY_PILLS.open }
    : {
        label: statusStyle.label,
        fg: statusStyle.fg,
        bg: statusStyle.bg,
        icon: statusStyle.icon as SummaryPill['icon'],
      };

  const extraRows: SummaryRow[] = [];
  if (title !== roleLabel) extraRows.push({ icon: 'medkit-outline', label: 'Role', value: roleLabel });
  if (positionsCopy) {
    extraRows.push({ icon: 'people-outline', label: 'Availability', value: positionsCopy });
  }

  const day = formatDayLabel(isoDateFromTimestamp(shift.starts_at));

  return (
    <ShiftSummaryCard
      eyebrow={isOpen ? 'Open shift' : 'Shift'}
      eyebrowIcon={isOpen ? 'search' : 'calendar'}
      pill={pill}
      title={title}
      org={resolvedOrg}
      startsAt={shift.starts_at}
      endsAt={shift.ends_at}
      breakMinutes={shift.break_minutes ?? 0}
      location={resolvedLocation ?? 'Location not listed'}
      rateMinor={shift.rate_minor}
      currency={shift.currency}
      extraRows={extraRows}
      onPress={onPress ?? (() => router.push(`/shifts/${shift.id}`))}
      accessibilityLabel={`${title}${resolvedLocation ? `, ${resolvedLocation}` : ''}, ${day}${positionsCopy ? `, ${positionsCopy}` : ''}`}
    />
  );
}
