/**
 * Organization ↔ worker messaging helpers (pure).
 * Eligibility rules mirror the SQL RPC org_worker_messaging_eligible.
 */

import type { WorkerRole } from './types';
import { WORKER_ROLE_LABELS, WORKER_ROLE_LABELS_EL, isWorkerRole } from './types';

export const ORG_WORKER_MESSAGE_MAX_LENGTH = 2000;
export const ORG_WORKER_MESSAGE_PRIVACY_WARNING_EN =
  'Do not share patient information, login credentials, or bank details in messages.';
export const ORG_WORKER_MESSAGE_PRIVACY_WARNING_EL =
  'Μην κοινοποιείτε στοιχεία ασθενών, κωδικούς πρόσβασης ή τραπεζικά στοιχεία στα μηνύματα.';

export type MessagingSenderKind = 'worker' | 'organization_staff';

export type MessagingEligibilityInput = {
  organizationActive: boolean;
  workerAccountActive: boolean;
  workerVerified: boolean;
  workerRole: string | null | undefined;
  isAppReviewDemo: boolean;
  hasApprovedCompletedWork: boolean;
};

export type OrgWorkerConversationSummary = {
  id: string;
  organizationId: string;
  workerId: string;
  organizationName?: string | null;
  workerName?: string | null;
  workerRole?: string | null;
  lastMessageAt?: string | null;
  lastMessagePreview?: string | null;
  lastSenderKind?: MessagingSenderKind | null;
  unreadCount: number;
  createdAt?: string | null;
};

export type OrgWorkerMessageRow = {
  id: string;
  conversationId: string;
  senderUserId: string;
  senderKind: MessagingSenderKind;
  body: string;
  clientMessageId: string;
  createdAt: string;
  senderName?: string | null;
  /** Client-only send state; never persisted. */
  localStatus?: 'pending' | 'failed' | 'sent';
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isMessagingUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export function canOrgStaffMessage(caps: {
  canOperate: boolean;
  canManageShifts: boolean;
  canReviewTimesheets: boolean;
}): boolean {
  return caps.canOperate && (caps.canManageShifts || caps.canReviewTimesheets);
}

export function isMessagingEligible(input: MessagingEligibilityInput): boolean {
  if (input.isAppReviewDemo) return false;
  if (!input.organizationActive) return false;
  if (!input.workerAccountActive) return false;
  if (!input.workerVerified) return false;
  if (!input.workerRole || !isWorkerRole(input.workerRole)) return false;
  if (!input.hasApprovedCompletedWork) return false;
  return true;
}

export function normalizeMessageBody(raw: string): {
  ok: true;
  body: string;
} | {
  ok: false;
  error: 'empty' | 'too_long';
} {
  const body = raw.replace(/\r\n/g, '\n').trim();
  if (!body) return { ok: false, error: 'empty' };
  if (body.length > ORG_WORKER_MESSAGE_MAX_LENGTH) {
    return { ok: false, error: 'too_long' };
  }
  return { ok: true, body };
}

export function messagePreview(body: string, max = 120): string {
  const trimmed = body.trim().replace(/\s+/g, ' ');
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, Math.max(0, max - 1))}…`;
}

export function workerRoleLabelForMessaging(
  role: string | null | undefined,
  locale: 'en' | 'el' = 'en',
): string {
  if (!role || !isWorkerRole(role)) return locale === 'el' ? 'Εργαζόμενος' : 'Worker';
  return locale === 'el'
    ? WORKER_ROLE_LABELS_EL[role as WorkerRole]
    : WORKER_ROLE_LABELS[role as WorkerRole];
}

export function filterConversationsByQuery(
  conversations: OrgWorkerConversationSummary[],
  query: string,
): OrgWorkerConversationSummary[] {
  const q = query.trim().toLowerCase();
  if (!q) return conversations;
  return conversations.filter((c) => {
    const hay = [
      c.workerName,
      c.organizationName,
      c.workerRole,
      c.lastMessagePreview,
      workerRoleLabelForMessaging(c.workerRole, 'en'),
      workerRoleLabelForMessaging(c.workerRole, 'el'),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return hay.includes(q);
  });
}

export function sortMessagesAscending(
  messages: OrgWorkerMessageRow[],
): OrgWorkerMessageRow[] {
  return [...messages].sort((a, b) => {
    if (a.createdAt === b.createdAt) {
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    }
    return a.createdAt < b.createdAt ? -1 : 1;
  });
}

export function mergeMessagePage(
  existing: OrgWorkerMessageRow[],
  incoming: OrgWorkerMessageRow[],
): OrgWorkerMessageRow[] {
  const byId = new Map<string, OrgWorkerMessageRow>();
  for (const row of existing) byId.set(row.id, row);
  for (const row of incoming) byId.set(row.id, row);
  // Prefer server row over optimistic when same clientMessageId
  const byClient = new Map<string, OrgWorkerMessageRow>();
  for (const row of byId.values()) {
    const prev = byClient.get(row.clientMessageId);
    if (!prev) {
      byClient.set(row.clientMessageId, row);
      continue;
    }
    // Keep non-temp id if one is temp
    const prefer =
      row.id.startsWith('temp-') && !prev.id.startsWith('temp-') ? prev : row;
    byClient.set(row.clientMessageId, prefer);
  }
  return sortMessagesAscending([...byClient.values()]);
}

/**
 * Pure helper mirroring mark_org_worker_conversation_read.
 * Ordering is (createdAt, id) — never UUID lexicographic order alone.
 */
export function isMessageAfter(
  candidate: { createdAt: string; id: string },
  previous: { createdAt: string; id: string },
): boolean {
  if (candidate.createdAt !== previous.createdAt) {
    return candidate.createdAt > previous.createdAt;
  }
  return candidate.id > previous.id;
}

export function advanceReadCursor(args: {
  previousAt: string | null;
  previousMessageId: string | null;
  candidateAt: string;
  candidateMessageId: string;
}): { lastReadAt: string; lastReadMessageId: string; advanced: boolean } {
  if (!args.previousAt || !args.previousMessageId) {
    return {
      lastReadAt: args.candidateAt,
      lastReadMessageId: args.candidateMessageId,
      advanced: true,
    };
  }
  const shouldAdvance = isMessageAfter(
    { createdAt: args.candidateAt, id: args.candidateMessageId },
    { createdAt: args.previousAt, id: args.previousMessageId },
  );
  if (!shouldAdvance) {
    return {
      lastReadAt: args.previousAt,
      lastReadMessageId: args.previousMessageId,
      advanced: false,
    };
  }
  return {
    lastReadAt: args.candidateAt,
    lastReadMessageId: args.candidateMessageId,
    advanced: true,
  };
}
