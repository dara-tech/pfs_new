#!/bin/bash
# One-command production deploy → Windows (backend + frontend + restart + verify).
#
# Setup once:
#   cp deploy/windows/.env.deploy.example deploy/windows/.env.deploy
#   # edit WIN_SSH_PASS, etc.
#
# Usage:
#   ./deploy/windows/deploy-all.sh
#   ./deploy.sh production
#   npm run deploy

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=deploy/windows/_ssh.sh
source "$SCRIPT_DIR/_ssh.sh"

WHAT="${1:-all}"
SKIP_VERIFY="${SKIP_VERIFY:-0}"

run_backend() {
  echo "========== Backend =========="
  "$SCRIPT_DIR/deploy-from-mac.sh"
}

run_frontend() {
  echo "========== Frontend =========="
  "$SCRIPT_DIR/deploy-frontend.sh"
}

case "$WHAT" in
  all|production|prod)
    run_backend
    run_frontend
    ;;
  backend|api)
    run_backend
    ;;
  frontend|web)
    run_frontend
    ;;
  *)
    echo "Usage: $0 [all|backend|frontend]"
    exit 1
    ;;
esac

if [[ "$SKIP_VERIFY" != "1" && "$WHAT" != "backend" && "$WHAT" != "api" ]]; then
  load_win_deploy_env
  verify_production
fi

echo ""
echo "Deploy complete → ${PRODUCTION_URL:-https://psfnew.nchads.gov.kh}"
