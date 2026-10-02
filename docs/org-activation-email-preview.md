# Organization activation emails — Preview redirect fix

Diagnosis (verified in code): `inviteOrRecoverOrganizationAdmin` passes
`redirectTo = {APP_PUBLIC_URL}/auth/confirm?next=/activate-organization-account`
(after this fix). Hosted **Invite user** / **Reset password** templates that use
`{{ .SiteURL }}/auth/confirm?...` ignore that host and follow Dashboard **Site URL**
(often `http://localhost:3000`). Do **not** permanently set Site URL to an ephemeral
deployment URL. Do **not** replace `{{ .SiteURL }}` with bare `{{ .RedirectTo }}`
while `redirectTo` was only `/activate-organization-account` (missing `/auth/confirm`
and `token_hash`).

Stable Preview branch host for this test:

```text
https://bridge-hive-git-phase-7-professional-ui-lynnz-projects.vercel.app
```

---

## 1) Vercel → Project → Settings → Environment Variables (Preview)

Add/update for **Preview** (and redeploy the branch):

| Name | Value |
|------|--------|
| `APP_PUBLIC_URL` | `https://bridge-hive-git-phase-7-professional-ui-lynnz-projects.vercel.app` |

Keep existing `NEXT_PUBLIC_SUPABASE_*` and `SUPABASE_SERVICE_ROLE_KEY`.  
Code also prefers `VERCEL_BRANCH_URL` when `APP_PUBLIC_URL` is unset.

Optional for worker app email regressions (Expo `.env`):

| Name | Value |
|------|--------|
| `EXPO_PUBLIC_WEB_APP_URL` | same Preview origin as above |

---

## 2) Supabase → Authentication → URL Configuration → Redirect URLs

**Add these exact entries** (keep `http://localhost:3000/**` and `bridgehive://**`):

```text
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

If Preview worker signup must also avoid localhost Site URL, either set `EXPO_PUBLIC_WEB_APP_URL` and switch this template to the same RedirectTo pattern with `type=signup`, or wait for a stable production Site URL.

---

## 4) After deploy + template save

1. Vercel → Deployments → redeploy latest `phase-7-professional-ui` (so `APP_PUBLIC_URL` applies).
2. Admin console → send org invite to a **new** email → open link → host must be the Preview branch host + `/auth/confirm` → Confirm → activation.
3. Send invite/recovery to an **existing** Auth email → Reset password template → same Preview `/auth/confirm` with activation `next`.
4. Worker forgot-password with `EXPO_PUBLIC_WEB_APP_URL` set → lands on `/auth/confirm` then `/auth/worker/reset-password`, **not** org activation.

Never paste tokens into chat or commits.
