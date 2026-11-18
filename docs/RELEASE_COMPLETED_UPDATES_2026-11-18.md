# Release handover — completed updates 2026-11-18

## Identity
- Canonical folder: `/Users/petridesaalex/Desktop/Bridge-Hive-release-candidate`
- Release branch: `release/completed-updates-2026-11-18`
- Base: `origin/main` at merge time (PR #56 lineage)

## Included
- Final Privacy + Cookie Policy v1.0, TIN `60418646N`, `@bridge-hive/legal-content`
- Org messaging alerts / unread / toasts
- Org navy/teal workspace + shift surface refresh
- Mobile in-app Privacy Policy screen + entry points
- Lockfile, launcher, DEV_LAUNCH updates for this release

## Excluded (preserved uncommitted in-tree)
- `.tmp/**`
- `docs/_deferred/README.md` (deletion/edge deferral)
- Stripe / EAS / OTA / migrations / Edge deploys / account-deletion SQL

## Mobile
- Source saved/merged with this release
- Installed TestFlight unchanged; native build pending

## Released identity (filled after merge)
- PR: https://github.com/PetridesAlex/Bridge-hive/pull/57
- Merged main SHA: `be72ba351039d2b2e6d3df13fef96d22966f98a3`
- Vercel production: `dpl_HKGou4ZUqtnWnaLgayJLt2gye6PN` READY → aliases include `bridgehive.app`
- Mobile: source on main; TestFlight unchanged; native build pending
- Next: Stripe sandbox/live prerequisite checklist (do not start here)
