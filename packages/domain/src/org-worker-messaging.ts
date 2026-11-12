/**
 * Organization ↔ worker messaging helpers (pure).
 * Eligibility rules mirror the SQL RPC org_worker_messaging_eligible.
 */

import type { WorkerRole } from './types';
import { WORKER_ROLE_LABELS, WORKER_ROLE_LABELS_EL, isWorkerRole } from './types';

export const ORG_WORKER_MESSAGE_MAX_LENGTH = 2000;
export const ORG_WORKER_MESSAGE_PRIVACY_WARNING_EN =
  'Do not share patient information, passwords or bank details.';
export const ORG_WORKER_MESSAGE_PRIVACY_WARNING_EL =
  'Μην κοινοποιείτε στοιχεία ασθενών, κωδικούς ή τραπεζικά στοιχεία.';

/** Stable keys validated by SQL CHECK / set RPC. */
export const ORG_WORKER_REACTION_KEYS = [
  'thumbsup',
  'heart',
  'joy',
  'tada',
  'open_mouth',
  'pray',
] as const;

export type OrgWorkerReactionKey = (typeof ORG_WORKER_REACTION_KEYS)[number];

export const ORG_WORKER_REACTION_EMOJI: Record<OrgWorkerReactionKey, string> = {
  thumbsup: '👍',
  heart: '❤️',
  joy: '😂',
  tada: '🎉',
  open_mouth: '😮',
  pray: '🙏',
};

/** Compact composer sheet — not the reaction allowlist. */
export const ORG_WORKER_COMPOSER_COMMON_EMOJIS = [
  '😀',
  '🙂',
  '😊',
  '😂',
  '🤣',
  '😍',
  '🥰',
  '😎',
  '🤔',
  '😅',
  '😢',
  '😭',
  '🙏',
  '👍',
  '👎',
  '👏',
  '🔥',
  '🎉',
  '❤️',
  '💙',
  '✅',
  '❌',
  '⭐',
  '💯',
  '👋',
  '🤝',
  '💪',
  '☕',
  '🏥',
  '🇬🇷',
] as const;

export type OrgWorkerReactionChip = {
  key: OrgWorkerReactionKey;
  emoji: string;
  count: number;
  reactedByMe: boolean;
};

export type OrgWorkerMessageReactionSummary = {
  messageId: string;
  reactions: OrgWorkerReactionChip[];
};

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

/**
 * Matches PostgreSQL `char_length` for UTF-8 text: Unicode code-point count,
 * not UTF-16 `.length` and not grapheme clusters.
 */
export function unicodeCharLength(value: string): number {
  return Array.from(value).length;
}

/** Slice by Unicode code points (safe for flags / surrogates). */
export function unicodeSlice(value: string, start: number, end?: number): string {
  return Array.from(value).slice(start, end).join('');
}

export function clampMessageDraft(raw: string, max = ORG_WORKER_MESSAGE_MAX_LENGTH): string {
  if (unicodeCharLength(raw) <= max) return raw;
  return unicodeSlice(raw, 0, max);
}

export function insertTextAtSelection(
  value: string,
  insert: string,
  selection: { start: number; end: number },
  max = ORG_WORKER_MESSAGE_MAX_LENGTH,
): { value: string; selection: { start: number; end: number } } {
  const chars = Array.from(value);
  const start = Math.max(0, Math.min(selection.start, chars.length));
  const end = Math.max(start, Math.min(selection.end, chars.length));
  const insertChars = Array.from(insert);
  const nextChars = [...chars.slice(0, start), ...insertChars, ...chars.slice(end)];
  const clipped =
    nextChars.length > max ? nextChars.slice(0, max) : nextChars;
  const caret = Math.min(start + insertChars.length, clipped.length);
  return {
    value: clipped.join(''),
    selection: { start: caret, end: caret },
  };
}

export function isOrgWorkerReactionKey(value: string): value is OrgWorkerReactionKey {
  return (ORG_WORKER_REACTION_KEYS as readonly string[]).includes(value);
}

export function canReactToMessage(message: {
  id: string;
  localStatus?: OrgWorkerMessageRow['localStatus'];
}): boolean {
  if (!isMessagingUuid(message.id) || message.id.startsWith('temp-')) return false;
  if (message.localStatus === 'pending' || message.localStatus === 'failed') return false;
  return true;
}

/** Soft-degrade detector when reactions migration/RPCs are not deployed. */
export function isMessagingReactionsUnavailableError(
  message: string | null | undefined,
): boolean {
  if (!message) return false;
  const m = message.toLowerCase();
  return (
    m.includes('list_org_worker_message_reaction_summaries') ||
    m.includes('set_org_worker_message_reaction') ||
    m.includes('clear_org_worker_message_reaction') ||
    m.includes('organization_worker_message_reactions') ||
    m.includes('could not find the function') ||
    m.includes('schema cache') ||
    m.includes('pgrst202') ||
    m.includes('42883')
  );
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
  if (unicodeCharLength(body) > ORG_WORKER_MESSAGE_MAX_LENGTH) {
    return { ok: false, error: 'too_long' };
  }
  return { ok: true, body };
}

export function messagePreview(body: string, max = 120): string {
  const trimmed = body.trim().replace(/\s+/g, ' ');
  if (unicodeCharLength(trimmed) <= max) return trimmed;
  return `${unicodeSlice(trimmed, 0, Math.max(0, max - 1))}…`;
}

export function mergeReactionSummaries(
  existing: OrgWorkerMessageReactionSummary[],
  incoming: OrgWorkerMessageReactionSummary[],
): OrgWorkerMessageReactionSummary[] {
  const map = new Map<string, OrgWorkerMessageReactionSummary>();
  for (const row of existing) map.set(row.messageId, row);
  for (const row of incoming) map.set(row.messageId, row);
  return [...map.values()];
}

export function parseReactionSummaries(
  value: unknown,
): OrgWorkerMessageReactionSummary[] {
  if (!Array.isArray(value)) return [];
  const out: OrgWorkerMessageReactionSummary[] = [];
  for (const row of value) {
    if (!row || typeof row !== 'object') continue;
    const messageId = (row as { messageId?: unknown }).messageId;
    const reactionsRaw = (row as { reactions?: unknown }).reactions;
    if (typeof messageId !== 'string' || !Array.isArray(reactionsRaw)) continue;
    const reactions: OrgWorkerReactionChip[] = [];
    for (const chip of reactionsRaw) {
      if (!chip || typeof chip !== 'object') continue;
      const key = String((chip as { key?: unknown }).key ?? '');
      if (!isOrgWorkerReactionKey(key)) continue;
      const count = Number((chip as { count?: unknown }).count ?? 0);
      if (!Number.isFinite(count) || count <= 0) continue;
      reactions.push({
        key,
        emoji: ORG_WORKER_REACTION_EMOJI[key],
        count: Math.floor(count),
        reactedByMe: Boolean((chip as { reactedByMe?: unknown }).reactedByMe),
      });
    }
    reactions.sort((a, b) => a.key.localeCompare(b.key));
    out.push({ messageId, reactions });
  }
  return out;
}

/**
 * Local optimistic apply for one user's desired reaction on a message.
 * `desiredKey` null clears the caller's reaction.
 */
export function applyOptimisticReaction(
  summary: OrgWorkerMessageReactionSummary | undefined,
  messageId: string,
  desiredKey: OrgWorkerReactionKey | null,
): OrgWorkerMessageReactionSummary {
  const base = summary ?? { messageId, reactions: [] };
  const withoutMine = base.reactions
    .map((chip) => {
      if (!chip.reactedByMe) return chip;
      const count = Math.max(0, chip.count - 1);
      if (count === 0) return null;
      return { ...chip, count, reactedByMe: false };
    })
    .filter((chip): chip is OrgWorkerReactionChip => chip != null);

  if (!desiredKey) {
    return { messageId, reactions: withoutMine };
  }

  const emoji = ORG_WORKER_REACTION_EMOJI[desiredKey];
  const existing = withoutMine.find((chip) => chip.key === desiredKey);
  const next = withoutMine.filter((chip) => chip.key !== desiredKey);
  next.push({
    key: desiredKey,
    emoji,
    count: (existing?.count ?? 0) + 1,
    reactedByMe: true,
  });
  next.sort((a, b) => a.key.localeCompare(b.key));
  return { messageId, reactions: next };
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

export const ORG_WORKER_MESSAGE_PAGE_SIZE = 80;

/**
 * Both assignment and timesheet must be approved. UI gates use this so a
 * claimed or merely accepted assignment does not offer chat.
 */
export function canOfferCompletedWorkMessage(input: {
  assignmentStatus: string | null | undefined;
  timesheetStatus: string | null | undefined;
  isAppReviewDemo: boolean;
}): boolean {
  return (
    !input.isAppReviewDemo &&
    input.assignmentStatus === 'approved' &&
    input.timesheetStatus === 'approved'
  );
}

/** UUID v4 for send idempotency. Never returns a non-UUID placeholder. */
export function newClientMessageId(): string | null {
  const cryptoObj = globalThis.crypto;
  if (!cryptoObj) return null;
  if (typeof cryptoObj.randomUUID === 'function') {
    const id = cryptoObj.randomUUID();
    return isMessagingUuid(id) ? id : null;
  }
  if (typeof cryptoObj.getRandomValues !== 'function') return null;
  const bytes = new Uint8Array(16);
  cryptoObj.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  const id = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  return isMessagingUuid(id) ? id : null;
}

export function sumConversationUnread(
  conversations: Array<{ unreadCount?: number | null }>,
): number {
  return conversations.reduce((total, row) => {
    const count = row.unreadCount ?? 0;
    return total + (Number.isFinite(count) && count > 0 ? count : 0);
  }, 0);
}

export function pageMayHaveOlder(loadedCount: number, limit: number): boolean {
  return limit > 0 && loadedCount >= limit;
}

export function oldestServerCursor(
  messages: OrgWorkerMessageRow[],
): { createdAt: string; id: string } | null {
  const serverRows = sortMessagesAscending(
    messages.filter((row) => isMessagingUuid(row.id) && !row.id.startsWith('temp-')),
  );
  const oldest = serverRows[0];
  if (!oldest) return null;
  return { createdAt: oldest.createdAt, id: oldest.id };
}

/**
 * Merge a server page into the open thread.
 * Existing rows stay, so a stale or older page cannot drop a newer message.
 * Rows from another conversation are ignored.
 */
export function mergeThreadSnapshot(
  existing: OrgWorkerMessageRow[],
  incoming: OrgWorkerMessageRow[],
  conversationId: string,
): OrgWorkerMessageRow[] {
  const scopedExisting = existing.filter((row) => row.conversationId === conversationId);
  const scopedIncoming = incoming.filter(
    (row) => !row.conversationId || row.conversationId === conversationId,
  );
  return mergeMessagePage(scopedExisting, scopedIncoming);
}

export function unreadBadgeLabel(count: number): string | null {
  if (!Number.isFinite(count) || count <= 0) return null;
  return count > 99 ? '99+' : String(Math.floor(count));
}

export function messageListRpcArgs(
  conversationId: string,
  cursor?: { createdAt: string; id: string } | null,
) {
  return {
    p_conversation_id: conversationId,
    p_before_created_at: cursor?.createdAt ?? null,
    p_before_id: cursor?.id ?? null,
    p_limit: ORG_WORKER_MESSAGE_PAGE_SIZE,
  };
}

/** Staff may open chat only after the same completed-work gate the server enforces. */
export function canShowMessageWorkerAction(input: {
  staffCanMessage: boolean;
  assignmentStatus: string | null | undefined;
  timesheetStatus: string | null | undefined;
}): boolean {
  return (
    input.staffCanMessage &&
    canOfferCompletedWorkMessage({
      assignmentStatus: input.assignmentStatus,
      timesheetStatus: input.timesheetStatus,
      isAppReviewDemo: false,
    })
  );
}

export function messageWorkerHref(slug: string, conversationId: string): string | null {
  if (!isMessagingUuid(conversationId)) return null;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(slug)) return null;
  return `/org/${slug}/messages?conversation=${conversationId}`;
}

export const WORKER_ASSIGNMENT_LIST_SELECT =
  '*, shifts ( id, organization_id, title, starts_at, ends_at, rate_minor, currency, required_role, status, break_minutes ), timesheets ( status )';

export type LocalMessagingMessage = OrgWorkerMessageRow & {
  localStatus?: 'pending' | 'failed' | 'sent';
};

export function createSendLock() {
  let held = false;
  return {
    get held() {
      return held;
    },
    acquire(): boolean {
      if (held) return false;
      held = true;
      return true;
    },
    release() {
      held = false;
    },
  };
}

export function beginOutgoingMessage(input: {
  conversationId: string;
  senderUserId: string;
  senderKind: 'worker' | 'organization_staff';
  body: string;
  clientMessageId: string | null;
  senderName: string;
  now?: string;
}): { clientMessageId: string; optimistic: LocalMessagingMessage } | { error: 'missing-id' } {
  if (!input.clientMessageId || !isMessagingUuid(input.clientMessageId)) {
    return { error: 'missing-id' };
  }
  return {
    clientMessageId: input.clientMessageId,
    optimistic: {
      id: `temp-${input.clientMessageId}`,
      conversationId: input.conversationId,
      senderUserId: input.senderUserId,
      senderKind: input.senderKind,
      body: input.body,
      clientMessageId: input.clientMessageId,
      createdAt: input.now ?? new Date().toISOString(),
      senderName: input.senderName,
      localStatus: 'pending',
    },
  };
}

export function applyFailedSend(
  existing: LocalMessagingMessage[],
  clientMessageId: string,
): LocalMessagingMessage[] {
  return existing.map((row) =>
    row.clientMessageId === clientMessageId ? { ...row, localStatus: 'failed' } : row,
  );
}

export function applyAcceptedSend(
  existing: LocalMessagingMessage[],
  incoming: LocalMessagingMessage,
  conversationId: string,
): LocalMessagingMessage[] {
  return mergeThreadSnapshot(existing, [{ ...incoming, localStatus: 'sent' }], conversationId);
}

export function applyOlderMessagePage(
  existing: LocalMessagingMessage[],
  incoming: OrgWorkerMessageRow[],
  conversationId: string,
) {
  return {
    messages: mergeThreadSnapshot(existing, incoming, conversationId),
    hasOlder: pageMayHaveOlder(incoming.length, ORG_WORKER_MESSAGE_PAGE_SIZE),
    markReadMessageId: null as string | null,
  };
}

export function createThreadRequestGuard() {
  let token = 0;
  let conversationId: string | null = null;
  let organizationId: string | null = null;
  let active = true;
  let visible = true;

  function isCurrent(
    requestToken: number,
    requested: { conversationId: string; organizationId?: string | null },
  ): boolean {
    if (requestToken !== token) return false;
    if (requested.conversationId !== conversationId) return false;
    if (
      requested.organizationId != null &&
      requested.organizationId !== organizationId
    ) {
      return false;
    }
    return true;
  }

  return {
    setActive(value: boolean) {
      active = value;
    },
    setVisible(value: boolean) {
      visible = value;
    },
    setScope(next: { conversationId: string | null; organizationId: string | null }) {
      const organizationSwitched =
        organizationId !== null && next.organizationId !== organizationId;
      const conversationSwitched =
        conversationId !== null && next.conversationId !== conversationId;
      conversationId = next.conversationId;
      organizationId = next.organizationId;
      if (organizationSwitched || conversationSwitched) token += 1;
      return { organizationSwitched, conversationSwitched, token };
    },
    start(): number {
      token += 1;
      return token;
    },
    snapshot(): number {
      return token;
    },
    isCurrent,
    shouldMarkRead(
      requestToken: number,
      requested: { conversationId: string; organizationId?: string | null },
    ): boolean {
      return active && visible && isCurrent(requestToken, requested);
    },
  };
}

type RealtimeChannelLike = {
  on: (event: string, filter: object, callback: () => void) => RealtimeChannelLike;
  subscribe: (callback: (status: string) => void) => unknown;
};

/**
 * Structural match for `@supabase/realtime-js` `RealtimeChannelOptions`.
 * `config` is required whenever options are passed — the installed client
 * types reject `{ config?: ... }`, which previously blocked SupabaseClient
 * assignability into these helpers.
 *
 * Reaction Broadcast must keep `private: true` so Realtime Authorization /
 * `realtime.messages` RLS + `org_worker_can_access_conversation` apply.
 */
export type MessagingRealtimeChannelOptions = {
  config: {
    private?: boolean;
    broadcast?: {
      self?: boolean;
      ack?: boolean;
    };
    presence?: {
      key?: string;
      enabled?: boolean;
    };
  };
};

/**
 * The Supabase client's channel overloads are not a small structural type.
 * Callers pass the shared client; this helper only uses channel/removeChannel.
 *
 * `channel` returns `unknown` so installed `RealtimeChannel` overload sets for
 * `.on()` remain assignable (literal event unions are not subtypes of `string`
 * under parameter contravariance). Helpers narrow locally after open.
 */
export type MessagingRealtimeClient = {
  channel: (
    name: string,
    opts?: MessagingRealtimeChannelOptions,
  ) => unknown;
  /**
   * Matches installed `SupabaseClient.removeChannel(RealtimeChannel)` under
   * parameter contravariance: callers pass the channel object returned from
   * `channel()`; helpers cast that local handle with `as never`.
   */
  removeChannel: (channel: never) => unknown;
  removeAllChannels: () => unknown;
};

/** Must match migration realtime.send event + topic helper. */
export const ORG_WORKER_REACTIONS_BROADCAST_EVENT = 'reaction_changed';
export const ORG_WORKER_REACTIONS_BROADCAST_TOPIC_PREFIX = 'org-worker-reactions:';

export function orgWorkerReactionsBroadcastTopic(
  conversationId: string,
): string | null {
  if (!isMessagingUuid(conversationId)) return null;
  return `${ORG_WORKER_REACTIONS_BROADCAST_TOPIC_PREFIX}${conversationId}`;
}

export function messagingChannelName(
  kind: 'worker-inbox' | 'worker-thread' | 'org-thread' | 'org-badge',
  ids: { userId?: string; conversationId?: string; organizationId?: string },
): string | null {
  if (kind === 'worker-inbox' && ids.userId && isMessagingUuid(ids.userId)) {
    return `worker-inbox:${ids.userId}`;
  }
  if (kind === 'worker-thread' && ids.conversationId && isMessagingUuid(ids.conversationId)) {
    return `worker-messages:${ids.conversationId}`;
  }
  if (
    kind === 'org-thread' &&
    ids.organizationId &&
    ids.conversationId &&
    isMessagingUuid(ids.organizationId) &&
    isMessagingUuid(ids.conversationId)
  ) {
    return `org-messages:${ids.organizationId}:${ids.conversationId}`;
  }
  if (kind === 'org-badge' && ids.organizationId && isMessagingUuid(ids.organizationId)) {
    return `org-inbox-badge:${ids.organizationId}`;
  }
  return null;
}

let messagingRealtimeInstance = 0;

function nextMessagingRealtimeTopic(baseName: string): string {
  messagingRealtimeInstance += 1;
  const stamp =
    typeof globalThis.crypto !== 'undefined' &&
    typeof globalThis.crypto.randomUUID === 'function'
      ? globalThis.crypto.randomUUID()
      : `${Date.now()}-${messagingRealtimeInstance}`;
  return `${baseName}:${stamp}`;
}

/**
 * One shared Supabase client owns every realtime channel.
 * Sign-out must remove them all. The next signed-in screen creates new ones.
 * Shift lists are not channels; they refetch while a session is in the foreground.
 *
 * Channel topics are unique per subscribe call so overlapping screens
 * (home badge + inbox) never call `.on()` after an existing `subscribe()`.
 */
export function subscribeMessagingRealtime(input: {
  client: {
    channel: (name: string) => unknown;
    removeChannel: (channel: never) => unknown;
  };
  channelName: string | null;
  table: string;
  filter: string;
  event?: string;
  onChange: () => void;
  onSubscribed: () => void;
}): { unsubscribe: () => void } {
  if (!input.channelName) return { unsubscribe() {} };
  const topic = nextMessagingRealtimeTopic(input.channelName);
  const channel = (input.client.channel(topic) as RealtimeChannelLike)
    .on(
      'postgres_changes',
      {
        event: input.event ?? '*',
        schema: 'public',
        table: input.table,
        filter: input.filter,
      },
      () => input.onChange(),
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') input.onSubscribed();
    });
  return {
    unsubscribe() {
      void input.client.removeChannel(channel as never);
    },
  };
}

/**
 * Conversation-scoped private Broadcast for reaction set/clear.
 * Topic is exact (not stamped): Realtime Authorization + realtime.send require
 * the same topic string. Clients refetch summaries; they do not trust payload
 * fields as authorization.
 */
export function subscribeReactionBroadcast(input: {
  client: Pick<MessagingRealtimeClient, 'channel' | 'removeChannel'>;
  conversationId: string;
  onChange: () => void;
  onSubscribed: () => void;
}): { unsubscribe: () => void } {
  const topic = orgWorkerReactionsBroadcastTopic(input.conversationId);
  if (!topic) return { unsubscribe() {} };
  const channel = (
    input.client.channel(topic, {
      config: { private: true },
    }) as RealtimeChannelLike
  )
    .on(
      'broadcast',
      { event: ORG_WORKER_REACTIONS_BROADCAST_EVENT },
      () => input.onChange(),
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') input.onSubscribed();
    });
  return {
    unsubscribe() {
      void input.client.removeChannel(channel as never);
    },
  };
}

export async function clearSharedRealtimeSession(client: {
  removeAllChannels: () => unknown;
}): Promise<void> {
  await client.removeAllChannels();
}

export function signedInForegroundWork(input: {
  sessionPresent: boolean;
  verified: boolean;
  appState: string;
}): 'refresh-assignments' | 'idle' {
  if (!input.sessionPresent || !input.verified || input.appState !== 'active') return 'idle';
  return 'refresh-assignments';
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

/** Phone bubbles stay within this share of the row. Desktop threads cap line length in CSS. */
export const MESSAGING_BUBBLE_MAX_WIDTH_PERCENT = 78;

const MESSAGE_LINK_RE = /https?:\/\/[^\s<>"']+/gi;

export function messagingInitials(
  name: string | null | undefined,
  fallback = '?',
): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return fallback.slice(0, 2);
  const letters = parts.slice(0, 2).map((part) => Array.from(part)[0] ?? '');
  const value = letters.join('').toLocaleUpperCase();
  return value || fallback.slice(0, 2);
}

function localDayKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function messagingCalendarDay(iso: string): string | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return localDayKey(date);
}

export function shouldSeparateMessagingDay(
  previousIso: string | null | undefined,
  nextIso: string,
): boolean {
  if (!previousIso) return true;
  const previous = messagingCalendarDay(previousIso);
  const next = messagingCalendarDay(nextIso);
  if (!previous || !next) return false;
  return previous !== next;
}

export function messagingDayLabel(
  iso: string,
  locale: string,
  now = new Date(),
): string | null {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return null;
  const day = localDayKey(parsed);
  const today = localDayKey(now);
  const yesterdayDate = new Date(now);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = localDayKey(yesterdayDate);
  const greek = locale.toLowerCase().startsWith('el');
  if (day === today) return greek ? 'Σήμερα' : 'Today';
  if (day === yesterday) return greek ? 'Χθες' : 'Yesterday';
  return new Intl.DateTimeFormat(greek ? 'el-CY' : 'en-CY', {
    day: 'numeric',
    month: 'short',
    year: new Date(iso).getFullYear() === now.getFullYear() ? undefined : 'numeric',
  }).format(new Date(iso));
}

export function messagingClockLabel(iso: string | null | undefined, locale: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const greek = locale.toLowerCase().startsWith('el');
  return new Intl.DateTimeFormat(greek ? 'el-CY' : 'en-CY', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function messagingInboxTime(
  iso: string | null | undefined,
  locale: string,
  now = new Date(),
): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  if (localDayKey(date) === localDayKey(now)) {
    return messagingClockLabel(iso, locale);
  }
  const greek = locale.toLowerCase().startsWith('el');
  return new Intl.DateTimeFormat(greek ? 'el-CY' : 'en-CY', {
    day: 'numeric',
    month: 'short',
  }).format(date);
}

/** Incoming attribution stays on the first bubble of a sender run and after a day break. */
export function shouldShowMessagingSender(input: {
  mine: boolean;
  senderUserId: string;
  previousSenderUserId?: string | null;
  dayChanged: boolean;
}): boolean {
  if (input.mine) return false;
  if (input.dayChanged || !input.previousSenderUserId) return true;
  return input.previousSenderUserId !== input.senderUserId;
}

export function isOwnMessagingMessage(
  message: { senderUserId: string },
  currentUserId: string | null | undefined,
): boolean {
  return Boolean(currentUserId) && message.senderUserId === currentUserId;
}

export function shouldFollowMessageTail(input: {
  nearBottom: boolean;
  ownSend: boolean;
}): boolean {
  return input.nearBottom || input.ownSend;
}

export function composerSendsOnEnter(input: {
  key: string;
  shiftKey: boolean;
  composing: boolean;
}): boolean {
  if (input.composing) return false;
  return input.key === 'Enter' && !input.shiftKey;
}

export type MessageBodyPart = { type: 'text' | 'link'; value: string };

/** Plain-text segments only. Never treats the body as HTML. */
export function splitMessageBody(body: string): MessageBodyPart[] {
  const parts: MessageBodyPart[] = [];
  const pattern = new RegExp(MESSAGE_LINK_RE.source, 'gi');
  let cursor = 0;
  for (const match of body.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > cursor) parts.push({ type: 'text', value: body.slice(cursor, index) });
    const value = match[0].replace(/[),.;]+$/g, '');
    const trailing = match[0].slice(value.length);
    if (value) parts.push({ type: 'link', value });
    if (trailing) parts.push({ type: 'text', value: trailing });
    cursor = index + match[0].length;
  }
  if (cursor < body.length) parts.push({ type: 'text', value: body.slice(cursor) });
  if (!parts.length) parts.push({ type: 'text', value: body });
  const merged: MessageBodyPart[] = [];
  for (const part of parts) {
    const previous = merged[merged.length - 1];
    if (previous && previous.type === 'text' && part.type === 'text') {
      previous.value += part.value;
    } else {
      merged.push(part);
    }
  }
  return merged;
}
