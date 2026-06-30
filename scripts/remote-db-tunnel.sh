#!/usr/bin/env bash
# Forward local MySQL port → Windows server XAMPP MySQL (psfnew).
# Usage: npm run db:tunnel   (keep terminal open while developing)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=deploy/windows/_ssh.sh
source "$ROOT/deploy/windows/_ssh.sh"
load_win_deploy_env

LOCAL_PORT="${DB_TUNNEL_LOCAL_PORT:-3307}"
REMOTE_HOST="${DB_TUNNEL_REMOTE_HOST:-127.0.0.1}"
REMOTE_PORT="${DB_TUNNEL_REMOTE_PORT:-3306}"

if command -v lsof &>/dev/null && lsof -iTCP:"$LOCAL_PORT" -sTCP:LISTEN &>/dev/null; then
  echo "Port $LOCAL_PORT already listening — tunnel likely running."
  echo "Use DB_HOST=127.0.0.1 DB_PORT=$LOCAL_PORT DB_DATABASE=psfnew in backend/.env"
  exit 0
fi

echo "SSH tunnel: localhost:$LOCAL_PORT → $WIN_SSH_USER@$WIN_SSH_HOST → $REMOTE_HOST:$REMOTE_PORT (psfnew)"
echo "Keep this terminal open. In another terminal: npm run dev"
echo ""

exec "${WIN_SSH[@]}" -N -L "${LOCAL_PORT}:${REMOTE_HOST}:${REMOTE_PORT}" "$WIN_SSH_USER@$WIN_SSH_HOST"
