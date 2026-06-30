#!/bin/bash
# Upload backend to Windows Server via OpenSSH (ngrok or LAN).
# Usage:
#   ./deploy/windows/deploy-from-mac.sh
# Credentials: deploy/windows/.env.deploy (see .env.deploy.example)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKEND="$ROOT_DIR/backend"
REMOTE_DIR='C:/psf-api'

# shellcheck source=deploy/windows/_ssh.sh
source "$SCRIPT_DIR/_ssh.sh"
load_win_deploy_env

if [[ -z "${WIN_SSH_PASS:-}" ]]; then
  echo "WIN_SSH_PASS not set — using SSH key auth if configured."
fi

echo "Creating archive (zip for Windows Server 2012)..."
(cd "$BACKEND" && zip -rq /tmp/psf-api-win.zip . \
  -x 'node_modules/*' -x '.env' -x '*.log')

echo "Uploading to $WIN_SSH_USER@$WIN_SSH_HOST:$REMOTE_DIR ..."
win_ssh "if not exist C:\\psf-api mkdir C:\\psf-api"
win_scp /tmp/psf-api-win.zip "$WIN_SSH_USER@$WIN_SSH_HOST:C:/psf-api/psf-api-win.zip"

echo "Extracting on server..."
win_ssh "powershell -NoProfile -Command \"Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::ExtractToDirectory('C:\\psf-api\\psf-api-win.zip', 'C:\\psf-api'); Remove-Item 'C:\\psf-api\\psf-api-win.zip'\""

win_scp -r "$SCRIPT_DIR/scripts/"* "$WIN_SSH_USER@$WIN_SSH_HOST:C:/psf-api/scripts/"
win_scp "$SCRIPT_DIR/apache-psf-api.conf" "$WIN_SSH_USER@$WIN_SSH_HOST:C:/psf-api/apache-psf-api.conf"
win_scp "$SCRIPT_DIR/env.production.example" "$WIN_SSH_USER@$WIN_SSH_HOST:C:/psf-api/env.production.example"

rm -f /tmp/psf-api-win.zip

echo "Post-deploy (npm install + restart API)..."
win_ssh "powershell -ExecutionPolicy Bypass -File C:\\psf-api\\scripts\\post-deploy.ps1"

echo "Backend deploy complete."
