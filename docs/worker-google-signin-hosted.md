# Worker Google Sign-In — hosted staging setup

Agent does **not** enable Google in the hosted project or paste Client secrets into the repo / chat.

Project ref host: `hfnymqjrbppculcofaag.supabase.co`
App scheme: `bridgehive`
OAuth method: **browser-based** Supabase Auth (`signInWithOAuth` + system browser). No native Google SDK; no Android SHA-1 / iOS native client IDs required for this version.

## Exact redirect URI strings (this repository)

### Google Cloud → OAuth client → Authorized redirect URIs

Put **only** the Supabase Auth callback (Google redirects here first):

```text
https://hfnymqjrbppculcofaag.supabase.co/auth/v1/callback
```

Do **not** put `bridgehive://…` or `localhost:8081` in Google’s redirect field.

### Supabase → Authentication → URL Configuration → Redirect URLs

**Add** (keep existing organization Site URL and `http://localhost:3000/**`):

```text
bridgehive://auth/callback
http://localhost:8081/auth/callback
```

Expo web `makeRedirectUri` may also emit an `exp://` URL during some Expo Go sessions; prefer a **development build** for native OAuth. If you see a specific Expo tunnel URI in logs while testing, add that exact string to the allow-list — never share tokens.

### Origins (do not confuse them)

| Step | URL |
|------|-----|
| Google → Supabase | `https://hfnymqjrbppculcofaag.supabase.co/auth/v1/callback` |
| Supabase → worker app | `bridgehive://auth/callback` |
| Expo web (local) | `http://localhost:8081/auth/callback` |
| Org / admin web | `http://localhost:3000/**` (unchanged) |

## Google Cloud Console

1. Google Auth Platform → branding (app name, support email).
2. Audience: **Testing**; add test users’ Google accounts.
3. Scopes: `openid`, `email`, `profile` only.
4. Create OAuth client type **Web application** (required for Supabase browser flow).
5. Authorized redirect URI: the Supabase callback above.
6. Copy Client ID and Client secret into Supabase Dashboard only.

## Supabase Dashboard

1. Authentication → Providers → **Google**: paste Client ID + secret; leave **disabled** until ready to test, then enable.
2. Never put the Client secret in `EXPO_PUBLIC_*`, committed `.env`, or Cursor chat.
3. Identity linking: for an existing email/password worker with the **same verified email**, Supabase may attach Google to the **same Auth UID**. Confirm linking settings match your security policy before production. Do not manually merge by email in app code.

## App behavior (already in code)

- Login / Join: **Continue with Google**.
- New Google user → **Choose role** (RN or Ward) + name/phone → Account Setup (docs, payout, admin).
- Existing worker profile → route by verification status.
- Org / platform admin Google account → rejected in the worker app (no worker profile created).
- Marketplace / claim still require server eligibility — OAuth alone never unlocks shifts.

## Testing mode vs production

- Testing: only listed Google test users can sign in.
- Before production: OAuth consent verification, production audience, privacy policy URLs, and revoke unused test clients.
- Native OAuth must be validated on an **iOS/Android development build**, not Expo Go alone.

## Related docs (do not overwrite as a side effect)

- Password recovery: [`worker-password-recovery-hosted.md`](./worker-password-recovery-hosted.md)
- Email confirmation: [`worker-email-confirmation-hosted.md`](./worker-email-confirmation-hosted.md)

## iOS App Store release blocker (Guideline 4.8)

If Google is offered as a social login for the primary worker account, Apple generally requires an equivalent privacy-preserving login option (e.g. Sign in with Apple) unless a listed exception applies. **Email/password alone may not satisfy 4.8.** This pass does **not** implement Apple Sign-In. Treat Google-only social login as **not App Store–ready** until that decision is scoped.

## Stop before

- Enabling Google provider in production without review
- Committing secrets
- Applying migrations for Google (none required for this feature)
