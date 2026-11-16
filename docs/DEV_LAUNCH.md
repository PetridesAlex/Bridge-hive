# Bridge Hive — local development handover

## 1. Folder to open in Cursor

`/Users/petridesaalex/Desktop/Bridge-Hive-release-candidate`

Branch: `integrate/release-candidate-2026-11-16`

## 2. Start / status / stop / mobile restart

```bash
cd /Users/petridesaalex/Desktop/Bridge-Hive-release-candidate
./scripts/bh-dev-launch.sh start
./scripts/bh-dev-launch.sh status
./scripts/bh-dev-launch.sh restart-mobile
./scripts/bh-dev-launch.sh stop
```

Defaults: Next `:3000`, Metro `:8081`. Status prints **live** dirty fingerprint and only prints ready links when servers respond.

## 3. Verify before testing

```bash
./scripts/bh-dev-launch.sh status
./scripts/bh-dev-launch.sh remote-check
```

Confirm: expected branch, full `head_sha`, live dirty fingerprint, stripe mode, supabase host (`hfnymqjrbppculcofaag…` or local), lockfile sha, web/metro ready + cwd under this candidate.  
`remote-check` compares to GitHub without pulling. Offline → `remote_freshness=unverified`.

Loaded web HTML should include `data-bh-dev-provenance="<full HEAD>"`. Pushing a branch does **not** update production or TestFlight.

## 4. Save reviewed work

```bash
# Stage only reviewed paths (never .env, node_modules, .next, .bh-dev-*)
git add <paths>
git commit -m "…"
git push -u origin HEAD   # first time; then git push
gh pr create --draft --base main   # when not release-ready
```

A successful push does not save unstaged files. Keep originals outside this candidate untouched.

## 5. Future feature worktree (explicit)

```bash
BH_DEV_ROOT=/Users/petridesaalex/Desktop/Some-Feature-Worktree \
  BH_DEV_ALLOW_BRANCH=<that-branch> \
  /Users/petridesaalex/Desktop/Bridge-Hive-release-candidate/scripts/bh-dev-launch.sh start
```

Do not omit `BH_DEV_ROOT` when working elsewhere — the default always targets today’s release candidate.

## 6. Separate release steps (not this launcher)

- Merge PR to `main` only after review approval.
- Vercel production promote (approved deploy).
- Supabase migrations / Edge deploy / secrets (separate approval).
- EAS: `cd apps/worker-mobile && eas build --profile testflight-sandbox --platform ios` (env names only until approved).
