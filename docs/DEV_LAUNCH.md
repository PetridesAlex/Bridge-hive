# Bridge Hive — local development handover

## 1. Folder to open in Cursor

`/Users/petridesaalex/Desktop/Bridge-Hive-release-candidate`

Released source (2026-11-18 completed updates): track `main` after merge of
`release/completed-updates-2026-11-18`, or stay on that release branch while it
tracks the same commits. Do not discard excluded local files (`.tmp/`,
`docs/_deferred/README.md`).

## 2. Start / status / stop / mobile restart

```bash
cd /Users/petridesaalex/Desktop/Bridge-Hive-release-candidate
./scripts/bh-dev-launch.sh start
./scripts/bh-dev-launch.sh status
./scripts/bh-dev-launch.sh restart-mobile
./scripts/bh-dev-launch.sh stop
./scripts/bh-dev-launch.sh remote-check
```

Defaults: Next `:3000`, Metro `:8081`.
Servers are double-forked via `scripts/bh-dev-daemonize.py` so they keep running after the launcher exits (including on macOS).
Status prints **live** dirty fingerprint and only prints ready links when servers respond.

If the checkout is not on the expected branch, set:

```bash
BH_DEV_ALLOW_BRANCH=<current-branch> ./scripts/bh-dev-launch.sh start
```

## 3. Verify before testing

```bash
./scripts/bh-dev-launch.sh status
./scripts/bh-dev-launch.sh remote-check
```

Confirm: expected branch, full `head_sha`, live dirty fingerprint, stripe mode, supabase host (`hfnymqjrbppculcofaag…` or local), lockfile sha, web/metro ready + cwd under this candidate.
`remote-check` compares to GitHub without pulling. Offline → `remote_freshness=unverified`.

Loaded web HTML should include `data-bh-dev-provenance="<full HEAD>"`. Pushing a branch does **not** update production or TestFlight by itself; a merged `main` deploy updates the website only.

Local links when ready:

- Web: http://localhost:3000
- Metro / Expo web: http://localhost:8081
- Privacy (web): http://localhost:3000/privacy-policy
- Cookie (web): http://localhost:3000/cookie-policy
- Privacy (mobile web): http://localhost:8081/privacy-policy

## 4. Save reviewed work

```bash
# Stage only reviewed paths (never .env, node_modules, .next, .bh-dev*, .tmp)
git add <paths>
git commit -m "…"
git push -u origin HEAD   # first time; then git push
gh pr create --base main   # one PR when release-ready
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

- Merge PR to `main` only after review gates pass (authorized completed-source releases may proceed when checks are green).
- Vercel production follows the automatic production deploy from `main` (Root Directory `apps/web`).
- Supabase migrations / Edge deploy / secrets (separate approval).
- Stripe configuration / live activation (next task after this source/web release; separate approval).
- EAS / TestFlight: `cd apps/worker-mobile && eas build --profile testflight-sandbox --platform ios` (env names only until approved). A GitHub/Vercel release does **not** update installed TestFlight binaries.
