#!/usr/bin/env bash
#
# Starts the two remotes and the Shell with prefixed output.
#
#   ./dev.sh           start everything
#   ./dev.sh --clean   clear the Native Federation config caches first
#
# Native Federation caches the resolved output of federation.config.* under
# node_modules/.cache/native-federation. Edits to a federation config will not
# reach remoteEntry.json until that cache is removed — deleting dist/ is NOT
# enough. Use --clean whenever you change sharing, scopes or exposes.

set -euo pipefail
cd "$(dirname "$0")"

CLEAN=0
if [[ "${1:-}" == "--clean" ]]; then
  CLEAN=1
fi

if [[ "$CLEAN" -eq 1 ]]; then
  echo "==> clearing Native Federation and Angular caches"
  rm -rf node_modules/.cache/native-federation .angular/cache
fi

PROJECTS=(
  "pdms:4201"
  "session-view:4202"
  "shell:4200"
)

for spec in "${PROJECTS[@]}"; do
  IFS=: read -r name port <<<"$spec"
  if lsof -ti:"$port" >/dev/null 2>&1; then
    echo "!! port $port is already in use ($name). Free it first:  kill \$(lsof -ti:$port)"
    exit 1
  fi
done

PIDS=()
cleanup() {
  echo
  echo "==> stopping"
  for pid in "${PIDS[@]}"; do kill "$pid" 2>/dev/null || true; done
}
trap cleanup EXIT INT TERM

for spec in "${PROJECTS[@]}"; do
  IFS=: read -r name port <<<"$spec"
  echo "==> starting $name on :$port"
  ( npx ng serve "$name" 2>&1 | sed "s/^/[$name] /" ) &
  PIDS+=("$!")
done

cat <<'BANNER'

  shell          http://localhost:4200/pdms
  pdms           http://localhost:4201  (standalone)
  session-view   http://localhost:4202  (standalone)

  Remotes are resolved lazily: the Shell degrades to a placeholder for any
  that are not yet listening. Ctrl-C stops everything.

BANNER

wait
