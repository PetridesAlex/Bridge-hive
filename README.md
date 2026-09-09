# Bridge Hive

Healthcare shift marketplace platform.

- **Worker mobile app** — Expo (Phase 3+)
- **Web** — Next.js public site, organization dashboard, platform admin (Phase 2+)
- **Backend** — Supabase (Auth, Postgres, Storage, Realtime, Edge Functions)

## Repository layout

```
apps/
  worker-mobile/   # Expo React Native app
  web/             # Next.js (public + org + admin)
packages/
  domain/          # Shared types, Zod schemas, money/time helpers
  supabase-types/  # Generated database types
supabase/
  migrations/      # SQL migrations (apply in order)
  tests/           # Database / RLS tests
  functions/       # Edge Functions (later phases)
docs/
  product-decisions.md
```

## Phase 1 (current)

Database foundation: schema, RLS, claim/publish/review RPCs, financial pilot tables, indexes, and SQL tests. No product UI yet.

Migrations: `001`–`013` under `supabase/migrations/`.

### Prerequisites

- [Supabase CLI](https://supabase.com/docs/guides/cli)
- Docker (for local Supabase)

### Local setup

```bash
# Start local stack
npx supabase start

# Apply migrations
npx supabase db reset

# Generate types from the live schema
npm run db:types

# Run SQL tests
npm run test:db

# Package typecheck / lint
npm run typecheck
npm run lint
```

### Platform admin bootstrap

After creating an Auth user, grant a platform role with the service role / SQL editor:

```sql
insert into public.platform_admin_roles (user_id, role)
values ('<auth-user-uuid>', 'platform_super_admin');
```

### Environment

Copy `.env.example` and fill values from `npx supabase status` (local) or the Supabase dashboard (hosted).

Never put the service-role key in client apps.
