# Bridge Hive — Vercel preview setup (`apps/web` only)

Non-secret deployment sheet. **Never** paste service-role keys, anon JWTs, or `.env.local` values into GitHub or chat.

Hosted Supabase project ref: `hfnymqjrbppculcofaag` (`https://hfnymqjrbppculcofaag.supabase.co`).

Vercel hosts the Next.js org + platform-admin dashboards. Auth, Postgres, Storage, and Edge Functions stay on Supabase. The Expo worker app is **not** published by this project.

---

## Environment variable names

| Name | Preview scope | Public? | Where the value already lives |
|------|---------------|---------|-------------------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Preview (+ later Production) | Yes | Local `apps/web/.env.local`; Supabase → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Preview | Yes (publishable) | Same `.env.local`; Dashboard → anon / publishable key |
| `APP_PUBLIC_URL` | Preview | Origin only | Set to exact `https://<deployment>.vercel.app` after first URL is known; or omit and use code fallback `https://$VERCEL_URL` |
| `SUPABASE_SERVICE_ROLE_KEY` | Preview | **Server-only** | Same `.env.local`; Dashboard → service_role — never `NEXT_PUBLIC_*` |
| `ALLOW_LOCAL_INVITE_LINK_COPY` | Omit / `false` on Vercel | — | Local-only ([`.env.local.example`](../apps/web/.env.local.example)) |
| `STRIPE_SECRET_KEY` | Not required for web UI preview | Server-only | Edge Functions / mobile Checkout |
| `STRIPE_WEBHOOK_SECRET` | Not required for web UI preview | Server-only | Edge Functions |

Copy values in the Vercel UI from the Supabase Dashboard or your local env file. Do not commit `.env*`.

---

## Verified monorepo build settings

npm workspaces root: `packages/*`, `apps/*`. Package: `@bridge-hive/web`. Script: `next build`.

| Vercel setting | Value |
|----------------|--------|
| Framework Preset | Next.js |
| Root Directory | `apps/web` |
| Include files outside Root Directory | On (workspace packages) |
| Install Command | `cd ../.. && npm install` |
| Build Command | `cd ../.. && npm run build -w @bridge-hive/web` |
| Output Directory | Default (Next.js) |
| Node.js Version | **20.x** |

[`apps/web/next.config.ts`](../apps/web/next.config.ts) already sets `outputFileTracingRoot` to the monorepo root and transpiles `@bridge-hive/domain` + `@bridge-hive/supabase-types`.

---

## Push gate (do not skip)

Branch `phase-7-professional-ui` may be unpushed with local WIP. **Do not** import GitHub until that branch is committed and pushed (or you consciously deploy already-pushed `phase-6-worker-commission-billing`).

Agent does **not** commit/push or create the Vercel project until you explicitly ask.

### Exact clicks after the branch is on GitHub

1. [vercel.com](https://vercel.com) → **Add New…** → **Project** → Import `PetridesAlex/Bridge-hive`.
2. **Root Directory** → Edit → `apps/web` → Continue.
3. Build and Output Settings → Install/Build/Node as in the table above.
4. **Environment Variables** → add Preview vars (mark `SUPABASE_SERVICE_ROLE_KEY` sensitive).
5. Deploy from `phase-7-professional-ui` (or its PR). Enable **Deployment Protection** (Vercel Authentication).
6. If invites still point at the wrong host, set `APP_PUBLIC_URL` to the exact preview origin and redeploy.
7. When ready to test Auth emails: Supabase → Authentication → URL Configuration → add **exact** preview paths only (`/auth/confirm`, `/auth/callback`, `/activate-organization-account`, `/auth/worker/reset-password`). Keep `http://localhost:3000/**` and `bridgehive://auth/callback`. Prefer not permanently changing Site URL to a ephemeral preview host.

---

## Preview test checklist

Use synthetic accounts. Form submits hit PRODUCTION-labeled Supabase. Avoid destructive finance/admin controls.

- [ ] Vercel build green; no missing-env crashes in logs
- [ ] Unauthorized `/org/...` or `/admin/...` redirects to sign-in
- [ ] `admin@bridgehive.app` can open the admin console
- [ ] Org invite / activation after Redirect URL allowlist + correct `APP_PUBLIC_URL`
- [ ] Admin review (read-only first); shift create/publish with a synthetic org
- [ ] Worker mobile still talks to the same hosted project
- [ ] No service-role key in client Network / JS bundles

---

## After a permanent web domain (do not do in preview phase)

Needed from you first: exact owned hostname, DNS provider, whether email already uses that domain, and whether marketing shares `apps/web` or a separate project.

Proposed pattern (ownership not assumed): marketing on apex/`www`; authenticated dashboards on `app.<domain>` (one Next deployment).

Then:

1. Vercel → Domains → add hostname(s); at DNS provider add only the A/CNAME/TXT Vercel shows; keep MX/SPF/DKIM/DMARC.
2. Supabase → Auth → URL Configuration: Site URL = official web origin; allowlist exact hosted callbacks; retain localhost + `bridgehive://` while developing.
3. Re-audit Auth email templates (org → `/activate-organization-account`; worker recovery → `/auth/worker/reset-password`; never org invite → mobile callback).
4. Resend (or SMTP) sender / domain records for the real From address.
5. Google OAuth: **web does not implement Google Sign-In**; only revise mobile docs/allowlists if needed.
6. Stripe Checkout success/cancel + webhook endpoints: Edge Functions only if return origins change — not required for static web UI alone.

Do **not** change nameservers solely for the website unless every DNS record has been inventoried.

---

## Out of scope for this sheet

`supabase db reset`, `db push`, Stripe live mode, Auth multi-user wipes, Expo store builds, custom domain cutover before preview checklist passes.
