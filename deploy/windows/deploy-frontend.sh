#!/bin/bash
# Build + upload PSF frontend to Windows XAMPP (psfnew.nchads.gov.kh).
# Usage: ./deploy/windows/deploy-frontend.sh
# Credentials: deploy/windows/.env.deploy

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
FRONTEND="$ROOT_DIR/frontend"
REMOTE_DIR='C:/xampp/htdocs/psfnew'

# shellcheck source=deploy/windows/_ssh.sh
source "$SCRIPT_DIR/_ssh.sh"
load_win_deploy_env

echo "Building frontend (same-origin /api, no PHP gateway)..."
cd "$FRONTEND"
export VITE_USE_PHP_GATEWAY=false
npm run build

BUILD_ID="$(date -u +%Y%m%dT%H%M%SZ)"
perl -pi -e "s/__PSF_BUILD__/$BUILD_ID/g" "$FRONTEND/dist/index.html"
echo "Build ID: $BUILD_ID"

echo "Packaging dist..."
rm -f /tmp/psf-frontend-win.zip
(cd "$FRONTEND/dist" && zip -rq /tmp/psf-frontend-win.zip .)

echo "Uploading to $REMOTE_DIR ..."
win_ssh "if not exist C:\\xampp\\htdocs\\psfnew mkdir C:\\xampp\\htdocs\\psfnew"
win_scp /tmp/psf-frontend-win.zip "$WIN_SSH_USER@$WIN_SSH_HOST:C:/xampp/htdocs/psfnew/psf-frontend-win.zip"

echo "Extracting..."
win_ssh "powershell -NoProfile -Command \"Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::ExtractToDirectory('C:\\xampp\\htdocs\\psfnew\\psf-frontend-win.zip', 'C:\\xampp\\htdocs\\psfnew'); Remove-Item 'C:\\xampp\\htdocs\\psfnew\\psf-frontend-win.zip'\""

win_scp "$SCRIPT_DIR/htaccess-psfnew" "$WIN_SSH_USER@$WIN_SSH_HOST:C:/xampp/htdocs/psfnew/.htaccess"

echo "Installing Apache vhost..."
win_scp "$SCRIPT_DIR/apache-psfnew.conf" "$WIN_SSH_USER@$WIN_SSH_HOST:C:/xampp/apache/conf/extra/psfnew.conf"
win_ssh "findstr /i \"psfnew.conf\" C:\\xampp\\apache\\conf\\httpd.conf >nul || echo Include conf/extra/psfnew.conf>> C:\\xampp\\apache\\conf\\httpd.conf"
win_ssh "C:\\xampp\\apache\\bin\\httpd.exe -t && C:\\xampp\\apache\\bin\\httpd.exe -k restart"

rm -f /tmp/psf-frontend-win.zip

echo "Frontend deploy complete."
