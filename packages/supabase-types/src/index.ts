/**
 * Database types generated from local Supabase schema.
 * Regenerate: `npm run db:types`
 */
import type { Database } from './database.generated';

export type { Database, Json } from './database.generated';

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
