import { useRouter } from 'expo-router';
import React from 'react';

import {
  ShiftSummaryCard,
  SUMMARY_PILLS,
  type SummaryPill,
  type SummaryRow,
} from '@/components/shifts/ShiftSummaryCard';
import { WORKER_ROLE_LABELS } from '@/constants/config';
import { colors, shiftStatusStyles } from '@/constants/theme';
import { useTranslation } from '@/i18n/locale-provider';
import type { MarketplaceShift, Shift } from '@/lib/queries';
import { formatDayLabel, isoDateFromTimestamp } from '@/utils/format';

type Props = {
  shift: Shift | MarketplaceShift;
  organizationName?: string;
  locationName?: string;
  onPress?: () => void;
};

function openPositionsCopy(
  openCount: number,
  t: (key: string, options?: Record<string, unknown>) => string,
): string {
  if (openCount === 1) return t('shifts.onePositionOpen');
  return t('shifts.nPositionsOpen', { count: openCount });
}

/** Marketplace shift — same premium summary card used on Home and My shifts. */
export function ShiftCard({ shift, organizationName, locationName, onPress }: Props) {
  const router = useRouter();
  const { t } = useTranslation();
  const roleLabel =
    WORKER_ROLE_LABELS[shift.required_role as keyof typeof WORKER_ROLE_LABELS] ??
    shift.required_role;
  const title = shift.title?.trim() || roleLabel;
  const isOpen = shift.status === 'published';

  const marketplace =
    'location_name' in shift || 'organization_name' in shift || 'availability_known' in shift
      ? (shift as MarketplaceShift)
      : null;

  const openCount =
    marketplace &&
    marketplace.availability_known &&
    typeof marketplace.open_positions === 'number'
      ? marketplace.open_positions
      : null;
  const availabilityUnknown =
    Boolean(marketplace) && isOpen && !marketplace!.availability_known;
  const positionsCopy =
    isOpen && openCount != null
      ? openPositionsCopy(openCount, t)
      : availabilityUnknown
        ? t('shifts.availabilityUnavailableShort')
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
  const pill: SummaryPill =
    isOpen && openCount === 0
      ? { label: t('shifts.fullyBooked'), ...SUMMARY_PILLS.open }
      : availabilityUnknown
        ? {
            label: t('shifts.availabilityChecking'),
            fg: colors.textSecondary,
            bg: colors.surfaceSubdued,
            icon: 'refresh-outline',
          }
      : isOpen
        ? { label: t('shifts.open'), ...SUMMARY_PILLS.open }
        : {
            label: statusStyle.label,
            fg: statusStyle.fg,
            bg: statusStyle.bg,
            icon: statusStyle.icon as SummaryPill['icon'],
          };

  const extraRows: SummaryRow[] = [];
  if (title !== roleLabel) {
    extraRows.push({
      icon: 'medkit-outline',
      label: t('shifts.role'),
      value: roleLabel,
    });
  }
  if (positionsCopy) {
    extraRows.push({
      icon: 'people-outline',
      label: t('shifts.availability'),
      value: positionsCopy,
    });
  }

  const day = formatDayLabel(isoDateFromTimestamp(shift.starts_at));

  return (
    <ShiftSummaryCard
      eyebrow={isOpen ? t('shifts.openShift') : t('shifts.shiftEyebrow')}
      eyebrowIcon={isOpen ? 'search' : 'calendar'}
      pill={pill}
      title={title}
      org={resolvedOrg}
      startsAt={shift.starts_at}
      endsAt={shift.ends_at}
      breakMinutes={shift.break_minutes ?? 0}
      location={resolvedLocation ?? t('shifts.locationNotListed')}
      rateMinor={shift.rate_minor}
      currency={shift.currency}
      extraRows={extraRows}
      onPress={onPress ?? (() => router.push(`/shifts/${shift.id}`))}
      accessibilityLabel={`${title}${resolvedOrg ? `, ${resolvedOrg}` : ''}${resolvedLocation ? `, ${resolvedLocation}` : ''}, ${day}${positionsCopy ? `, ${positionsCopy}` : ''}`}
    />
  );
}
