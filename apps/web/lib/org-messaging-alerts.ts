import {
  sumConversationUnread,
  unreadBadgeLabel,
  type OrgWorkerConversationSummary,
} from '@bridge-hive/domain';

export const ORG_MESSAGE_TOAST_BROADCAST = 'bh-org-msg-toast';

export type OrgMessagingUnreadStatus = 'idle' | 'loading' | 'ready' | 'error';

export type IncomingUnreadAlert = {
  conversationId: string;
  workerName: string | null;
  /** Stable within a tab for this incoming bump (conversation + last activity). */
  alertKey: string;
};

export function parseOrgConversationSummaries(
  value: unknown,
): OrgWorkerConversationSummary[] {
  if (!Array.isArray(value)) return [];
  return value.filter((row): row is OrgWorkerConversationSummary => {
    if (!row || typeof row !== 'object') return false;
    const c = row as Partial<OrgWorkerConversationSummary>;
    return (
      typeof c.id === 'string' &&
      typeof c.workerId === 'string' &&
      typeof c.unreadCount === 'number'
    );
  });
}

export function unreadSnapshotTotal(
  conversations: OrgWorkerConversationSummary[],
): number {
  return sumConversationUnread(conversations);
}

export function unreadSnapshotBadge(
  conversations: OrgWorkerConversationSummary[],
): string | null {
  return unreadBadgeLabel(unreadSnapshotTotal(conversations));
}

/**
 * After baseline is established, emit one alert per conversation whose
 * staff-scoped unread rose and whose latest sender looks like a worker.
 * Outgoing staff / reactions-only noise that does not raise unread is ignored.
 */
export function detectIncomingUnreadAlerts(input: {
  previous: OrgWorkerConversationSummary[];
  next: OrgWorkerConversationSummary[];
  baselineReady: boolean;
}): IncomingUnreadAlert[] {
  if (!input.baselineReady) return [];

  const prevById = new Map(input.previous.map((row) => [row.id, row]));
  const alerts: IncomingUnreadAlert[] = [];

  for (const row of input.next) {
    const prev = prevById.get(row.id);
    const prevUnread = prev?.unreadCount ?? 0;
    const nextUnread = row.unreadCount ?? 0;
    if (!(nextUnread > prevUnread)) continue;
    if (row.lastSenderKind && row.lastSenderKind !== 'worker') continue;

    const activity =
      row.lastMessageAt ??
      `${nextUnread}:${row.lastMessagePreview ?? ''}:${row.workerId}`;
    alerts.push({
      conversationId: row.id,
      workerName: row.workerName?.trim() || null,
      alertKey: `${row.id}:${activity}`,
    });
  }

  return alerts;
}

export function shouldSuppressIncomingToast(input: {
  conversationId: string;
  focusedConversationId: string | null;
  tabVisible: boolean;
}): boolean {
  return (
    input.tabVisible &&
    input.focusedConversationId !== null &&
    input.focusedConversationId === input.conversationId
  );
}

export function shouldMarkConversationRead(input: {
  conversationId: string;
  selectedConversationId: string | null;
  tabVisible: boolean;
}): boolean {
  return (
    input.tabVisible &&
    input.selectedConversationId !== null &&
    input.selectedConversationId === input.conversationId
  );
}

export function orgMessageAlertDedupKey(input: {
  userId: string;
  organizationId: string;
  alertKey: string;
}): string {
  return `${input.userId}|${input.organizationId}|${input.alertKey}`;
}

export function createAlertDeduper(maxEntries = 200) {
  const seen = new Map<string, number>();
  return {
    clear() {
      seen.clear();
    },
    /** Returns true when this key is new (should alert). */
    claim(key: string, now = Date.now()): boolean {
      if (seen.has(key)) return false;
      seen.set(key, now);
      if (seen.size > maxEntries) {
        const overflow = seen.size - maxEntries;
        const keys = seen.keys();
        for (let i = 0; i < overflow; i += 1) {
          const oldest = keys.next().value;
          if (oldest) seen.delete(oldest);
        }
      }
      return true;
    },
    has(key: string): boolean {
      return seen.has(key);
    },
  };
}
