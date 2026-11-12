import {
  isMessagingReactionsUnavailableError,
  isOrgWorkerReactionKey,
  parseReactionSummaries,
  type OrgWorkerMessageReactionSummary,
  type OrgWorkerReactionKey,
} from '@bridge-hive/domain';

import type { createClient } from '@/lib/supabase/client';

type SupabaseClient = ReturnType<typeof createClient>;

let reactionsUnavailableLogged = false;

function noteUnavailable(message: string | null | undefined) {
  if (!isMessagingReactionsUnavailableError(message)) return false;
  if (!reactionsUnavailableLogged) {
    reactionsUnavailableLogged = true;
    console.warn('[org-messages] reactions unavailable; hiding reaction UI', message);
  }
  return true;
}

export function areOrgMessagingReactionsUnavailable() {
  return reactionsUnavailableLogged;
}

export async function listOrgMessageReactionSummaries(
  supabase: SupabaseClient,
  messageIds: string[],
): Promise<{
  data: OrgWorkerMessageReactionSummary[];
  error: string | null;
  unavailable: boolean;
}> {
  if (!messageIds.length) {
    return { data: [], error: null, unavailable: false };
  }
  const { data, error } = await supabase.rpc(
    'list_org_worker_message_reaction_summaries' as never,
    { p_message_ids: messageIds } as never,
  );
  if (error) {
    return {
      data: [],
      error: error.message,
      unavailable: noteUnavailable(error.message),
    };
  }
  return { data: parseReactionSummaries(data), error: null, unavailable: false };
}

export async function setOrgMessageReaction(
  supabase: SupabaseClient,
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
      unavailable: noteUnavailable(error.message),
    };
  }
  return { error: null as string | null, unavailable: false };
}

export async function clearOrgMessageReaction(
  supabase: SupabaseClient,
  messageId: string,
) {
  const { error } = await supabase.rpc(
    'clear_org_worker_message_reaction' as never,
    { p_message_id: messageId } as never,
  );
  if (error) {
    return {
      error: error.message,
      unavailable: noteUnavailable(error.message),
    };
  }
  return { error: null as string | null, unavailable: false };
}
