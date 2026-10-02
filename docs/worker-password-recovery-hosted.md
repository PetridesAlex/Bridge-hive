# Worker password recovery — hosted Supabase template steps

Apply these manually in the Supabase Dashboard for project `hfnymqjrbppculcofaag`. The agent does **not** change hosted Auth settings.

## Redirect URL allow-list

Authentication → URL Configuration → Redirect URLs — add (keep existing org activation URLs):

- `bridgehive://auth/worker/reset-password`
- `http://localhost:8081/auth/worker/reset-password` (Expo web local)
- `https://<your-worker-web-host>/auth/worker/reset-password` when Expo web is hosted
- Web portal confirm + next (already used for org; worker next is allowlisted in app code):
  - `https://<web-app-host>/auth/confirm`
  - `https://<web-app-host>/auth/worker/reset-password`
  - `http://localhost:3000/auth/confirm`
  - `http://localhost:3000/auth/worker/reset-password`

Site URL may remain the web app origin. Do not force Site URL to `/activate-organization-account`.

## Reset Password email template

Authentication → Email Templates → **Reset Password**.

Preferred Confirm URL pattern after Preview redirect fix (RedirectTo already includes
`/auth/confirm?next=…` from the app — see [`org-activation-email-preview.md`](./org-activation-email-preview.md)):

```html
<a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=recovery">Reset password</a>
```

Legacy SiteURL-only pattern (breaks when Site URL is localhost but the web app is on Vercel):

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/auth/worker/reset-password">Reset password</a>
```

Set `EXPO_PUBLIC_WEB_APP_URL` to the web Preview/production origin so mobile
`resetPasswordForEmail` passes a web `/auth/confirm?next=/auth/worker/reset-password`
RedirectTo. Do **not** hard-code `next=/activate-organization-account` for worker resets.

## Invite / org activation templates

Leave organization invite / activation templates pointed at:

`…/auth/confirm?…&next=/activate-organization-account`

Worker recovery and org activation share `/auth/confirm`; `next` selects the destination.

## After template change

1. From the worker app, use Forgot password.
2. Open the email link — you should land on set-password (web `/auth/worker/reset-password` or mobile deep link), **not** organization activation.
3. Set a new password and sign in to Account Setup / marketplace as appropriate.

## Related app code

- Mobile `resetPasswordForEmail` uses `redirectTo` → worker reset path (`AuthProvider`).
- Domain allowlist: `WORKER_RECOVERY_NEXT_PATHS` in `packages/domain/src/organization-activation.ts`.
- Migration `024` is unrelated to recovery; apply hosted separately when ready for package submit RPC.
