'use client';

import {
  canOrgStaffMessage,
  messagingChannelName,
  messageWorkerHref,
  subscribeMessagingRealtime,
  type OrgNavCapabilities,
  type OrgWorkerConversationSummary,
} from '@bridge-hive/domain';
import { useRouter } from 'next/navigation';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { toast } from 'sonner';

import { OrgMessageAlertToast } from '@/components/org/org-message-alert-toast';
import {
  createAlertDeduper,
  detectIncomingUnreadAlerts,
  ORG_MESSAGE_TOAST_BROADCAST,
  orgMessageAlertDedupKey,
  parseOrgConversationSummaries,
  shouldSuppressIncomingToast,
  unreadSnapshotBadge,
  unreadSnapshotTotal,
  type OrgMessagingUnreadStatus,
} from '@/lib/org-messaging-alerts';
import { orgMessagesCopy, type OrgMessagesLocale } from '@/lib/org-messages-i18n';
import { createClient } from '@/lib/supabase/client';

type OrgMessagingAlertsContextValue = {
  enabled: boolean;
  organizationId: string;
  slug: string;
  userId: string;
  conversations: OrgWorkerConversationSummary[];
  unreadTotal: number;
  unreadStatus: OrgMessagingUnreadStatus;
  badgeLabel: string | null;
  focusedConversationId: string | null;
  setFocusedConversationId: (id: string | null) => void;
  applyLocalRead: (conversationId: string) => void;
  patchConversations: (
    updater: (prev: OrgWorkerConversationSummary[]) => OrgWorkerConversationSummary[],
  ) => void;
  refreshInbox: () => Promise<void>;
  retry: () => void;
};

const OrgMessagingAlertsContext =
  createContext<OrgMessagingAlertsContextValue | null>(null);

export function useOrgMessagingAlerts(): OrgMessagingAlertsContextValue | null {
  return useContext(OrgMessagingAlertsContext);
}

export function useOrgMessagingAlertsRequired(): OrgMessagingAlertsContextValue {
  const value = useContext(OrgMessagingAlertsContext);
  if (!value) {
    throw new Error('useOrgMessagingAlertsRequired must be used within OrgMessagingAlertsProvider');
  }
  return value;
}

type Props = {
  organizationId: string;
  slug: string;
  userId: string;
  capabilities: OrgNavCapabilities;
  locale?: OrgMessagesLocale;
  children: ReactNode;
};

export function OrgMessagingAlertsProvider({
  organizationId,
  slug,
  userId,
  capabilities,
  locale = 'en',
  children,
}: Props) {
  const enabled = canOrgStaffMessage(capabilities);
  const router = useRouter();
  const copy = orgMessagesCopy(locale);
  const supabase = useMemo(() => createClient(), []);

  const [conversations, setConversations] = useState<OrgWorkerConversationSummary[]>(
    [],
  );
  const [unreadStatus, setUnreadStatus] = useState<OrgMessagingUnreadStatus>('idle');
  const [focusedConversationId, setFocusedConversationId] = useState<string | null>(
    null,
  );

  const generationRef = useRef(0);
  const baselineReadyRef = useRef(false);
  const previousRef = useRef<OrgWorkerConversationSummary[]>([]);
  const focusedRef = useRef<string | null>(null);
  const scopeRef = useRef({ organizationId, userId, slug });
  const deduperRef = useRef(createAlertDeduper());
  const toastOwnerIdRef = useRef(
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `tab-${Date.now()}`,
  );

  focusedRef.current = focusedConversationId;
  scopeRef.current = { organizationId, userId, slug };

  const unreadTotal = unreadSnapshotTotal(conversations);
  const badgeLabel =
    unreadStatus === 'error' && conversations.length === 0
      ? null
      : unreadSnapshotBadge(conversations);

  const resetScopeState = useCallback(() => {
    generationRef.current += 1;
    baselineReadyRef.current = false;
    previousRef.current = [];
    deduperRef.current.clear();
    setConversations([]);
    setUnreadStatus('idle');
    setFocusedConversationId(null);
  }, []);

  const showIncomingToast = useCallback(
    (alert: {
      conversationId: string;
      workerName: string | null;
      alertKey: string;
    }) => {
      const scope = scopeRef.current;
      const dedupKey = orgMessageAlertDedupKey({
        userId: scope.userId,
        organizationId: scope.organizationId,
        alertKey: alert.alertKey,
      });
      if (!deduperRef.current.claim(dedupKey)) return;

      try {
        const bc = new BroadcastChannel(ORG_MESSAGE_TOAST_BROADCAST);
        bc.postMessage({
          type: 'org-msg-toast',
          ownerId: toastOwnerIdRef.current,
          dedupKey,
        });
        bc.close();
      } catch {
        // BroadcastChannel unavailable — single-tab dedupe only.
      }

      const href = messageWorkerHref(scope.slug, alert.conversationId);
      const name = alert.workerName?.trim() || copy.alertWorkerFallback;
      const body = copy.alertBody.replace('{name}', name);
      toast.custom(
        (toastId) => (
          <OrgMessageAlertToast
            toastId={toastId}
            title={copy.alertTitle}
            body={body}
            actionLabel={copy.alertAction}
            onView={href ? () => router.push(href) : undefined}
          />
        ),
        {
          id: dedupKey,
          duration: 8_000,
          className: 'bh-org-msg-toast-wrap',
        },
      );
    },
    [copy.alertAction, copy.alertBody, copy.alertTitle, copy.alertWorkerFallback, router],
  );

  const applySnapshot = useCallback(
    (next: OrgWorkerConversationSummary[], generation: number) => {
      if (generation !== generationRef.current) return;
      const scope = scopeRef.current;
      if (
        next.some(
          (row) =>
            row.organizationId && row.organizationId !== scope.organizationId,
        )
      ) {
        // Drop cross-org rows if a stale response somehow mixes scopes.
        next = next.filter(
          (row) =>
            !row.organizationId || row.organizationId === scope.organizationId,
        );
      }

      const previous = previousRef.current;
      const baselineReady = baselineReadyRef.current;
      const alerts = detectIncomingUnreadAlerts({
        previous,
        next,
        baselineReady,
      });

      previousRef.current = next;
      setConversations(next);
      setUnreadStatus('ready');

      if (!baselineReady) {
        baselineReadyRef.current = true;
        return;
      }

      const tabVisible =
        typeof document === 'undefined'
          ? true
          : document.visibilityState === 'visible';

      for (const alert of alerts) {
        if (
          shouldSuppressIncomingToast({
            conversationId: alert.conversationId,
            focusedConversationId: focusedRef.current,
            tabVisible,
          })
        ) {
          continue;
        }
        showIncomingToast(alert);
      }
    },
    [showIncomingToast],
  );

  const refreshInbox = useCallback(async () => {
    if (!enabled) return;
    const generation = generationRef.current;
    const orgId = scopeRef.current.organizationId;
    const uid = scopeRef.current.userId;
    setUnreadStatus((prev) => (prev === 'ready' ? prev : 'loading'));

    const { data, error } = await supabase.rpc(
      'list_org_worker_conversations' as never,
      {
        p_organization_id: orgId,
        p_limit: 100,
      } as never,
    );

    if (generation !== generationRef.current) return;
    if (
      scopeRef.current.organizationId !== orgId ||
      scopeRef.current.userId !== uid
    ) {
      return;
    }

    if (error) {
      setUnreadStatus('error');
      // Keep last good conversations / counts — never coerce to zero.
      return;
    }

    applySnapshot(parseOrgConversationSummaries(data), generation);
  }, [applySnapshot, enabled, supabase]);

  const retry = useCallback(() => {
    void refreshInbox();
  }, [refreshInbox]);

  const applyLocalRead = useCallback((conversationId: string) => {
    setConversations((prev) => {
      const current = prev.find((row) => row.id === conversationId);
      if (!current || current.unreadCount === 0) return prev;
      const next = prev.map((row) =>
        row.id === conversationId ? { ...row, unreadCount: 0 } : row,
      );
      previousRef.current = next;
      return next;
    });
  }, []);

  const patchConversations = useCallback(
    (
      updater: (
        prev: OrgWorkerConversationSummary[],
      ) => OrgWorkerConversationSummary[],
    ) => {
      setConversations((prev) => {
        const next = updater(prev);
        previousRef.current = next;
        return next;
      });
    },
    [],
  );

  const refreshInboxRef = useRef(refreshInbox);
  refreshInboxRef.current = refreshInbox;

  // Scope reset when org/user changes or messaging disabled.
  useEffect(() => {
    resetScopeState();
    if (!enabled || !organizationId || !userId) return;
    void refreshInboxRef.current();
  }, [enabled, organizationId, userId, resetScopeState]);

  // Realtime org-badge channel + catch-up on subscribe / foreground / online.
  useEffect(() => {
    if (!enabled || !organizationId || !userId) return;

    const channelName = messagingChannelName('org-badge', { organizationId });
    const subscription = subscribeMessagingRealtime({
      client: supabase,
      channelName,
      table: 'organization_worker_conversations',
      filter: `organization_id=eq.${organizationId}`,
      event: '*',
      onChange: () => {
        void refreshInboxRef.current();
      },
      onSubscribed: () => {
        void refreshInboxRef.current();
      },
    });

    const onVisibility = () => {
      if (document.visibilityState === 'visible') void refreshInboxRef.current();
    };
    const onOnline = () => {
      void refreshInboxRef.current();
    };

    window.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('online', onOnline);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('online', onOnline);
    };
  }, [enabled, organizationId, userId, supabase]);

  // Cross-tab toast ownership: peer tabs mark the same dedup key claimed.
  useEffect(() => {
    if (!enabled) return;
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel(ORG_MESSAGE_TOAST_BROADCAST);
    } catch {
      return;
    }
    const ownerId = toastOwnerIdRef.current;
    bc.onmessage = (event: MessageEvent) => {
      const data = event.data as
        | { type?: string; ownerId?: string; dedupKey?: string }
        | null;
      if (!data || data.type !== 'org-msg-toast') return;
      if (data.ownerId === ownerId) return;
      if (typeof data.dedupKey !== 'string') return;
      deduperRef.current.claim(data.dedupKey);
    };
    return () => {
      bc?.close();
    };
  }, [enabled]);

  const value = useMemo<OrgMessagingAlertsContextValue>(
    () => ({
      enabled,
      organizationId,
      slug,
      userId,
      conversations,
      unreadTotal,
      unreadStatus,
      badgeLabel,
      focusedConversationId,
      setFocusedConversationId,
      applyLocalRead,
      patchConversations,
      refreshInbox,
      retry,
    }),
    [
      enabled,
      organizationId,
      slug,
      userId,
      conversations,
      unreadTotal,
      unreadStatus,
      badgeLabel,
      focusedConversationId,
      applyLocalRead,
      patchConversations,
      refreshInbox,
      retry,
    ],
  );

  return (
    <OrgMessagingAlertsContext.Provider value={value}>
      {children}
    </OrgMessagingAlertsContext.Provider>
  );
}
