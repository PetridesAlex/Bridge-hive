'use client';

import {
  applyOptimisticReaction,
  canReactToMessage,
  clampMessageDraft,
  filterConversationsByQuery,
  insertTextAtSelection,
  mergeMessagePage,
  mergeReactionSummaries,
  messagePreview,
  messagingChannelName,
  messagingClockLabel,
  messagingDayLabel,
  messagingInboxTime,
  messagingInitials,
  normalizeMessageBody,
  ORG_WORKER_MESSAGE_MAX_LENGTH,
  ORG_WORKER_REACTION_EMOJI,
  ORG_WORKER_REACTION_KEYS,
  shouldSeparateMessagingDay,
  shouldShowMessagingSender,
  subscribeMessagingRealtime,
  subscribeReactionBroadcast,
  unicodeCharLength,
  workerRoleLabelForMessaging,
  type OrgWorkerConversationSummary,
  type OrgWorkerMessageReactionSummary,
  type OrgWorkerMessageRow,
  type OrgWorkerReactionKey,
} from '@bridge-hive/domain';
import {
  MessageSquare,
  RefreshCw,
  Search,
  SendHorizonal,
  ShieldCheck,
  Smile,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  areOrgMessagingReactionsUnavailable,
  clearOrgMessageReaction,
  listOrgMessageReactionSummaries,
  setOrgMessageReaction,
} from '@/lib/org-messaging-reactions';
import { orgMessagesCopy, type OrgMessagesLocale } from '@/lib/org-messages-i18n';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

const ComposerEmojiPopover = dynamic(
  () =>
    import('@/components/org/composer-emoji-popover').then(
      (mod) => mod.ComposerEmojiPopover,
    ),
  { ssr: false },
);

type Props = {
  organizationId: string;
  currentUserId: string;
  locale?: OrgMessagesLocale;
  initialConversationId?: string | null;
};

type LocalMessage = OrgWorkerMessageRow & {
  localStatus?: 'pending' | 'failed' | 'sent';
};

function parseConversations(value: unknown): OrgWorkerConversationSummary[] {
  if (!Array.isArray(value)) return [];
  return value.filter((row): row is OrgWorkerConversationSummary => {
    if (!row || typeof row !== 'object') return false;
    const c = row as Partial<OrgWorkerConversationSummary>;
    return typeof c.id === 'string' && typeof c.workerId === 'string';
  });
}

function parseMessages(value: unknown): OrgWorkerMessageRow[] {
  if (!Array.isArray(value)) return [];
  return value.filter((row): row is OrgWorkerMessageRow => {
    if (!row || typeof row !== 'object') return false;
    const m = row as Partial<OrgWorkerMessageRow>;
    return (
      typeof m.id === 'string' &&
      typeof m.body === 'string' &&
      typeof m.clientMessageId === 'string' &&
      typeof m.createdAt === 'string'
    );
  });
}

function WorkerAvatar({
  name,
  size = 'md',
  tone = 'navy',
}: {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  tone?: 'navy' | 'teal' | 'honey';
}) {
  const dim =
    size === 'lg' ? 'h-11 w-11 text-[13px]' : size === 'sm' ? 'h-8 w-8 text-[11px]' : 'h-10 w-10 text-xs';
  const gradient =
    tone === 'teal'
      ? 'from-[#0e4a5c] via-[#148a96] to-[#16a6b6]'
      : tone === 'honey'
        ? 'from-[#0b2a43] via-[#123a5c] to-[#c99212]'
        : 'from-[#071d30] via-[#0b2a43] to-[#0e4a5c]';

  return (
    <span
      aria-hidden
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br font-semibold tracking-[0.04em] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_8px_16px_rgba(7,29,48,0.18)] ring-1 ring-white/20',
        dim,
        gradient,
      )}
    >
      {messagingInitials(name, 'W')}
    </span>
  );
}

export function OrgMessagesWorkspace({
  organizationId,
  currentUserId,
  locale = 'en',
  initialConversationId = null,
}: Props) {
  const copy = orgMessagesCopy(locale);
  const supabase = useMemo(() => createClient(), []);
  const [conversations, setConversations] = useState<OrgWorkerConversationSummary[]>(
    [],
  );
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(initialConversationId);
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [inboxLoading, setInboxLoading] = useState(true);
  const [threadLoading, setThreadLoading] = useState(false);
  const [inboxError, setInboxError] = useState<string | null>(null);
  const [threadError, setThreadError] = useState<string | null>(null);
  const [online, setOnline] = useState(true);
  const [reactionSummaries, setReactionSummaries] = useState<
    Record<string, OrgWorkerMessageReactionSummary>
  >({});
  const [reactionsEnabled, setReactionsEnabled] = useState(true);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [reactMenuFor, setReactMenuFor] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const messagesRef = useRef<LocalMessage[]>([]);
  const reactionGenRef = useRef<Record<string, number>>({});
  const reactionSnapshotRef = useRef<
    Record<string, OrgWorkerMessageReactionSummary | undefined>
  >({});
  messagesRef.current = messages;

  const filtered = useMemo(
    () => filterConversationsByQuery(conversations, query),
    [conversations, query],
  );
  const selected = conversations.find((c) => c.id === selectedId) ?? null;
  const unreadTotal = useMemo(
    () => conversations.reduce((sum, row) => sum + Math.max(0, row.unreadCount), 0),
    [conversations],
  );
  const draftLength = unicodeCharLength(draft);
  const canSend = draft.trim().length > 0 && online;
  const showDraftMeter = draftLength >= ORG_WORKER_MESSAGE_MAX_LENGTH - 200;

  useEffect(() => {
    const el = composerRef.current;
    if (!el) return;
    // Grow inside the fixed shell only — outer panel height stays locked.
    el.style.height = '40px';
    const next = Math.min(Math.max(el.scrollHeight, 40), 112);
    el.style.height = `${next}px`;
  }, [draft]);

  const loadInbox = useCallback(async () => {
    setInboxLoading(true);
    setInboxError(null);
    const { data, error } = await supabase.rpc(
      'list_org_worker_conversations' as never,
      {
        p_organization_id: organizationId,
        p_limit: 100,
      } as never,
    );
    if (error) {
      setInboxError(error.message);
      setConversations([]);
    } else {
      setConversations(parseConversations(data));
    }
    setInboxLoading(false);
  }, [organizationId, supabase]);

  const refreshReactions = useCallback(
    async (rows: OrgWorkerMessageRow[]) => {
      if (!reactionsEnabled || areOrgMessagingReactionsUnavailable()) {
        if (areOrgMessagingReactionsUnavailable()) setReactionsEnabled(false);
        return;
      }
      const ids = rows.filter((row) => canReactToMessage(row)).map((row) => row.id);
      if (!ids.length) return;
      const result = await listOrgMessageReactionSummaries(supabase, ids);
      if (result.unavailable) {
        setReactionsEnabled(false);
        return;
      }
      if (result.error) return;
      setReactionSummaries((prev) => {
        const merged = mergeReactionSummaries(Object.values(prev), result.data);
        const map: Record<string, OrgWorkerMessageReactionSummary> = { ...prev };
        for (const row of merged) map[row.messageId] = row;
        return map;
      });
    },
    [reactionsEnabled, supabase],
  );

  const loadThread = useCallback(
    async (conversationId: string) => {
      setThreadLoading(true);
      setThreadError(null);
      const { data, error } = await supabase.rpc(
        'list_org_worker_messages' as never,
        {
          p_conversation_id: conversationId,
          p_before_created_at: null,
          p_before_id: null,
          p_limit: 80,
        } as never,
      );
      if (error) {
        setThreadError(error.message);
        setMessages([]);
      } else {
        const rows = parseMessages(data);
        setMessages((prev) => {
          const pendingLocal = prev.filter(
            (m) =>
              m.conversationId === conversationId &&
              (m.localStatus === 'pending' || m.localStatus === 'failed'),
          );
          return mergeMessagePage(pendingLocal, rows) as LocalMessage[];
        });
        void refreshReactions(rows);
        const latest = rows[rows.length - 1];
        if (latest) {
          await supabase.rpc(
            'mark_org_worker_conversation_read' as never,
            {
              p_conversation_id: conversationId,
              p_message_id: latest.id,
            } as never,
          );
          setConversations((prev) =>
            prev.map((c) =>
              c.id === conversationId ? { ...c, unreadCount: 0 } : c,
            ),
          );
        }
      }
      setThreadLoading(false);
    },
    [refreshReactions, supabase],
  );

  useEffect(() => {
    void loadInbox();
  }, [loadInbox]);

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      setReactionSummaries({});
      setReactMenuFor(null);
      return;
    }
    void loadThread(selectedId);
  }, [selectedId, loadThread]);

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    setOnline(typeof navigator === 'undefined' ? true : navigator.onLine);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    const channelName = messagingChannelName('org-thread', {
      organizationId,
      conversationId: selectedId,
    });
    const messagesSub = subscribeMessagingRealtime({
      client: supabase,
      channelName,
      table: 'organization_worker_messages',
      filter: `conversation_id=eq.${selectedId}`,
      event: 'INSERT',
      onChange: () => {
        void loadThread(selectedId);
        void loadInbox();
      },
      onSubscribed: () => {
        void loadThread(selectedId);
      },
    });
    const reactionsSub = subscribeReactionBroadcast({
      client: supabase,
      conversationId: selectedId,
      onChange: () => {
        void refreshReactions(messagesRef.current);
      },
      onSubscribed: () => {
        void refreshReactions(messagesRef.current);
      },
    });
    return () => {
      messagesSub.unsubscribe();
      reactionsSub.unsubscribe();
    };
  }, [organizationId, selectedId, supabase, loadThread, loadInbox, refreshReactions]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, selectedId]);

  const sendMessage = async (clientMessageId: string, body: string) => {
    if (!selectedId) return;
    const { data, error } = await supabase.rpc(
      'send_org_worker_message' as never,
      {
        p_conversation_id: selectedId,
        p_body: body,
        p_client_message_id: clientMessageId,
      } as never,
    );
    if (error) {
      setMessages((prev) =>
        prev.map((m) =>
          m.clientMessageId === clientMessageId
            ? { ...m, localStatus: 'failed' }
            : m,
        ),
      );
      return;
    }
    const server = data as OrgWorkerMessageRow | null;
    if (server && typeof server === 'object' && 'id' in server) {
      setMessages((prev) =>
        mergeMessagePage(
          prev.filter((m) => m.clientMessageId !== clientMessageId),
          [
            {
              id: String((server as OrgWorkerMessageRow).id),
              conversationId: selectedId,
              senderUserId: String(
                (server as { sender_user_id?: string; senderUserId?: string })
                  .senderUserId ??
                  (server as { sender_user_id?: string }).sender_user_id ??
                  currentUserId,
              ),
              senderKind: 'organization_staff',
              body: String((server as OrgWorkerMessageRow).body ?? body),
              clientMessageId,
              createdAt: String(
                (server as { created_at?: string; createdAt?: string }).createdAt ??
                  (server as { created_at?: string }).created_at ??
                  new Date().toISOString(),
              ),
              senderName: copy.you,
              localStatus: 'sent',
            },
          ],
        ) as LocalMessage[],
      );
    } else {
      setMessages((prev) =>
        prev.map((m) =>
          m.clientMessageId === clientMessageId
            ? { ...m, localStatus: 'failed' }
            : m,
        ),
      );
      return;
    }
    void loadInbox();
  };

  const onSend = async () => {
    if (!selectedId) return;
    const normalized = normalizeMessageBody(draft);
    if (!normalized.ok) return;
    const clientMessageId =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `tmp-${Date.now()}`;
    const optimistic: LocalMessage = {
      id: `temp-${clientMessageId}`,
      conversationId: selectedId,
      senderUserId: currentUserId,
      senderKind: 'organization_staff',
      body: normalized.body,
      clientMessageId,
      createdAt: new Date().toISOString(),
      senderName: copy.you,
      localStatus: 'pending',
    };
    setMessages((prev) => [...prev, optimistic]);
    setDraft('');
    await sendMessage(clientMessageId, normalized.body);
  };

  const onRetry = async (message: LocalMessage) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.clientMessageId === message.clientMessageId
          ? { ...m, localStatus: 'pending' }
          : m,
      ),
    );
    await sendMessage(message.clientMessageId, message.body);
  };

  const insertEmojiAtCaret = (emoji: string) => {
    const el = composerRef.current;
    const start = el?.selectionStart ?? unicodeCharLength(draft);
    const end = el?.selectionEnd ?? start;
    // Convert UTF-16 offsets to code-point indexes for domain helper.
    const before = draft.slice(0, start);
    const afterEnd = draft.slice(0, end);
    const cpStart = unicodeCharLength(before);
    const cpEnd = unicodeCharLength(afterEnd);
    const next = insertTextAtSelection(draft, emoji, { start: cpStart, end: cpEnd });
    setDraft(next.value);
    requestAnimationFrame(() => {
      const node = composerRef.current;
      if (!node) return;
      node.focus();
      // Approximate caret as UTF-16 by reconstructing from code points.
      const caretStr = Array.from(next.value).slice(0, next.selection.start).join('');
      const caret = caretStr.length;
      node.setSelectionRange(caret, caret);
    });
  };

  const onToggleReaction = async (messageId: string, key: OrgWorkerReactionKey) => {
    if (!reactionsEnabled) return;
    const message = messages.find((row) => row.id === messageId);
    if (!message || !canReactToMessage(message)) return;
    const current = reactionSummaries[messageId];
    const mine = current?.reactions.find((chip) => chip.reactedByMe);
    const desired: OrgWorkerReactionKey | null = mine?.key === key ? null : key;
    const generation = (reactionGenRef.current[messageId] ?? 0) + 1;
    reactionGenRef.current[messageId] = generation;
    reactionSnapshotRef.current[messageId] = current;
    setReactionSummaries((prev) => ({
      ...prev,
      [messageId]: applyOptimisticReaction(prev[messageId], messageId, desired),
    }));
    const result =
      desired == null
        ? await clearOrgMessageReaction(supabase, messageId)
        : await setOrgMessageReaction(supabase, messageId, desired);
    if (reactionGenRef.current[messageId] !== generation) return;
    if (result.unavailable) {
      setReactionsEnabled(false);
    }
    if (result.error || result.unavailable) {
      setReactionSummaries((prev) => {
        const next = { ...prev };
        const snapshot = reactionSnapshotRef.current[messageId];
        if (snapshot) next[messageId] = snapshot;
        else delete next[messageId];
        return next;
      });
      return;
    }
    void refreshReactions(messages.filter((row) => row.id === messageId));
  };

  const selectedName = selected?.workerName?.trim() || 'Worker';
  const selectedRole = selected
    ? workerRoleLabelForMessaging(selected.workerRole, locale)
    : '';

  return (
    <div
      className="grid h-[min(44rem,calc(100dvh-11.5rem))] min-h-[28rem] w-full overflow-hidden rounded-[22px] border border-[rgba(11,42,67,0.10)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(247,251,253,0.98)_100%)] shadow-[0_22px_48px_rgba(7,29,48,0.08)] max-lg:grid-rows-[minmax(12rem,34%)_minmax(0,1fr)] lg:grid-cols-[minmax(16rem,20rem)_minmax(0,1fr)]"
    >
      <aside className="relative flex min-h-0 flex-col overflow-hidden border-b border-[rgba(11,42,67,0.08)] bg-[linear-gradient(180deg,#f4f8fb_0%,#eef4f8_100%)] lg:border-b-0 lg:border-r">
        <div className="border-b border-[rgba(11,42,67,0.08)] px-4 pb-3.5 pt-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-bh-teal-strong">
                {copy.inboxLabel}
              </p>
              <p className="mt-0.5 truncate text-sm font-semibold text-[#071d30]">
                {filtered.length} {copy.conversations}
                {unreadTotal > 0 ? (
                  <span className="ml-2 inline-flex items-center rounded-full bg-[#0b2a43] px-2 py-0.5 text-[10px] font-bold text-[#f3d27a]">
                    {unreadTotal > 99 ? '99+' : unreadTotal} {copy.unread}
                  </span>
                ) : null}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadInbox()}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[rgba(11,42,67,0.08)] bg-white/80 text-[#0b2a43] shadow-sm transition hover:-translate-y-0.5 hover:border-bh-teal/30 hover:text-bh-teal-strong"
              aria-label={copy.retry}
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>

          <label className="relative block">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-bh-teal-strong/80"
              aria-hidden
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={copy.searchPlaceholder}
              aria-label={copy.searchPlaceholder}
              className="h-11 w-full rounded-xl border border-[rgba(11,42,67,0.10)] bg-white/90 pl-10 pr-3 text-sm text-[#071d30] shadow-[0_6px_16px_rgba(7,29,48,0.04)] outline-none transition placeholder:text-bh-muted focus:border-bh-teal/40 focus:ring-2 focus:ring-bh-teal/20"
            />
          </label>

          {!online ? (
            <p className="mt-2 rounded-lg border border-bh-warning/30 bg-bh-warning-soft px-2.5 py-1.5 text-xs font-medium text-[#071d30]">
              {copy.offline}
            </p>
          ) : null}
          {inboxError ? (
            <button
              type="button"
              className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-bh-danger"
              onClick={() => void loadInbox()}
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden />
              {copy.retry}
            </button>
          ) : null}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
          {inboxLoading ? (
            <p className="px-3 py-4 text-sm text-bh-muted">{copy.loading}</p>
          ) : filtered.length === 0 ? (
            <div className="m-2 rounded-2xl border border-[rgba(11,42,67,0.08)] bg-white/80 px-5 py-8 text-center shadow-sm">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#0b2a43,#0e4a5c)] text-[#f3d27a] shadow-md">
                <MessageSquare className="h-5 w-5" aria-hidden />
              </span>
              <p className="mt-4 text-sm font-semibold text-[#071d30]">{copy.emptyInbox}</p>
              <p className="mt-1 text-xs leading-5 text-bh-muted">{copy.emptyInboxHint}</p>
            </div>
          ) : (
            <ul className="space-y-1">
              {filtered.map((c) => {
                const active = c.id === selectedId;
                const unread = c.unreadCount > 0;
                const name = c.workerName?.trim() || 'Worker';
                const role = workerRoleLabelForMessaging(c.workerRole, locale);
                const preview =
                  messagePreview(c.lastMessagePreview ?? '', 90) || '—';
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(c.id)}
                      className={cn(
                        'group relative flex w-full items-start gap-3 overflow-hidden rounded-2xl px-3 py-3 text-left transition duration-200',
                        active
                          ? 'bg-[linear-gradient(135deg,rgba(20,169,181,0.16),rgba(11,42,67,0.08))] shadow-[inset_0_0_0_1px_rgba(20,169,181,0.28)]'
                          : 'hover:bg-white/80 hover:shadow-[0_8px_18px_rgba(7,29,48,0.05)]',
                      )}
                    >
                      {unread ? (
                        <span
                          aria-hidden
                          className="absolute bottom-3 left-0 top-3 w-[3px] rounded-r-full bg-[#e4b334]"
                        />
                      ) : null}
                      <WorkerAvatar name={name} tone={unread ? 'honey' : 'navy'} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p
                              className={cn(
                                'truncate text-[14px] leading-5 tracking-[-0.01em] text-[#071d30]',
                                unread ? 'font-bold' : 'font-semibold',
                              )}
                            >
                              {name}
                            </p>
                            <p className="mt-0.5 truncate text-[11px] font-medium uppercase tracking-[0.08em] text-[rgba(11,42,67,0.48)]">
                              {role}
                            </p>
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-1">
                            <p
                              className={cn(
                                'text-[11px] tabular-nums',
                                unread
                                  ? 'font-semibold text-bh-teal-strong'
                                  : 'text-bh-muted',
                              )}
                            >
                              {messagingInboxTime(c.lastMessageAt, locale)}
                            </p>
                            {unread ? (
                              <span className="inline-flex min-w-[1.4rem] items-center justify-center rounded-full bg-[#0b2a43] px-1.5 py-0.5 text-[10px] font-bold text-[#f3d27a]">
                                {c.unreadCount > 99 ? '99+' : c.unreadCount}
                              </span>
                            ) : null}
                          </div>
                        </div>
                        <p
                          className={cn(
                            'mt-1.5 truncate text-[13px] leading-5',
                            unread
                              ? 'font-medium text-[#071d30]'
                              : 'text-[rgba(11,42,67,0.62)]',
                          )}
                        >
                          {preview}
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>

      <section className="relative flex min-h-0 flex-col overflow-hidden bg-[linear-gradient(180deg,#f7fbfd_0%,#ffffff_28%,#f3f8fb_100%)]">
        {!selected ? (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto px-6 text-center">
            <div className="relative max-w-md overflow-hidden rounded-[24px] border border-[rgba(11,42,67,0.10)] bg-[linear-gradient(160deg,#0b2a43_0%,#0e4a5c_55%,#0f6b6b_100%)] px-8 py-10 text-white shadow-[0_24px_48px_rgba(7,29,48,0.18)]">
              <span
                aria-hidden
                className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-[rgba(20,169,181,0.28)] blur-2xl"
              />
              <span
                aria-hidden
                className="pointer-events-none absolute -bottom-14 -left-8 h-32 w-32 rounded-full bg-[rgba(228,179,52,0.18)] blur-2xl"
              />
              <span className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[rgba(255,210,90,0.14)] ring-1 ring-[rgba(255,210,90,0.35)]">
                <MessageSquare className="h-6 w-6 text-[#f3d27a]" aria-hidden />
              </span>
              <p className="relative mt-5 text-lg font-semibold tracking-[-0.02em]">
                {copy.emptyThread}
              </p>
              <p className="relative mt-2 text-sm leading-6 text-white/70">
                {copy.emptyThreadHint}
              </p>
            </div>
          </div>
        ) : (
          <>
            <header className="relative z-[1] flex shrink-0 items-center gap-3 border-b border-[rgba(11,42,67,0.08)] bg-white/80 px-4 py-3 backdrop-blur-md sm:px-5 sm:py-4">
              <WorkerAvatar name={selectedName} size="lg" tone="teal" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-[17px] font-semibold tracking-[-0.02em] text-[#071d30]">
                    {selectedName}
                  </h2>
                  <span className="inline-flex items-center rounded-full border border-[rgba(20,169,181,0.22)] bg-[rgba(20,169,181,0.10)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-bh-teal-strong">
                    {selectedRole}
                  </span>
                </div>
                <p className="mt-0.5 text-xs font-medium text-[rgba(11,42,67,0.55)]">
                  {copy.directMessage}
                </p>
              </div>
            </header>

            <div className="min-h-0 flex-1 space-y-1 overflow-x-hidden overflow-y-auto px-4 py-4 sm:px-5">
              <div className="mb-4 flex items-start gap-2.5 rounded-2xl border border-[rgba(228,179,52,0.28)] bg-[linear-gradient(135deg,rgba(255,210,90,0.16),rgba(255,255,255,0.88))] px-3.5 py-3 text-xs leading-5 text-[#071d30] shadow-sm">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#c99212]" aria-hidden />
                <p>{copy.privacy}</p>
              </div>

              {threadLoading ? (
                <p className="px-1 text-sm text-bh-muted">{copy.loading}</p>
              ) : null}
              {threadError ? (
                <button
                  type="button"
                  className="text-xs font-semibold text-bh-danger"
                  onClick={() => selectedId && void loadThread(selectedId)}
                >
                  {copy.retry}
                </button>
              ) : null}

              {messages.map((m, index) => {
                const mine = m.senderUserId === currentUserId;
                const previous = index > 0 ? messages[index - 1] : null;
                const dayChanged = shouldSeparateMessagingDay(
                  previous?.createdAt,
                  m.createdAt,
                );
                const showSender = shouldShowMessagingSender({
                  mine,
                  previousSenderUserId: previous?.senderUserId ?? null,
                  senderUserId: m.senderUserId,
                  dayChanged,
                });
                const day = dayChanged
                  ? messagingDayLabel(m.createdAt, locale)
                  : null;
                const senderLabel = mine
                  ? copy.you
                  : m.senderKind === 'organization_staff'
                    ? m.senderName || copy.staff
                    : m.senderName || selectedName;

                return (
                  <div key={m.id}>
                    {day ? (
                      <div className="my-4 flex items-center gap-3">
                        <span className="h-px flex-1 bg-[rgba(11,42,67,0.08)]" />
                        <span className="rounded-full border border-[rgba(11,42,67,0.08)] bg-white/90 px-3 py-1 text-[11px] font-semibold tracking-[0.02em] text-[rgba(11,42,67,0.62)] shadow-sm">
                          {day}
                        </span>
                        <span className="h-px flex-1 bg-[rgba(11,42,67,0.08)]" />
                      </div>
                    ) : null}

                    <div
                      className={cn(
                        'group/msg relative flex gap-2.5 px-1 py-1.5',
                        mine ? 'justify-end' : 'justify-start',
                        !showSender && !mine ? 'pl-[46px]' : null,
                      )}
                    >
                      {!mine && showSender ? (
                        <WorkerAvatar name={senderLabel} size="sm" />
                      ) : null}
                      <div className="relative max-w-[min(78%,36rem)]">
                        <div
                          className={cn(
                            'rounded-2xl px-3.5 py-2.5 text-sm shadow-[0_8px_18px_rgba(7,29,48,0.06)]',
                            mine
                              ? 'rounded-br-md bg-[linear-gradient(160deg,#0b2a43_0%,#123a5c_100%)] text-white'
                              : 'rounded-bl-md border border-[rgba(11,42,67,0.08)] bg-white text-[#071d30]',
                          )}
                        >
                          {showSender ? (
                            <p
                              className={cn(
                                'mb-1 text-[11px] font-semibold',
                                mine ? 'text-white/75' : 'text-bh-teal-strong',
                              )}
                            >
                              {senderLabel}
                            </p>
                          ) : null}
                          <p className="whitespace-pre-wrap break-words leading-6">
                            {m.body}
                          </p>
                          <div
                            className={cn(
                              'mt-1.5 flex items-center justify-end gap-2 text-[10px]',
                              mine ? 'text-white/65' : 'text-bh-muted',
                            )}
                          >
                            <span>{messagingClockLabel(m.createdAt, locale)}</span>
                            {m.localStatus === 'pending' ? (
                              <span>{copy.pending}</span>
                            ) : null}
                            {m.localStatus === 'failed' ? (
                              <button
                                type="button"
                                className="font-semibold underline"
                                onClick={() => void onRetry(m)}
                              >
                                {copy.retry}
                              </button>
                            ) : null}
                          </div>
                        </div>
                        {reactionsEnabled && canReactToMessage(m) ? (
                          <div
                            className={cn(
                              'absolute -top-2 opacity-100 transition focus-within:opacity-100 sm:opacity-0 sm:group-hover/msg:opacity-100',
                              mine ? 'left-0' : 'right-0',
                            )}
                          >
                            <button
                              type="button"
                              className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[rgba(11,42,67,0.10)] bg-white text-[#0b2a43] shadow-sm hover:border-bh-teal/40"
                              aria-label={copy.react}
                              onClick={() =>
                                setReactMenuFor((prev) => (prev === m.id ? null : m.id))
                              }
                            >
                              <Smile className="h-3.5 w-3.5" aria-hidden />
                            </button>
                            {reactMenuFor === m.id ? (
                              <div className="absolute top-8 z-20 flex gap-1 rounded-xl border border-[rgba(11,42,67,0.10)] bg-white p-1.5 shadow-lg">
                                {ORG_WORKER_REACTION_KEYS.map((key) => {
                                  const mineChip = reactionSummaries[m.id]?.reactions.some(
                                    (chip) => chip.key === key && chip.reactedByMe,
                                  );
                                  return (
                                    <button
                                      key={key}
                                      type="button"
                                      className={cn(
                                        'flex h-8 w-8 items-center justify-center rounded-lg text-base hover:bg-[rgba(20,169,181,0.12)]',
                                        mineChip && 'bg-[rgba(20,169,181,0.16)]',
                                      )}
                                      aria-label={
                                        mineChip
                                          ? copy.clearReaction
                                          : ORG_WORKER_REACTION_EMOJI[key]
                                      }
                                      onClick={() => {
                                        void onToggleReaction(m.id, key);
                                        setReactMenuFor(null);
                                      }}
                                    >
                                      {ORG_WORKER_REACTION_EMOJI[key]}
                                    </button>
                                  );
                                })}
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                        {reactionSummaries[m.id]?.reactions.length ? (
                          <div
                            className={cn(
                              'mt-1.5 flex flex-wrap gap-1.5',
                              mine ? 'justify-end' : 'justify-start',
                            )}
                          >
                            {reactionSummaries[m.id]!.reactions.map((chip) => (
                              <button
                                key={`${m.id}-${chip.key}`}
                                type="button"
                                className={cn(
                                  'inline-flex items-center rounded-full border px-2 py-0.5 text-xs shadow-sm',
                                  chip.reactedByMe
                                    ? 'border-bh-teal/40 bg-[rgba(20,169,181,0.14)] text-[#0b2a43]'
                                    : 'border-[rgba(11,42,67,0.10)] bg-white text-[#071d30]',
                                )}
                                aria-pressed={chip.reactedByMe}
                                onClick={() => void onToggleReaction(m.id, chip.key)}
                              >
                                {chip.emoji} {chip.count}
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            <footer className="shrink-0 border-t border-[rgba(11,42,67,0.06)] bg-[#f0f4f7] px-3 py-2.5 sm:px-4">
              {!online ? (
                <p className="mb-2 px-1 text-[11px] font-medium text-[#b42318]">
                  {copy.offline}
                </p>
              ) : null}
              <div className="relative flex items-end gap-2">
                <div
                  className={cn(
                    'relative flex min-h-11 min-w-0 flex-1 items-end rounded-[22px] bg-white px-1.5 py-1 transition-[box-shadow,background-color] duration-200',
                    emojiOpen
                      ? 'ring-1 ring-[rgba(20,169,181,0.35)]'
                      : 'ring-1 ring-[rgba(11,42,67,0.06)] focus-within:ring-[rgba(20,169,181,0.28)]',
                  )}
                >
                  <button
                    type="button"
                    className={cn(
                      'mb-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[rgba(11,42,67,0.45)] transition hover:bg-[rgba(11,42,67,0.05)] hover:text-bh-teal-strong',
                      emojiOpen && 'bg-[rgba(20,169,181,0.12)] text-bh-teal-strong',
                    )}
                    aria-label={copy.insertEmoji}
                    aria-expanded={emojiOpen}
                    onClick={() => setEmojiOpen((open) => !open)}
                  >
                    <Smile className="h-[18px] w-[18px]" aria-hidden />
                  </button>
                  <ComposerEmojiPopover
                    open={emojiOpen}
                    title={copy.emojiPickerTitle}
                    searchLabel={copy.emojiSearch}
                    onClose={() => setEmojiOpen(false)}
                    onPick={insertEmojiAtCaret}
                  />
                  <textarea
                    ref={composerRef}
                    value={draft}
                    onChange={(e) => setDraft(clampMessageDraft(e.target.value))}
                    rows={1}
                    placeholder={copy.composerPlaceholder}
                    aria-label={copy.composerPlaceholder}
                    className="max-h-[7rem] min-h-10 flex-1 resize-none overflow-y-auto bg-transparent px-1.5 py-2 text-[15px] leading-5 text-[#071d30] outline-none placeholder:text-[rgba(11,42,67,0.38)]"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (canSend) void onSend();
                      }
                      if (e.key === 'Escape' && emojiOpen) {
                        e.preventDefault();
                        setEmojiOpen(false);
                      }
                    }}
                  />
                  {showDraftMeter ? (
                    <span
                      className={cn(
                        'mb-2 mr-1 shrink-0 text-[10px] font-semibold tabular-nums',
                        draftLength >= ORG_WORKER_MESSAGE_MAX_LENGTH
                          ? 'text-[#b42318]'
                          : 'text-[rgba(11,42,67,0.4)]',
                      )}
                      aria-live="polite"
                    >
                      {ORG_WORKER_MESSAGE_MAX_LENGTH - draftLength}
                    </span>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!canSend) return;
                    void onSend();
                  }}
                  disabled={!canSend}
                  aria-label={copy.send}
                  className={cn(
                    'mb-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all duration-200 ease-out',
                    canSend
                      ? 'scale-100 bg-[#148a96] text-white opacity-100 shadow-[0_6px_14px_rgba(20,138,150,0.28)] hover:bg-[#0e6f79] active:scale-95'
                      : 'pointer-events-none scale-90 bg-[rgba(11,42,67,0.08)] text-[rgba(11,42,67,0.28)] opacity-70',
                  )}
                >
                  <SendHorizonal className="h-4 w-4 translate-x-px" aria-hidden />
                </button>
              </div>
            </footer>
          </>
        )}
      </section>
    </div>
  );
}
