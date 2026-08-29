# HealthBridge

Cyprus-first healthcare workforce marketplace — Phase 1 professional mobile app.

## Stack

- Expo SDK 54 (Expo Go compatible)
- React Native + TypeScript
- Expo Router
- Supabase (`@supabase/supabase-js` + `expo-sqlite` session storage)
- Zustand (local state)
- Inter + Plus Jakarta Sans
- Brand: Navy `#071A2F` · Blue `#1769E0` · Yellow `#F5B000`

## Environment

Copy `.env.example` to `.env` and set:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Restart Expo after changing env vars (`npx expo start -c`).

## Auth setup (required once)

1. Open [Supabase SQL Editor](https://supabase.com/dashboard/project/eeyoafswkhncojfqixsb/sql)
2. If this is a fresh project, run `supabase/SETUP.sql` first.
3. Then run **`supabase/migrations/003_account_architecture.sql`** (account types, professional_profiles, organizations, members).
4. Optional for testing: **Authentication → Providers → Email → Confirm email → Off**
5. Open the app Welcome screen and continue as Professional or Organization.

Sessions persist via AsyncStorage / web localStorage. Sign out is on Profile / Org settings.

## Start

```bash
npx expo start
```

Scan the QR code with **Expo Go** (App Store / Play Store — SDK 54).

## Phase status

- Auth: Supabase email/password + `profiles` table (RLS)
- App data (shifts, community, finances): still local mock until migrated
- Profile UI reads the authenticated member / profile row
