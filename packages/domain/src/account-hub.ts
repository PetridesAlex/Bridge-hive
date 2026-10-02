/**
 * Account hub helpers — profile photo path ownership, initials, menu trailing copy.
 * Presentation-only; no Storage or RPC side effects.
 */

import { formatMoneyMinor } from './money';
import {
  accountSetupNextStep,
  documentProgressCounts,
  documentsSummaryLabel,
  finalApprovalSummaryLabel,
  payoutSummaryLabel,
  type CredentialSummary,
  type PayoutAccountStatusInput,
} from './credential-requirements';
import type { WorkerRole } from './types';

const OWNED_AVATAR_PATH =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[A-Za-z0-9._-]+\.(jpg|jpeg)$/i;

/** True when path is under the caller's UUID folder with a safe JPEG filename. */
export function isOwnedAvatarPath(
  userId: string,
  path: string | null | undefined,
): boolean {
  if (!userId || !path) return false;
  if (!OWNED_AVATAR_PATH.test(path)) return false;
  return path.toLowerCase().startsWith(`${userId.toLowerCase()}/`);
}

/** Initials for avatar fallback (max 2 letters). */
export function profileInitials(fullName: string | null | undefined): string {
  const parts = (fullName ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'BH';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase() || 'BH';
}

export function personalInformationTrailingStatus(
  phone: string | null | undefined,
): string {
  return phone?.trim() ? 'Complete' : 'Add phone';
}

export function credentialsMenuTrailingStatus(params: {
  role: WorkerRole | null | undefined;
  credentials: CredentialSummary[];
}): string {
  const counts = documentProgressCounts(params);
  if (counts.requiredTotal === 0) return 'Not required';
  if (counts.rejected > 0) return 'Action required';
  if (counts.approved === counts.requiredTotal) {
    return `${counts.approved} of ${counts.requiredTotal} approved`;
  }
  if (counts.missing > 0 || counts.submitted > 0 || counts.underReview > 0) {
    if (counts.approved > 0) {
      return `${counts.approved} of ${counts.requiredTotal} approved`;
    }
    if (counts.underReview > 0 || counts.submitted > 0) return 'Under review';
    return 'Action required';
  }
  return `${counts.approved} of ${counts.requiredTotal} approved`;
}

export function payoutMenuTrailingStatus(params: {
  maskedIban?: string | null;
  status: PayoutAccountStatusInput;
}): string {
  const statusLabel = payoutSummaryLabel(params.status);
  const masked = params.maskedIban?.trim();
  if (masked && params.status) {
    return `${masked} · ${statusLabel}`;
  }
  return statusLabel;
}

export function notificationsMenuTrailingStatus(unreadCount: number): string | null {
  if (unreadCount <= 0) return null;
  return unreadCount === 1 ? '1 unread' : `${unreadCount} unread`;
}

export function earningsMenuTrailingStatus(awaitingPayoutCount: number): string | null {
  if (awaitingPayoutCount <= 0) return null;
  return awaitingPayoutCount === 1
    ? '1 payout awaiting'
    : `${awaitingPayoutCount} payouts awaiting`;
}

export type InvoiceMenuInput = {
  status: string;
  commission_amount_minor?: number | null;
  currency?: string | null;
};

export function invoicesMenuTrailingStatus(
  invoices: InvoiceMenuInput[],
  locale = 'en-CY',
): string {
  const pastDue = invoices.filter((i) => i.status === 'past_due');
  if (pastDue.length > 0) {
    const total = pastDue.reduce((sum, i) => sum + (i.commission_amount_minor ?? 0), 0);
    const currency = pastDue[0]?.currency ?? 'EUR';
    if (total > 0) {
      return `Past due · ${formatMoneyMinor(total, currency, locale)}`;
    }
    return 'Past due';
  }

  const open = invoices.filter(
    (i) => i.status === 'open' || i.status === 'payment_processing',
  );
  if (open.length > 0) {
    const total = open.reduce((sum, i) => sum + (i.commission_amount_minor ?? 0), 0);
    const currency = open[0]?.currency ?? 'EUR';
    if (total > 0) {
      return `Due ${formatMoneyMinor(total, currency, locale)}`;
    }
    return 'Payment due';
  }

  if (invoices.length === 0) return 'No invoices';
  return 'All paid';
}

export function accountSetupMenuTrailingStatus(params: {
  verificationStatus: string;
  accountStatus?: string | null;
  role: WorkerRole | null | undefined;
  credentials: CredentialSummary[];
  payoutStatus: PayoutAccountStatusInput;
}): string {
  const documentsLabel = documentsSummaryLabel({
    role: params.role,
    credentials: params.credentials,
  });
  const finalLabel = finalApprovalSummaryLabel({
    verificationStatus: params.verificationStatus,
    accountStatus: params.accountStatus,
    documentsLabel,
    payoutStatus: params.payoutStatus,
  });
  return accountSetupNextStep({
    documentsLabel,
    payoutStatus: params.payoutStatus,
    finalLabel,
  });
}

export function billingStandingLabel(
  standing: 'good_standing' | 'restricted' | string | null | undefined,
): string {
  if (standing === 'restricted') return 'Billing restricted';
  return 'Good standing';
}
