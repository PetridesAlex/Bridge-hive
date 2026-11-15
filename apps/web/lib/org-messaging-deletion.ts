import { isMessagingDeleteUnavailableError } from '@bridge-hive/domain';

import type { createClient } from '@/lib/supabase/client';

type SupabaseClient = ReturnType<typeof createClient>;

let deleteUnavailable = false;

function noteUnavailable(message: string | null | undefined) {
  if (!isMessagingDeleteUnavailableError(message)) return false;
  if (!deleteUnavailable) {
    deleteUnavailable = true;
    console.warn('[org-messages] delete unavailable; hiding delete controls', message);
  }
  return true;
}

export function areOrgMessagingDeletesUnavailable() {
  return deleteUnavailable;
}

export async function deleteOrgMessage(supabase: SupabaseClient, messageId: string) {
  const { error } = await supabase.rpc(
    'delete_org_worker_message' as never,
    { p_message_id: messageId } as never,
  );
  if (error) {
    return { error: error.message, unavailable: noteUnavailable(error.message) };
  }
  return { error: null as string | null, unavailable: false };
}

export async function clearOrgConversation(
  supabase: SupabaseClient,
  conversationId: string,
) {
  const { error } = await supabase.rpc(
    'clear_org_worker_conversation' as never,
    { p_conversation_id: conversationId } as never,
  );
  if (error) {
    return { error: error.message, unavailable: noteUnavailable(error.message) };
  }
  return { error: null as string | null, unavailable: false };
}
