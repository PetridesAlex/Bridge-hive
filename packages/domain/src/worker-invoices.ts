import type { WorkerInvoiceStatus } from './types';
import { WORKER_COMMISSION_DUE_DAYS } from './types';

export const WORKER_INVOICE_STATUS_LABELS: Record<WorkerInvoiceStatus, string> = {
  draft: 'Draft',
  open: 'Open',
  payment_processing: 'Payment processing',
  paid: 'Paid',
  past_due: 'Past due',
  void: 'Void',
  uncollectible: 'Uncollectible',
};

export function workerInvoiceStatusLabel(status: WorkerInvoiceStatus | string): string {
  if (status in WORKER_INVOICE_STATUS_LABELS) {
    return WORKER_INVOICE_STATUS_LABELS[status as WorkerInvoiceStatus];
  }
  return 'Unknown';
}

export function isWorkerInvoicePayable(status: WorkerInvoiceStatus | string): boolean {
  // payment_processing remains payable so workers can retry after an expired/failed session.
  return status === 'open' || status === 'past_due' || status === 'payment_processing';
}

/** Calendar-day difference from `from` to `dueAt` (can be negative if overdue). */
export function daysUntilDue(dueAt: string | Date, from: Date = new Date()): number {
  const due = typeof dueAt === 'string' ? new Date(dueAt) : dueAt;
  const start = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const end = Date.UTC(due.getFullYear(), due.getMonth(), due.getDate());
  return Math.round((end - start) / (24 * 60 * 60 * 1000));
}

export function dueDateCopy(dueAt: string | Date, from: Date = new Date()): string {
  const days = daysUntilDue(dueAt, from);
  if (days > 1) return `Due in ${days} calendar days`;
  if (days === 1) return 'Due in 1 calendar day';
  if (days === 0) return 'Due today';
  if (days === -1) return '1 day overdue';
  return `${Math.abs(days)} days overdue`;
}

export function addCommissionDueDays(
  issuedAt: string | Date,
  days: number = WORKER_COMMISSION_DUE_DAYS,
): Date {
  const issued = typeof issuedAt === 'string' ? new Date(issuedAt) : new Date(issuedAt.getTime());
  issued.setUTCDate(issued.getUTCDate() + days);
  return issued;
}

export const BILLING_RESTRICTED_BANNER =
  'New shift access is paused because a commission invoice is overdue.';

export const WORKER_COMMISSION_EXPLAINER =
  'The hospital pays you the approved gross shift amount. This separate invoice is the 16% Bridge Hive platform commission.';

export const PAYMENT_CONFIRMATION_PENDING =
  'Payment confirmation pending';
