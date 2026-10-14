# Worker password recovery — hosted Supabase template steps

Apply these manually in the Supabase Dashboard for project `hfnymqjrbppculcofaag`. The agent does **not** change hosted Auth settings.

## Expo production environment

Set in EAS / production env for `@bridge-hive/worker-mobile`:

```
EXPO_PUBLIC_WEB_APP_URL=https://bridgehive.app
```

When this is a public Bridge Hive origin, mobile `resetPasswordForEmail` uses:

```
https://bridgehive.app/auth/confirm?next=%2Fauth%2Fworker%2Freset-password
```

Production builds never send localhost or loopback as `redirectTo`. If the web URL is missing or rejected, the app falls back to the native deep link `bridgehive://auth/worker/reset-password`.

## Redirect URL allow-list

Authentication → URL Configuration → Redirect URLs — add (keep existing org activation URLs):

- **Required production confirm redirect (exact):**
  - `https://bridgehive.app/auth/confirm?next=%2Fauth%2Fworker%2Freset-password`
- Also allow (prefix / related):
  - `https://bridgehive.app/auth/confirm`
  - `https://bridgehive.app/auth/worker/reset-password`
  - `bridgehive://auth/worker/reset-password`
  - `http://localhost:8081/auth/worker/reset-password` (Expo web local only)
  - `http://localhost:3000/auth/confirm` (local web only)
  - `http://localhost:3000/auth/worker/reset-password` (local web only)

**Do not put `token_hash` or other secrets into Redirect URL settings.** Tokens belong only in the email template query string.

Site URL may remain the web app origin (`https://bridgehive.app`). Do not force Site URL to `/activate-organization-account`.

## Reset Password email template

Authentication → Email Templates → **Reset Password**.

Preserve this safe template contract (`RedirectTo` already includes `/auth/confirm?next=…` from the app):

```html
<a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=recovery">Reset password</a>
```

Legacy SiteURL-only pattern (breaks when Site URL is localhost but the web app is on Vercel):

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/auth/worker/reset-password">Reset password</a>
```

Do **not** hard-code `next=/activate-organization-account` for worker resets.

## Invite / org activation templates

Leave organization invite / activation templates pointed at:

`…/auth/confirm?…&next=/activate-organization-account`

Worker recovery and org activation share `/auth/confirm`; `next` selects the destination. OTP is consumed only after the user taps Confirm on `/auth/confirm` (GET never verifies).

## After template change

1. From the worker app, open **Forgot password?** → polished recovery screen.
2. Submit an email — expect the generic success message (no account enumeration).
3. Open the email link → land on `/auth/confirm` → tap **Continue password reset**.
4. Set a new password (min 12, letter + number) on `/auth/worker/reset-password` or the native reset screen.
5. Sign in to the worker app with the new password.

## Related app code

- Domain helpers: `packages/domain/src/worker-password-recovery.ts`
- Mobile request: `apps/worker-mobile/app/auth/worker/forgot-password.tsx`
- Mobile `resetPasswordForEmail` redirect: `AuthProvider` + domain resolver
- Web confirm (GET safe / POST verify): `apps/web/app/auth/confirm`
- Web new password: `apps/web/app/auth/worker/reset-password`
- Domain allowlist: `WORKER_RECOVERY_NEXT_PATHS` in `packages/domain/src/organization-activation.ts`
