# Bridge Hive

Healthcare shift marketplace platform.

- **Worker mobile app** — Expo React Native (`apps/worker-mobile`)
- **Web** — Next.js organization + platform admin dashboard (`apps/web`)
- **Backend** — Supabase (Auth, Postgres, Storage, Realtime, Edge Functions)

## Repository layout

```
apps/
  worker-mobile/   # Expo React Native worker app
  web/             # Next.js organization + platform admin dashboard
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

## Phase 4 (current)

Platform admin dashboard in `apps/web` under `/admin`:

- Platform-admin sign-in (SQL-bootstrap roles only; no public registration)
- Worker directory and detail with verification / suspension actions
- Credential review queue with short-lived signed document URLs
- Cross-platform audit log
- Role separation: support, verifier, finance (placeholder), super admin

Migrations: `001`–`016` under `supabase/migrations/`.

### Platform admin bootstrap

After creating an Auth user, grant a platform role with the service role / SQL editor:

```sql
insert into public.platform_admin_roles (user_id, role)
values ('<auth-user-uuid>', 'platform_super_admin');
```

Then open `http://localhost:3000/admin/sign-in`.

**Dual-role rule:** a user may hold both a platform admin role and a worker profile. Admin authorization always comes from `platform_admin_roles`. RPCs block self-verification of the same user's own credentials/worker profile.

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

# Organization / admin web
cp apps/web/.env.local.example apps/web/.env.local
# Fill NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY from `npx supabase status`
npm run web
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
