'use client';

import {
  filterConversationsByQuery,
  mergeMessagePage,
  messagePreview,
  normalizeMessageBody,
  ORG_WORKER_MESSAGE_MAX_LENGTH,
  workerRoleLabelForMessaging,
  type OrgWorkerConversationSummary,
  type OrgWorkerMessageRow,
} from '@bridge-hive/domain';
import { MessageSquare, RefreshCw, SendHorizonal } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { orgMessagesCopy, type OrgMessagesLocale } from '@/lib/org-messages-i18n';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

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

function formatTime(iso: string | null | undefined, locale: OrgMessagesLocale) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat(locale === 'el' ? 'el-CY' : 'en-CY', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(d);
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
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);

  const filtered = useMemo(
    () => filterConversationsByQuery(conversations, query),
    [conversations, query],
  );
  const selected = conversations.find((c) => c.id === selectedId) ?? null;

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
    [supabase],
  );

  useEffect(() => {
    void loadInbox();
  }, [loadInbox]);

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
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
    const channel = supabase
      .channel(`org-messages:${selectedId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'organization_worker_messages',
          filter: `conversation_id=eq.${selectedId}`,
        },
        () => {
          void loadThread(selectedId);
          void loadInbox();
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [selectedId, supabase, loadThread, loadInbox]);

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

  return (
    <div className="grid min-h-[70vh] overflow-hidden rounded-2xl border border-bh-border bg-bh-surface shadow-[0_18px_40px_rgba(7,29,48,0.06)] lg:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="flex min-h-[320px] flex-col border-b border-bh-border lg:border-b-0 lg:border-r">
        <div className="border-b border-bh-border p-4">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={copy.searchPlaceholder}
            aria-label={copy.searchPlaceholder}
            className="h-11 rounded-xl border-bh-border bg-white"
          />
          {!online ? (
            <p className="mt-2 text-xs font-medium text-bh-warning">{copy.offline}</p>
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
        <div className="min-h-0 flex-1 overflow-y-auto">
          {inboxLoading ? (
            <p className="p-4 text-sm text-bh-muted">{copy.loading}</p>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-center">
              <MessageSquare className="mx-auto h-8 w-8 text-bh-teal" aria-hidden />
              <p className="mt-3 text-sm font-semibold text-[#071d30]">{copy.emptyInbox}</p>
              <p className="mt-1 text-xs text-bh-muted">{copy.emptyInboxHint}</p>
            </div>
          ) : (
            <ul className="divide-y divide-bh-border">
              {filtered.map((c) => {
                const active = c.id === selectedId;
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(c.id)}
                      className={cn(
                        'flex w-full flex-col gap-1 px-4 py-3.5 text-left transition',
                        active
                          ? 'bg-bh-teal-soft'
                          : 'hover:bg-[rgba(7,29,48,0.03)]',
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-[#071d30]">
                            {c.workerName?.trim() || 'Worker'}
                          </p>
                          <p className="truncate text-xs text-bh-muted">
                            {workerRoleLabelForMessaging(c.workerRole, locale)}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-[11px] text-bh-muted">
                            {formatTime(c.lastMessageAt, locale)}
                          </p>
                          {c.unreadCount > 0 ? (
                            <span className="mt-1 inline-flex min-w-[1.35rem] items-center justify-center rounded-full bg-bh-teal px-1.5 py-0.5 text-[10px] font-bold text-white">
                              {c.unreadCount > 99 ? '99+' : c.unreadCount}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <p className="truncate text-xs text-bh-muted">
                        {messagePreview(c.lastMessagePreview ?? '', 90) || '—'}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>

      <section className="flex min-h-[420px] flex-col">
        {!selected ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <MessageSquare className="h-10 w-10 text-bh-teal" aria-hidden />
            <p className="mt-3 text-base font-semibold text-[#071d30]">{copy.emptyThread}</p>
            <p className="mt-1 max-w-sm text-sm text-bh-muted">{copy.emptyThreadHint}</p>
          </div>
        ) : (
          <>
            <header className="border-b border-bh-border px-5 py-4">
              <p className="text-base font-semibold text-[#071d30]">
                {selected.workerName?.trim() || 'Worker'}
              </p>
              <p className="text-xs text-bh-muted">
                {workerRoleLabelForMessaging(selected.workerRole, locale)}
              </p>
            </header>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-[linear-gradient(180deg,#f7fbfd_0%,#ffffff_40%)] px-4 py-4 sm:px-5">
              <p className="rounded-xl border border-bh-honey-soft bg-bh-honey-soft/60 px-3 py-2 text-xs text-[#071d30]">
                {copy.privacy}
              </p>
              {threadLoading ? (
                <p className="text-sm text-bh-muted">{copy.loading}</p>
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
              {messages.map((m) => {
                const mine = m.senderUserId === currentUserId;
                return (
                  <div
                    key={m.id}
                    className={cn('flex', mine ? 'justify-end' : 'justify-start')}
                  >
                    <div
                      className={cn(
                        'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm',
                        mine
                          ? 'rounded-br-md bg-[#0b2a43] text-white'
                          : 'rounded-bl-md border border-bh-border bg-white text-[#071d30]',
                      )}
                    >
                      <p className="mb-1 text-[11px] font-semibold opacity-80">
                        {mine
                          ? copy.you
                          : m.senderKind === 'organization_staff'
                            ? m.senderName || copy.staff
                            : m.senderName || 'Worker'}
                      </p>
                      <p className="whitespace-pre-wrap break-words">{m.body}</p>
                      <div className="mt-1 flex items-center justify-end gap-2 text-[10px] opacity-70">
                        <span>{formatTime(m.createdAt, locale)}</span>
                        {m.localStatus === 'pending' ? <span>{copy.pending}</span> : null}
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
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
            <footer className="border-t border-bh-border p-4">
              <div className="flex items-end gap-2">
                <textarea
                  ref={composerRef}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value.slice(0, ORG_WORKER_MESSAGE_MAX_LENGTH))}
                  rows={2}
                  placeholder={copy.composerPlaceholder}
                  aria-label={copy.composerPlaceholder}
                  className="min-h-[52px] flex-1 resize-none rounded-xl border border-bh-border bg-white px-3 py-2.5 text-sm text-[#071d30] outline-none ring-bh-teal focus:ring-2"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      void onSend();
                    }
                  }}
                />
                <Button
                  type="button"
                  onClick={() => void onSend()}
                  disabled={!draft.trim() || !online}
                  className="h-11 rounded-xl bg-bh-teal px-4 text-white hover:bg-bh-teal-strong"
                >
                  <SendHorizonal className="h-4 w-4" aria-hidden />
                  <span className="sr-only">{copy.send}</span>
                </Button>
              </div>
            </footer>
          </>
        )}
      </section>
    </div>
  );
}
