/**
 * Database types for Bridge Hive apps.
 *
 * Exports the generated schema types. `database.generated.ts` is committed so
 * Vercel / CI clean checkouts typecheck the same way as local machines that
 * have run `npm run db:types`.
 *
 * Regenerate after migrations: `npm run db:types`
 */
import type { Database } from './database.generated';

export type { Database, Json } from './database.generated';

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
