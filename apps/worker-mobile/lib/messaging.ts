import {
  isMessagingReactionsUnavailableError,
  isOrgWorkerReactionKey,
  messageListRpcArgs,
  parseReactionSummaries,
  type OrgWorkerConversationSummary,
  type OrgWorkerMessageReactionSummary,
  type OrgWorkerMessageRow,
  type OrgWorkerReactionKey,
} from '@bridge-hive/domain';

import { supabase } from '@/lib/supabase';

let reactionsUnavailableLogged = false;

function noteReactionsUnavailable(errorMessage: string | null | undefined) {
  if (!isMessagingReactionsUnavailableError(errorMessage)) return false;
  if (!reactionsUnavailableLogged) {
    reactionsUnavailableLogged = true;
    console.warn('[messaging] reactions unavailable; hiding reaction UI', errorMessage);
  }
  return true;
}

function parseConversations(value: unknown): OrgWorkerConversationSummary[] {
  if (!Array.isArray(value)) return [];
  return value.filter((row): row is OrgWorkerConversationSummary => {
    if (!row || typeof row !== 'object') return false;
    const c = row as Partial<OrgWorkerConversationSummary>;
    return typeof c.id === 'string' && typeof c.organizationId === 'string';
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

function mapMessageRow(raw: Record<string, unknown>): OrgWorkerMessageRow {
  return {
    id: String(raw.id),
    conversationId: String(raw.conversationId ?? raw.conversation_id ?? ''),
    senderUserId: String(raw.senderUserId ?? raw.sender_user_id ?? ''),
    senderKind: (raw.senderKind ?? raw.sender_kind) === 'organization_staff'
      ? 'organization_staff'
      : 'worker',
    body: String(raw.body ?? ''),
    clientMessageId: String(raw.clientMessageId ?? raw.client_message_id ?? ''),
    createdAt: String(raw.createdAt ?? raw.created_at ?? new Date().toISOString()),
    senderName:
      typeof raw.senderName === 'string'
        ? raw.senderName
        : typeof raw.sender_name === 'string'
          ? raw.sender_name
          : null,
  };
}

export async function listMyMessagingConversations() {
  const { data, error } = await supabase.rpc(
    'list_org_worker_conversations' as never,
    {
      p_organization_id: null,
      p_limit: 100,
    } as never,
  );
  if (error) return { data: [] as OrgWorkerConversationSummary[], error: error.message };
  return { data: parseConversations(data) };
}

export async function listConversationMessages(
  conversationId: string,
  cursor?: { createdAt: string; id: string } | null,
) {
  const { data, error } = await supabase.rpc(
    'list_org_worker_messages' as never,
    {
      ...messageListRpcArgs(conversationId, cursor),
    } as never,
  );
  if (error) return { data: [] as OrgWorkerMessageRow[], error: error.message };
  return { data: parseMessages(data) };
}

export async function getOrCreateConversation(organizationId: string, workerId: string) {
  const { data, error } = await supabase.rpc(
    'get_or_create_org_worker_conversation' as never,
    {
      p_organization_id: organizationId,
      p_worker_id: workerId,
    } as never,
  );
  if (error) return { data: null as { id: string } | null, error: error.message };
  const row = data as { id?: string } | null;
  if (!row?.id) return { data: null, error: 'CONVERSATION_CREATE_FAILED' };
  return { data: { id: row.id }, error: null as string | null };
}

export async function sendConversationMessage(
  conversationId: string,
  body: string,
  clientMessageId: string,
) {
  const { data, error } = await supabase.rpc(
    'send_org_worker_message' as never,
    {
      p_conversation_id: conversationId,
      p_body: body,
      p_client_message_id: clientMessageId,
    } as never,
  );
  if (error) return { data: null as OrgWorkerMessageRow | null, error: error.message };
  if (!data || typeof data !== 'object') {
    return { data: null, error: 'SEND_FAILED' };
  }
  return { data: mapMessageRow(data as Record<string, unknown>), error: null as string | null };
}

export async function markConversationRead(conversationId: string, messageId: string) {
  const { error } = await supabase.rpc(
    'mark_org_worker_conversation_read' as never,
    {
      p_conversation_id: conversationId,
      p_message_id: messageId,
    } as never,
  );
  return { error: error?.message ?? null };
}

export async function isMessagingEligiblePair(organizationId: string, workerId: string) {
  const { data, error } = await supabase.rpc(
    'org_worker_messaging_eligible' as never,
    {
      p_organization_id: organizationId,
      p_worker_id: workerId,
    } as never,
  );
  if (error) return { eligible: false, error: error.message };
  return { eligible: Boolean(data), error: null as string | null };
}

export async function listMessageReactionSummaries(messageIds: string[]) {
  if (!messageIds.length) {
    return {
      data: [] as OrgWorkerMessageReactionSummary[],
      error: null as string | null,
      unavailable: false,
    };
  }
  const { data, error } = await supabase.rpc(
    'list_org_worker_message_reaction_summaries' as never,
    { p_message_ids: messageIds } as never,
  );
  if (error) {
    const unavailable = noteReactionsUnavailable(error.message);
    return {
      data: [] as OrgWorkerMessageReactionSummary[],
      error: error.message,
      unavailable,
    };
  }
  return {
    data: parseReactionSummaries(data),
    error: null as string | null,
    unavailable: false,
  };
}

export async function setMessageReaction(
  messageId: string,
  reactionKey: OrgWorkerReactionKey,
) {
  if (!isOrgWorkerReactionKey(reactionKey)) {
    return { error: 'INVALID_REACTION_KEY', unavailable: false };
  }
  const { error } = await supabase.rpc(
    'set_org_worker_message_reaction' as never,
    {
      p_message_id: messageId,
      p_reaction_key: reactionKey,
    } as never,
  );
  if (error) {
    return {
      error: error.message,
      unavailable: noteReactionsUnavailable(error.message),
    };
  }
  return { error: null as string | null, unavailable: false };
}

export async function clearMessageReaction(messageId: string) {
  const { error } = await supabase.rpc(
    'clear_org_worker_message_reaction' as never,
    { p_message_id: messageId } as never,
  );
  if (error) {
    return {
      error: error.message,
      unavailable: noteReactionsUnavailable(error.message),
    };
  }
  return { error: null as string | null, unavailable: false };
}

export function areMessagingReactionsUnavailable() {
  return reactionsUnavailableLogged;
}
