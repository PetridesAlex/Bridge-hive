# Organization activation emails — Preview redirect fix

## Live diagnosis (d6707fb Preview)

Verified against deployment `dpl_7286mUFUvY5hw9d6TAsgWF7JxpJj` (commit `d6707fb`,
alias `bridge-hive-git-phase-7-professional-ui-lynnz-projects.vercel.app`).
`APP_PUBLIC_URL` **exists** as a Preview env var (value not readable via API when
marked Sensitive).

**Proven cause of `{{ .RedirectTo }}` = `http://localhost:3000`:** GoTrue only
sets `RedirectTo` to the app-supplied `redirectTo` when that URL is on the Auth
**Redirect URLs** allowlist; otherwise it silently substitutes **Site URL**
(still `http://localhost:3000`). The Invite template
`{{ .RedirectTo }}&token_hash=…` then becomes the malformed
`http://localhost:3000&token_hash=…` (Site URL has no `?`).

The server builds
`{origin}/auth/confirm?next=%2Factivate-organization-account`. When `origin`
resolved to loopback (localhost fallback — e.g. `APP_PUBLIC_URL` loopback/empty
and/or System Env Vars not exposed so `VERCEL_BRANCH_URL`/`VERCEL_URL` missing),
that redirectTo is **not** the Preview allowlist entry, so GoTrue falls back to
Site URL. Browsing the Preview admin UI alone did not feed `getAppPublicUrl()`.

Resend uses the same `redirectTo`. New Auth emails use **Invite user**; emails
already in Auth use **Reset password** (recovery) — same redirect bug either way.

**Do not** change Site URL to Preview. **Do** ensure `APP_PUBLIC_URL` is the
branch origin, enable System Environment Variables, add the `/**` wildcard, and
use the code that prefers request Host on `*.vercel.app` and refuses loopback on
Vercel.

---

Diagnosis (code contract): `inviteOrRecoverOrganizationAdmin` passes
`redirectTo = {APP_PUBLIC_URL}/auth/confirm?next=/activate-organization-account`.
Hosted **Invite user** / **Reset password** templates that use
`{{ .SiteURL }}/auth/confirm?...` ignore that host and follow Dashboard **Site URL**
(often `http://localhost:3000`). Do **not** permanently set Site URL to an ephemeral
deployment URL. Do **not** replace `{{ .SiteURL }}` with bare `{{ .RedirectTo }}`
while `redirectTo` was only `/activate-organization-account` (missing `/auth/confirm`
and `token_hash`).

Stable Preview branch host for this test:

```text
https://bridge-hive-git-phase-7-professional-ui-lynnz-projects.vercel.app
```

Exact allowlist string the app emits (byte-for-byte):

```text
https://bridge-hive-git-phase-7-professional-ui-lynnz-projects.vercel.app/auth/confirm?next=%2Factivate-organization-account
```

---

## 1) Vercel → Project → Settings → Environment Variables (Preview)

Add/update for **Preview** (and redeploy the branch):

| Name | Value |
|------|--------|
| `APP_PUBLIC_URL` | `https://bridge-hive-git-phase-7-professional-ui-lynnz-projects.vercel.app` |

Also: **Settings → Environment Variables** → enable **Automatically expose System Environment Variables** (so `VERCEL_BRANCH_URL` / `VERCEL_URL` exist at runtime).

Keep existing `NEXT_PUBLIC_SUPABASE_*` and `SUPABASE_SERVICE_ROLE_KEY`.  
Code also prefers request `Host` on `*.vercel.app`, then `VERCEL_BRANCH_URL`, when `APP_PUBLIC_URL` is unset or loopback.

Optional for worker app email regressions (Expo `.env`):

| Name | Value |
|------|--------|
| `EXPO_PUBLIC_WEB_APP_URL` | same Preview origin as above |

---

## 2) Supabase → Authentication → URL Configuration → Redirect URLs

**Add these exact entries** (keep `http://localhost:3000/**` and `bridgehive://**`):

```text
https://bridge-hive-git-phase-7-professional-ui-lynnz-projects.vercel.app/**
https://bridge-hive-git-phase-7-professional-ui-lynnz-projects.vercel.app/auth/confirm
https://bridge-hive-git-phase-7-professional-ui-lynnz-projects.vercel.app/auth/confirm?next=%2Factivate-organization-account
https://bridge-hive-git-phase-7-professional-ui-lynnz-projects.vercel.app/auth/confirm?next=%2Fauth%2Fworker%2Freset-password
https://bridge-hive-git-phase-7-professional-ui-lynnz-projects.vercel.app/auth/confirm?next=%2Fauth%2Fworker%2Flogin
https://bridge-hive-git-phase-7-professional-ui-lynnz-projects.vercel.app/activate-organization-account
```

Do **not** change Site URL to the Preview host for this test.

---

## 3) Email templates (apply manually)

### Invite user (org activation — new Auth user)

Authentication → Email Templates → **Invite user** → replace the confirm `<a href>` with:

```html
<a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=invite">Accept the invitation</a>
```

`RedirectTo` is already `https://…/auth/confirm?next=%2Factivate-organization-account`, so the final link is confirm + token_hash + type (OTP still consumed only after Confirm on `/auth/confirm`).

### Reset password (org existing-user recovery **and** worker recovery)

Authentication → Email Templates → **Reset password** → replace the confirm `<a href>` with:

```html
<a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=recovery">Reset password</a>
```

- Org recovery: app passes `next=/activate-organization-account`
- Worker recovery: app passes `next=/auth/worker/reset-password` when `EXPO_PUBLIC_WEB_APP_URL` is set

### Confirm signup (worker only — leave separate)

Keep worker signup on an explicit worker `next` (Site URL host is OK until production cutover), e.g.:

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup&next=/auth/worker/login">Confirm your email</a>
```

---

## 4) After deploy + template save

1. Vercel → Deployments → redeploy latest `phase-7-professional-ui` (so env + code apply).
2. As platform admin on the **branch Preview URL**, call
   `diagnoseOrganizationActivationRedirectAction` (server action) — `data.redirectTo`
   must byte-match the allowlist confirm URL above and `isLoopback` must be false.
   Do **not** send email until that passes.
3. Admin console → send org invite to a **new** email → open link → host must be the Preview branch host + `/auth/confirm` → Confirm → activation.
4. Send invite/recovery to an **existing** Auth email → Reset password template → same Preview `/auth/confirm` with activation `next`.
5. Worker forgot-password with `EXPO_PUBLIC_WEB_APP_URL` set → lands on `/auth/confirm` then `/auth/worker/reset-password`, **not** org activation.

Never paste tokens into chat or commits.
