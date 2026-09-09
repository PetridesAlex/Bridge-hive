# Bridge Hive Worker Mobile

Expo React Native app for nurses and ward assistants.

## Prerequisites

- Node.js 20+
- npm
- Expo Go app or iOS/Android simulator
- Local Supabase running from the repo root (`npx supabase start`)

## Setup

```bash
# From repo root
npm install

# Copy env values from `npx supabase status`
cp .env.example apps/worker-mobile/.env
# Fill EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY

cd apps/worker-mobile
npm start
```

## Scripts

| Command | Description |
| --- | --- |
| `npm start` | Start Expo dev server |
| `npm run ios` | Open iOS simulator |
| `npm run android` | Open Android emulator |
| `npm run web` | Start web preview |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | ESLint via Expo |

## Identifiers (decision)

| Setting | Value |
| --- | --- |
| Bundle ID (iOS) | `com.bridgehive.worker` |
| Package (Android) | `com.bridgehive.worker` |
| Scheme | `bridgehive` |

These are provisional Bridge Hive identifiers and can be changed before production builds.

## Credential Data Integrity

**Document upload is deferred to a future phase.** The Credentials screen currently displays existing credential records but does not allow creating new ones until file upload is implemented.

### Removing Invalid Test Records

If you created credential records during early testing (before this integrity fix), they may have `storage_path` values that don't point to real Storage objects. To safely remove these invalid records in local development:

```sql
-- Option 1: Delete all credentials for a specific worker (local dev only)
delete from public.credentials where worker_id = 'your-worker-user-id';

-- Option 2: Delete a specific credential by ID (local dev only)
delete from public.credentials where id = 'credential-uuid';

-- Option 3: Reset all test data (local dev only)
-- From repo root:
npx supabase db reset
```

**Note:** Never delete credential records in production without verifying with the platform admin. In production, credentials with missing Storage objects should be handled by the verification workflow (rejected with appropriate reason).
