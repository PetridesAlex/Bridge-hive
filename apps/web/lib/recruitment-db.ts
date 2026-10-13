/**
 * Temporary access helpers until supabase-types are regenerated after 029.
 * Tables/RPCs exist only after migration 029 is applied.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type UntypedDb = SupabaseClient<any, 'public', any>;

export function asUntypedDb(client: SupabaseClient): UntypedDb {
  return client as UntypedDb;
}
