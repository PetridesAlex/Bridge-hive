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
import type { WorkerBillingStanding, WorkerRole } from './types';

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

export type BillingStandingPresentationKind =
  | 'loading'
  | 'unavailable'
  | 'restricted'
  | 'good_standing'
  | 'sandbox_restricted'
  | 'sandbox_good_standing';

export type BillingStandingPresentation = {
  kind: BillingStandingPresentationKind;
  label: string;
  tone: 'success' | 'danger' | 'info' | 'neutral';
  solid: boolean;
  pulse: boolean;
};

export function normalizeWorkerBillingStanding(
  standing: string | null | undefined,
): WorkerBillingStanding | null {
  if (standing === 'good_standing' || standing === 'restricted') return standing;
  return null;
}

/**
 * Live marketplace pause follows the authorized standing RPC — including when
 * the client payment lane is sandbox. Never invent good_standing to hide debt.
 */
export function marketplacePausedForLiveBillingStanding(
  standing: string | null | undefined,
): boolean {
  return normalizeWorkerBillingStanding(standing) === 'restricted';
}

/**
 * Sandbox TEST invoice payment eligibility is independent of live standing.
 * Paying a sandbox invoice never clears a production commission obligation.
 */
export function sandboxPaymentEligibilityIndependentOfLiveStanding(): boolean {
  return true;
}

/**
 * Present worker billing standing for profile / account surfaces.
 * Sandbox payment mode must still show real live standing (or unavailable) —
 * never an unqualified "Good standing" that implies production debt is cleared.
 */
export function presentWorkerBillingStanding(input: {
  paymentsMode: 'sandbox' | 'live';
  standing: string | null | undefined;
  readFailed?: boolean;
  loading?: boolean;
}): BillingStandingPresentation {
  const standing = normalizeWorkerBillingStanding(input.standing);
  if (input.loading && !standing && !input.readFailed) {
    return {
      kind: 'loading',
      label: 'Checking billing…',
      tone: 'neutral',
      solid: false,
      pulse: false,
    };
  }
  if (input.readFailed || !standing) {
    return {
      kind: 'unavailable',
      label: 'Billing status unavailable',
      tone: 'neutral',
      solid: false,
      pulse: false,
    };
  }
  if (input.paymentsMode === 'sandbox') {
    if (standing === 'restricted') {
      return {
        kind: 'sandbox_restricted',
        label: 'Live standing · restricted',
        tone: 'danger',
        solid: true,
        pulse: false,
      };
    }
    return {
      kind: 'sandbox_good_standing',
      label: 'Live standing clear · sandbox payments',
      tone: 'info',
      solid: false,
      pulse: false,
    };
  }
  if (standing === 'restricted') {
    return {
      kind: 'restricted',
      label: 'Billing restricted',
      tone: 'danger',
      solid: true,
      pulse: false,
    };
  }
  return {
    kind: 'good_standing',
    label: 'Good standing',
    tone: 'success',
    solid: true,
    pulse: true,
  };
}

export function billingStandingLabel(
  standing: 'good_standing' | 'restricted' | string | null | undefined,
): string {
  return presentWorkerBillingStanding({
    paymentsMode: 'live',
    standing,
  }).label;
}
