#!/usr/bin/env bash
# Bridge Hive local development launcher.
# Usage:
#   ./scripts/bh-dev-launch.sh status|start|stop|restart-mobile|remote-check
# Future feature worktree (explicit):
#   BH_DEV_ROOT=/path/to/worktree ./scripts/bh-dev-launch.sh start
set -euo pipefail

DEFAULT_ROOT="/Users/petridesaalex/Desktop/Bridge-Hive-release-candidate"
DEFAULT_EXPECTED_BRANCH="integrate/release-candidate-2026-11-16"

CANONICAL_ROOT="$(cd "${BH_DEV_ROOT:-$DEFAULT_ROOT}" && pwd -P)"
EXPECTED_BRANCH="${BH_DEV_ALLOW_BRANCH:-$DEFAULT_EXPECTED_BRANCH}"
WEB_PORT="${BH_WEB_PORT:-3000}"
METRO_PORT="${BH_METRO_PORT:-8081}"
LOG_DIR="${CANONICAL_ROOT}/.bh-dev-logs"
PID_DIR="${CANONICAL_ROOT}/.bh-dev-pids"
WEB_PID_FILE="${PID_DIR}/web.pid"
METRO_PID_FILE="${PID_DIR}/metro.pid"
STATE_FILE="${PID_DIR}/state.env"

die() { echo "ERROR: $*" >&2; exit 1; }
info() { echo "$*"; }

require_canonical() {
  local script_root
  script_root="$(cd "$(dirname "$0")/.." && pwd -P)"
  [[ -d "$CANONICAL_ROOT" ]] || die "Refuse: BH_DEV_ROOT not a directory: $CANONICAL_ROOT"
  [[ -f "$CANONICAL_ROOT/package.json" ]] || die "Refuse: missing package.json in $CANONICAL_ROOT"
  [[ -d "$CANONICAL_ROOT/apps/web" && -d "$CANONICAL_ROOT/apps/worker-mobile" ]] || die "Refuse: incomplete tree $CANONICAL_ROOT"
  if [[ -z "${BH_DEV_ROOT:-}" && "$script_root" != "$CANONICAL_ROOT" ]]; then
    die "Refuse: launcher must run from $CANONICAL_ROOT (got $script_root). Set BH_DEV_ROOT to override."
  fi
}

port_pid() {
  local port="$1"
  lsof -nP -iTCP:"$port" -sTCP:LISTEN 2>/dev/null | awk 'NR>1 {print $2; exit}'
}

cwd_of() {
  local pid="$1"
  lsof -a -p "$pid" -d cwd 2>/dev/null | awk 'NR==2 {print $NF}'
}

compute_fingerprint() {
  (
    cd "$CANONICAL_ROOT"
    git status --porcelain | grep -v node_modules | grep -v '\.next' | grep -v '\.bh-dev' || true
  ) | shasum -a 256 | awk '{print $1}'
}

lockfile_sha() {
  [[ -f "$CANONICAL_ROOT/package-lock.json" ]] || die "Refuse: missing package-lock.json"
  shasum -a 256 "$CANONICAL_ROOT/package-lock.json" | awk '{print $1}'
}

supabase_host_from_env() {
  local f="$CANONICAL_ROOT/apps/worker-mobile/.env"
  [[ -f "$f" ]] || { echo "missing"; return; }
  python3 - <<'PY2' "$f"
import re, sys
text = open(sys.argv[1], encoding="utf-8").read()
m = re.search(r"^EXPO_PUBLIC_SUPABASE_URL=(.+)$", text, re.M)
if not m:
    print("missing"); raise SystemExit
url = m.group(1).strip().strip('"').strip("'")
host = url.split("//")[-1].split("/")[0]
print(host or "missing")
PY2
}

stripe_mode_effective() {
  local f="$CANONICAL_ROOT/apps/worker-mobile/.env"
  if [[ -f "$f" ]] && grep -q '^EXPO_PUBLIC_STRIPE_PAYMENTS_MODE=sandbox' "$f"; then
    echo "sandbox"
  elif [[ -f "$f" ]] && grep -q '^EXPO_PUBLIC_STRIPE_PAYMENTS_MODE=' "$f"; then
    echo "live-or-other"
  else
    echo "live-default-unset"
  fi
}

assert_safe_backend() {
  local mode host branch
  mode="$(stripe_mode_effective)"
  host="$(supabase_host_from_env)"
  branch="$(git -C "$CANONICAL_ROOT" rev-parse --abbrev-ref HEAD)"

  [[ "$branch" == "$EXPECTED_BRANCH" ]] \
    || die "Refuse unexpected branch: $branch (expected $EXPECTED_BRANCH; set BH_DEV_ALLOW_BRANCH to override)"

  [[ "$host" == *hfnymqjrbppculcofaag* || "$host" == "127.0.0.1:54321" || "$host" == "localhost:54321" ]] \
    || die "Refuse unexpected Supabase host: $host"

  if [[ -n "${BH_DEV_REQUIRE_STRIPE_MODE:-}" && "$mode" != "$BH_DEV_REQUIRE_STRIPE_MODE" ]]; then
    die "Refuse unexpected Stripe mode: $mode (required $BH_DEV_REQUIRE_STRIPE_MODE)"
  fi

  if rg -l '<<<<<<<|>>>>>>>' "$CANONICAL_ROOT/apps/worker-mobile" >/dev/null 2>&1; then
    die "Refuse: unresolved merge conflict markers under apps/worker-mobile"
  fi

  lockfile_sha >/dev/null
}

http_ready() {
  local url="$1"
  curl -sf -o /dev/null "$url" 2>/dev/null
}

export_provenance_env() {
  local base branch dirty mode host started lock
  base="$(git -C "$CANONICAL_ROOT" rev-parse HEAD)"
  branch="$(git -C "$CANONICAL_ROOT" rev-parse --abbrev-ref HEAD)"
  dirty="$(compute_fingerprint)"
  mode="$(stripe_mode_effective)"
  host="$(supabase_host_from_env)"
  lock="$(lockfile_sha)"
  started="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

  export BH_DEV_CANDIDATE="$(basename "$CANONICAL_ROOT")"
  export BH_DEV_BRANCH="$branch"
  export BH_DEV_BASE_SHA="$base"
  export BH_DEV_DIRTY_FP="$dirty"
  export BH_DEV_STRIPE_MODE="$mode"
  export BH_DEV_SUPABASE_HOST="$host"
  export BH_DEV_LOCKFILE_SHA="$lock"
  export BH_DEV_STARTED_AT="$started"
  for prefix in EXPO_PUBLIC_ NEXT_PUBLIC_; do
    export "${prefix}BH_DEV_CANDIDATE=$BH_DEV_CANDIDATE"
    export "${prefix}BH_DEV_BRANCH=$BH_DEV_BRANCH"
    export "${prefix}BH_DEV_BASE_SHA=$BH_DEV_BASE_SHA"
    export "${prefix}BH_DEV_DIRTY_FP=$BH_DEV_DIRTY_FP"
    export "${prefix}BH_DEV_STRIPE_MODE=$BH_DEV_STRIPE_MODE"
    export "${prefix}BH_DEV_SUPABASE_HOST=$BH_DEV_SUPABASE_HOST"
    export "${prefix}BH_DEV_STARTED_AT=$BH_DEV_STARTED_AT"
  done

  mkdir -p "$PID_DIR"
  cat >"$STATE_FILE" <<EOF
BH_DEV_CANDIDATE=$BH_DEV_CANDIDATE
BH_DEV_BRANCH=$BH_DEV_BRANCH
BH_DEV_BASE_SHA=$BH_DEV_BASE_SHA
BH_DEV_DIRTY_FP=$BH_DEV_DIRTY_FP
BH_DEV_STRIPE_MODE=$BH_DEV_STRIPE_MODE
BH_DEV_SUPABASE_HOST=$BH_DEV_SUPABASE_HOST
BH_DEV_LOCKFILE_SHA=$BH_DEV_LOCKFILE_SHA
BH_DEV_STARTED_AT=$BH_DEV_STARTED_AT
WEB_PORT=$WEB_PORT
METRO_PORT=$METRO_PORT
CANONICAL_ROOT=$CANONICAL_ROOT
EOF
}

print_status() {
  require_canonical
  local base dirty mode host wp mp web_ready metro_ready lan
  base="$(git -C "$CANONICAL_ROOT" rev-parse HEAD)"
  dirty="$(compute_fingerprint)"
  mode="$(stripe_mode_effective)"
  host="$(supabase_host_from_env)"
  info "canonical=$CANONICAL_ROOT"
  info "branch=$(git -C "$CANONICAL_ROOT" rev-parse --abbrev-ref HEAD)"
  info "expected_branch=$EXPECTED_BRANCH"
  info "head_sha=$base"
  info "dirty_fingerprint_live=$dirty"
  info "stripe_mode=$mode"
  info "supabase_host=$host"
  info "lockfile_sha=$(lockfile_sha)"
  wp="$(port_pid "$WEB_PORT" || true)"
  mp="$(port_pid "$METRO_PORT" || true)"
  web_ready=0
  metro_ready=0
  if [[ -n "${wp:-}" ]]; then
    info "web_port=$WEB_PORT pid=$wp cwd=$(cwd_of "$wp")"
    if http_ready "http://127.0.0.1:$WEB_PORT"; then
      web_ready=1
      info "web_ready=yes http://localhost:$WEB_PORT"
    else
      info "web_ready=no (listen but not responding)"
    fi
  else
    info "web_port=$WEB_PORT (stopped)"
  fi
  if [[ -n "${mp:-}" ]]; then
    info "metro_port=$METRO_PORT pid=$mp cwd=$(cwd_of "$mp")"
    if http_ready "http://127.0.0.1:$METRO_PORT/status"; then
      metro_ready=1
      info "metro_ready=yes http://localhost:$METRO_PORT"
      lan="$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo '')"
      [[ -n "$lan" ]] && info "expo_lan=exp://${lan}:$METRO_PORT"
    else
      info "metro_ready=no (listen but not responding)"
    fi
  else
    info "metro_port=$METRO_PORT (stopped)"
  fi
  if [[ -f "$STATE_FILE" ]]; then
    info "last_start_state (frozen at start — not live dirty):"
    cat "$STATE_FILE"
  fi
  if [[ "$web_ready" -eq 0 && "$metro_ready" -eq 0 ]]; then
    info "links: none (servers stopped)"
  fi
}

assert_port_ok_for_start() {
  local port="$1" label="$2"
  local pid cwd
  pid="$(port_pid "$port" || true)"
  [[ -z "${pid:-}" ]] && return 0
  cwd="$(cwd_of "$pid")"
  if [[ "$cwd" == "$CANONICAL_ROOT"* ]]; then
    info "$label already ours (pid=$pid cwd=$cwd) — leaving"
    return 0
  fi
  die "Refuse: port $port occupied by foreign process pid=$pid cwd=$cwd (expected under $CANONICAL_ROOT)"
}

kill_pid_tree() {
  local pid="$1"
  [[ -n "${pid:-}" ]] || return 0
  if ps -p "$pid" >/dev/null 2>&1; then
    kill "$pid" 2>/dev/null || true
    sleep 1
    if ps -p "$pid" >/dev/null 2>&1; then
      pkill -P "$pid" 2>/dev/null || true
      kill -9 "$pid" 2>/dev/null || true
    fi
  fi
}

stop_owned() {
  require_canonical
  local pid port_pid_val cwd port
  for f in "$WEB_PID_FILE" "$METRO_PID_FILE"; do
    if [[ -f "$f" ]]; then
      pid="$(cat "$f" || true)"
      info "Stopping owned pid ${pid:-unknown} from $f"
      kill_pid_tree "${pid:-}"
      rm -f "$f"
    fi
  done
  for port in "$WEB_PORT" "$METRO_PORT"; do
    port_pid_val="$(port_pid "$port" || true)"
    if [[ -n "${port_pid_val:-}" ]]; then
      cwd="$(cwd_of "$port_pid_val")"
      if [[ "$cwd" == "$CANONICAL_ROOT"* ]]; then
        info "Stopping listener pid=$port_pid_val on :$port cwd=$cwd"
        kill_pid_tree "$port_pid_val"
      fi
    fi
  done
}

stop_foreign_if_known_old() {
  local pid cwd
  pid="$(port_pid "$WEB_PORT" || true)"
  if [[ -n "${pid:-}" ]]; then
    cwd="$(cwd_of "$pid")"
    if [[ "$cwd" == "/Users/petridesaalex/Desktop/Bridge-Hive/apps/web" ]]; then
      info "Stopping old web pid=$pid cwd=$cwd"
      kill_pid_tree "$pid"
    fi
  fi
  pid="$(port_pid "$METRO_PORT" || true)"
  if [[ -n "${pid:-}" ]]; then
    cwd="$(cwd_of "$pid")"
    if [[ "$cwd" == "/Users/petridesaalex/Desktop/Bridge-Hive-message-deletion/apps/worker-mobile" ]]; then
      info "Stopping old metro pid=$pid cwd=$cwd"
      kill_pid_tree "$pid"
    fi
  fi
  sleep 1
}

wait_http() {
  local url="$1" name="$2" tries="${3:-60}"
  local i=0
  while (( i < tries )); do
    if http_ready "$url"; then
      info "$name ready: $url"
      return 0
    fi
    sleep 1
    i=$((i + 1))
  done
  die "$name not ready after ${tries}s: $url"
}

record_listener_pid() {
  local port="$1" file="$2"
  local pid
  pid="$(port_pid "$port" || true)"
  [[ -n "${pid:-}" ]] || die "Refuse: no listener on :$port after start"
  echo "$pid" >"$file"
  info "recorded :$port pid=$pid -> $file"
}

start_web() {
  if [[ -n "$(port_pid "$WEB_PORT" || true)" ]]; then
    assert_port_ok_for_start "$WEB_PORT" "web"
    return 0
  fi
  info "Starting Next on :$WEB_PORT"
  mkdir -p "$LOG_DIR" "$PID_DIR"
  (
    cd "$CANONICAL_ROOT/apps/web"
    if command -v setsid >/dev/null 2>&1; then
      setsid npx next dev -p "$WEB_PORT" >"$LOG_DIR/web.log" 2>&1 &
    else
      nohup npx next dev -p "$WEB_PORT" >"$LOG_DIR/web.log" 2>&1 &
    fi
    echo $! >"$WEB_PID_FILE.wrap"
  )
  wait_http "http://127.0.0.1:$WEB_PORT" "web"
  record_listener_pid "$WEB_PORT" "$WEB_PID_FILE"
}

start_metro() {
  if [[ -n "$(port_pid "$METRO_PORT" || true)" ]]; then
    assert_port_ok_for_start "$METRO_PORT" "metro"
    return 0
  fi
  info "Starting Metro on :$METRO_PORT"
  mkdir -p "$LOG_DIR" "$PID_DIR"
  (
    cd "$CANONICAL_ROOT/apps/worker-mobile"
    if command -v setsid >/dev/null 2>&1; then
      setsid npx expo start --lan --port "$METRO_PORT" >"$LOG_DIR/metro.log" 2>&1 &
    else
      nohup npx expo start --lan --port "$METRO_PORT" >"$LOG_DIR/metro.log" 2>&1 &
    fi
    echo $! >"$METRO_PID_FILE.wrap"
  )
  wait_http "http://127.0.0.1:$METRO_PORT/status" "metro"
  record_listener_pid "$METRO_PORT" "$METRO_PID_FILE"
}

print_links_if_ready() {
  local lan
  if http_ready "http://127.0.0.1:$WEB_PORT"; then
    info "WEB  http://localhost:$WEB_PORT"
  else
    info "WEB  stopped"
  fi
  if http_ready "http://127.0.0.1:$METRO_PORT/status"; then
    lan="$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo 'LAN_IP')"
    info "METRO http://localhost:$METRO_PORT"
    info "EXPO exp://${lan}:$METRO_PORT"
  else
    info "METRO stopped"
  fi
  info "Logs: $LOG_DIR"
  info "Stop: BH_DEV_ROOT=$CANONICAL_ROOT $CANONICAL_ROOT/scripts/bh-dev-launch.sh stop"
}

cmd_start() {
  require_canonical
  assert_safe_backend
  mkdir -p "$LOG_DIR" "$PID_DIR"
  stop_foreign_if_known_old
  assert_port_ok_for_start "$WEB_PORT" "web"
  assert_port_ok_for_start "$METRO_PORT" "metro"
  export_provenance_env
  info "Provenance: root=$CANONICAL_ROOT branch=$BH_DEV_BRANCH sha=$BH_DEV_BASE_SHA dirty_live=$BH_DEV_DIRTY_FP stripe=$BH_DEV_STRIPE_MODE host=$BH_DEV_SUPABASE_HOST"
  start_web
  start_metro
  info ""
  print_links_if_ready
}

cmd_restart_mobile() {
  require_canonical
  assert_safe_backend
  export_provenance_env
  local pid cwd
  pid="$(port_pid "$METRO_PORT" || true)"
  if [[ -n "${pid:-}" ]]; then
    cwd="$(cwd_of "$pid")"
    if [[ "$cwd" == "$CANONICAL_ROOT"* ]]; then
      info "Restarting metro pid=$pid cwd=$cwd"
      kill_pid_tree "$pid"
      rm -f "$METRO_PID_FILE" "$METRO_PID_FILE.wrap"
      sleep 1
    else
      die "Refuse: metro port owned by foreign cwd=$cwd"
    fi
  fi
  start_metro
  print_links_if_ready
}

cmd_stop() {
  require_canonical
  stop_owned
  info "Owned Bridge Hive servers stopped for $CANONICAL_ROOT (if any)."
}

cmd_remote_check() {
  require_canonical
  local branch local_sha remote_sha
  branch="$(git -C "$CANONICAL_ROOT" rev-parse --abbrev-ref HEAD)"
  local_sha="$(git -C "$CANONICAL_ROOT" rev-parse HEAD)"
  info "local_branch=$branch"
  info "local_sha=$local_sha"
  if git -C "$CANONICAL_ROOT" fetch origin "$branch" --quiet 2>/dev/null; then
    remote_sha="$(git -C "$CANONICAL_ROOT" rev-parse "origin/$branch" 2>/dev/null || true)"
  fi
  if [[ -z "${remote_sha:-}" ]]; then
    remote_sha="$(git -C "$CANONICAL_ROOT" ls-remote --heads origin "$branch" 2>/dev/null | awk '{print $1}')" || true
  fi
  if [[ -z "${remote_sha:-}" ]]; then
    # Distinguish offline vs missing branch when possible
    if ! git -C "$CANONICAL_ROOT" ls-remote origin HEAD >/dev/null 2>&1; then
      info "remote_freshness=unverified"
      info "detail=could not reach origin"
      return 0
    fi
    info "remote_freshness=no_remote_branch"
    info "remote_sha="
    return 0
  fi
  info "remote_sha=$remote_sha"
  if [[ "$local_sha" == "$remote_sha" ]]; then
    info "remote_freshness=equal"
  else
    info "remote_freshness=diverged_or_ahead_behind"
    git -C "$CANONICAL_ROOT" rev-list --left-right --count "$local_sha...$remote_sha" 2>/dev/null \
      | awk '{print "ahead_local="$1" behind_remote="$2}' || true
  fi
}

main() {
  local cmd="${1:-status}"
  case "$cmd" in
    status) print_status ;;
    start) cmd_start ;;
    stop) cmd_stop ;;
    restart-mobile) cmd_restart_mobile ;;
    remote-check) cmd_remote_check ;;
    *) die "Usage: $0 status|start|stop|restart-mobile|remote-check" ;;
  esac
}

main "$@"
