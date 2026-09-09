# Bridge Hive

Healthcare shift marketplace platform.

- **Worker mobile app** — Expo React Native (`apps/worker-mobile`)
- **Web** — Next.js public site, organization dashboard, platform admin (`apps/web`, upcoming)
- **Backend** — Supabase (Auth, Postgres, Storage, Realtime, Edge Functions)

## Repository layout

```
apps/
  worker-mobile/   # Expo React Native worker app
  web/             # Next.js (public + org + admin) — placeholder
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

## Phase 2 (current)

Worker mobile app migrated into `apps/worker-mobile`, connected to Phase 1 schema:

- Worker auth (sign up / sign in / session persistence)
- Verification-gated marketplace
- Shift browse + `claim_shift`
- Credentials metadata
- Check-in / check-out + timesheet submit
- Payout status + masked IBAN payout account

Migrations: `001`–`014` under `supabase/migrations/`.

### Prerequisites

- [Supabase CLI](https://supabase.com/docs/guides/cli)
- Docker (for local Supabase)
- Node.js 20+
- Expo Go or iOS/Android simulator

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

### App identifiers (decision)

| Setting | Value |
| --- | --- |
| iOS bundle ID | `com.bridgehive.worker` |
| Android package | `com.bridgehive.worker` |
| URL scheme | `bridgehive` |
