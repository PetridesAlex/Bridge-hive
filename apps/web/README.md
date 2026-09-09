# Bridge Hive — Organization Web Dashboard

Next.js App Router app for organization users (`org_admin`, `org_scheduler`, `org_billing`).

## Setup

```bash
# From repo root
cp apps/web/.env.local.example apps/web/.env.local
# Fill NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY from `npx supabase status`

npm install
npm run web
```

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Next.js dev server (turbopack) |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | ESLint |

## Auth notes

- Cookie-based SSR sessions via `@supabase/ssr`
- Organization membership is required for `/org/[slug]/*`
- Org creation and member invites are provisioned via SQL / service role (not in this UI)

## Seed a pilot org (local)

```sql
insert into public.organizations (legal_name, display_name, slug, status)
values ('Test Hospital', 'Test Hospital', 'test-hospital', 'active');

insert into public.organization_members (organization_id, user_id, role, status, accepted_at)
values ('<org-id>', '<auth-user-uuid>', 'org_admin', 'active', now());
```
