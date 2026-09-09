# Bridge Hive

Healthcare shift marketplace platform.

- **Worker mobile app** — Expo React Native (`apps/worker-mobile`)
- **Web** — Next.js organization dashboard (`apps/web`)
- **Backend** — Supabase (Auth, Postgres, Storage, Realtime, Edge Functions)

## Repository layout

```
apps/
  worker-mobile/   # Expo React Native worker app
  web/             # Next.js organization dashboard
packages/
  domain/          # Shared types, Zod schemas, money/time helpers
  supabase-types/  # Generated database types
supabase/
  migrations/      # SQL migrations (apply in order)
  tests/           # Database / RLS tests
  functions/       # Edge Functions (later phases)
_healthbridge-reference/  # Archived HealthBridge org/admin UX reference
docs/
  product-decisions.md
  schema.md
```

## Phase 3 (current)

Organization web dashboard in `apps/web`:

- Organization sign-in with SSR cookie sessions (`@supabase/ssr`)
- Multi-organization selection
- Locations and wards management (role-gated)
- Shift draft create/edit, publish via `publish_shift` RPC
- Shift detail with assignments and timesheet review via `review_timesheet`

Migrations: `001`–`014` under `supabase/migrations/`.

### Prerequisites

- [Supabase CLI](https://supabase.com/docs/guides/cli)
- Docker (for local Supabase)
- Node.js 20+
- Expo Go or iOS/Android simulator (worker app)

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

# Worker mobile
cp .env.example apps/worker-mobile/.env
# Fill EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY from `npx supabase status`
cd apps/worker-mobile
npm start

# Organization web
cp apps/web/.env.local.example apps/web/.env.local
# Fill NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY from `npx supabase status`
npm run web
```

### Platform admin bootstrap

After creating an Auth user, grant a platform role with the service role / SQL editor:

```sql
insert into public.platform_admin_roles (user_id, role)
values ('<auth-user-uuid>', 'platform_super_admin');
```

### Organization membership bootstrap

Org creation and invites are not client-writable (RLS). Seed pilot memberships via SQL:

```sql
insert into public.organizations (legal_name, display_name, slug, status)
values ('Test Hospital', 'Test Hospital', 'test-hospital', 'active');

insert into public.organization_members (organization_id, user_id, role, status, accepted_at)
values ('<org-id>', '<auth-user-uuid>', 'org_admin', 'active', now());
```

### Environment

Copy `.env.example` and fill values from `npx supabase status` (local) or the Supabase dashboard (hosted).

Never put the service-role key in client apps.

### App identifiers (decision)

| Setting | Value |
| --- | --- |
| iOS bundle ID | `com.bridgehive.worker` |
| Android package | `com.bridgehive.worker` |
| URL scheme | `bridgehive` |
