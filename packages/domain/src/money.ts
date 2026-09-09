/** Money helpers — amounts are integer minor units (cents/pence). */

import { DEFAULT_COMMISSION_RATE_BPS } from './types';

export { DEFAULT_COMMISSION_RATE_BPS };

export function formatMoneyMinor(
  amountMinor: number,
  currency = 'EUR',
  locale = 'en-CY',
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amountMinor / 100);
}

export function hoursFromMinutes(minutes: number): number {
  return minutes / 60;
}

/** Gross for a shift from hourly rate (minor) and approved minutes. */
export function grossFromRateAndMinutes(
  rateMinorPerHour: number,
  approvedMinutes: number,
): number {
  if (rateMinorPerHour <= 0 || approvedMinutes < 0) {
    throw new Error('Invalid rate or minutes');
  }
  return Math.round((rateMinorPerHour * approvedMinutes) / 60);
}

/** Commission in minor units from basis points (1600 = 16%). */
export function commissionFromGross(
  grossMinor: number,
  commissionRateBps: number = DEFAULT_COMMISSION_RATE_BPS,
): number {
  if (commissionRateBps < 0 || commissionRateBps > 10000) {
    throw new Error('commissionRateBps out of range');
  }
  return Math.round((grossMinor * commissionRateBps) / 10000);
}

/**
 * Pilot settlement: worker receives gross; org also owes commission separately.
 * organizationTotalDue = gross + commission.
 */
export function buildOrganizationPaysGrossSnapshot(
  grossMinor: number,
  commissionRateBps: number = DEFAULT_COMMISSION_RATE_BPS,
  currency = 'EUR',
) {
  const commissionAmountMinor = commissionFromGross(grossMinor, commissionRateBps);
  return {
    grossAmountMinor: grossMinor,
    commissionRateBps,
    commissionAmountMinor,
    workerTransferAmountMinor: grossMinor,
    organizationTotalDueMinor: grossMinor + commissionAmountMinor,
    currency,
  };
}

export function workerNetFromGross(
  grossMinor: number,
  commissionRateBps: number = DEFAULT_COMMISSION_RATE_BPS,
): { commissionMinor: number; workerNetMinor: number } {
  const commissionMinor = commissionFromGross(grossMinor, commissionRateBps);
  return {
    commissionMinor,
    workerNetMinor: grossMinor - commissionMinor,
  };
}
