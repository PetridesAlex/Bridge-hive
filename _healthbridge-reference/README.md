# HealthBridge UI Reference

Preserved from the root Expo app as UX reference for the `apps/web` Next.js implementation.

## Organization

- Registration flow (multi-step, verification pending)
- Workspace placeholder
- Member role display

## Admin

- Login screen
- Dashboard snapshot (profile stats, credential review entry)

## Important

Do **not** copy this code directly into `apps/web`. Use it as design/UX reference only.

The archived code uses:

- Old schema assumptions (`ORGANIZATION_USER`, `app_role`, client-side super admin checks)
- HealthBridge branding
- Zustand mocks and obsolete table names (`professional_profiles`, etc.)

Rebuild for `apps/web` using:

- Phase 1 Bridge Hive schema (`org_admin`, `platform_admin_roles`, backend RLS)
- Bridge Hive branding
- Real Supabase queries and RPCs
- Server-side authorization only (no client email allowlists)
