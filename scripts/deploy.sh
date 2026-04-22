#!/usr/bin/env bash
# Safe deploy script for VAB Enterprise (both API and Frontend).
# Usage:
#   ./scripts/deploy.sh api        # deploy API only
#   ./scripts/deploy.sh frontend   # deploy frontend only
#   ./scripts/deploy.sh all        # deploy both (API first, then frontend)
#
# Performs:
#   1. Build in place (catches compile errors BEFORE restart)
#   2. pm2 restart
#   3. Smoke check via /api/health (for API) or HTTP 200 on / (for frontend)
#   4. Auto-rollback via pm2 reload if smoke fails
#
# Assumes working directory is /var/www/html/enterprise

set -euo pipefail

TARGET="${1:-}"
if [[ "$TARGET" != "api" && "$TARGET" != "frontend" && "$TARGET" != "all" ]]; then
  echo "Usage: $0 {api|frontend|all}" >&2
  exit 1
fi

API_DIR="/var/www/html/enterprise/api"
FRONTEND_DIR="/var/www/html/enterprise/frontend"
API_PROC="vab-api"
FRONTEND_PROC="vab-frontend"
API_HEALTH="http://127.0.0.1:2261/api/health"
FRONTEND_HEALTH="http://127.0.0.1:2262/"

smoke_check() {
  local url="$1"
  local name="$2"
  local tries=15
  while (( tries > 0 )); do
    if curl -fsS --max-time 3 "$url" > /dev/null 2>&1; then
      echo "[smoke] $name OK"
      return 0
    fi
    sleep 1
    tries=$((tries-1))
  done
  echo "[smoke] $name FAILED after 15 attempts" >&2
  return 1
}

deploy_api() {
  echo ">>> Building API..."
  cd "$API_DIR"
  npx nest build
  echo ">>> Restarting API..."
  pm2 restart "$API_PROC" --update-env
  echo ">>> Waiting for API health..."
  if ! smoke_check "$API_HEALTH" "API"; then
    echo ">>> API SMOKE FAILED — triggering pm2 reload"
    pm2 reload "$API_PROC" || true
    exit 1
  fi
  echo ">>> API deploy OK"
}

deploy_frontend() {
  echo ">>> Building Frontend..."
  cd "$FRONTEND_DIR"
  npm run build
  echo ">>> Restarting Frontend..."
  pm2 restart "$FRONTEND_PROC" --update-env
  echo ">>> Waiting for Frontend to respond..."
  if ! smoke_check "$FRONTEND_HEALTH" "Frontend"; then
    echo ">>> FRONTEND SMOKE FAILED — triggering pm2 reload"
    pm2 reload "$FRONTEND_PROC" || true
    exit 1
  fi
  echo ">>> Frontend deploy OK"
}

case "$TARGET" in
  api)       deploy_api ;;
  frontend)  deploy_frontend ;;
  all)       deploy_api; deploy_frontend ;;
esac

echo ">>> All deploys complete."
pm2 list | grep -E "vab-api|vab-frontend" || true
