#!/bin/bash
# Upload PSF backend + HostPapa helpers via cPanel Fileman API.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
CPANEL_HOST="${CPANEL_HOST:-https://nchad459.hostpapavps.net:2083}"
CPANEL_USER="${CPANEL_USER:-nchads3}"
REMOTE_BACKEND="psf-backend"
REMOTE_WEB="public_html/psfnew"

if [[ -z "${CPANEL_PASS:-}" ]]; then
  echo "Set CPANEL_PASS environment variable."
  exit 1
fi

AUTH=(-s -k -u "$CPANEL_USER:$CPANEL_PASS")

echo "Packaging backend..."
tar --exclude='node_modules' --exclude='.env' --exclude='*.log' \
  -czf /tmp/psf-backend.tar.gz -C "$ROOT_DIR/backend" .

echo "Uploading backend archive..."
curl "${AUTH[@]}" "$CPANEL_HOST/execute/Fileman/upload_files" \
  -F "dir=$REMOTE_BACKEND" -F "overwrite=1" \
  -F "file-1=@/tmp/psf-backend.tar.gz"

curl "${AUTH[@]}" \
  "$CPANEL_HOST/json-api/cpanel?cpanel_jsonapi_user=$CPANEL_USER&cpanel_jsonapi_apiversion=2&cpanel_jsonapi_module=Fileman&cpanel_jsonapi_func=fileop" \
  --data-urlencode 'op=extract' \
  --data-urlencode "sourcefiles=$REMOTE_BACKEND/psf-backend.tar.gz" \
  --data-urlencode "destfiles=$REMOTE_BACKEND/psf-backend"

echo "Uploading API gateway + ops scripts..."
for f in psf-api.php start-node.php keepalive.php import-db.php test-local-api.php run-npm.php; do
  curl "${AUTH[@]}" "$CPANEL_HOST/execute/Fileman/upload_files" \
    -F "dir=$REMOTE_WEB" -F "overwrite=1" \
    -F "file-1=@$SCRIPT_DIR/$f"
done

curl "${AUTH[@]}" "$CPANEL_HOST/execute/Fileman/upload_files" \
  -F "dir=$REMOTE_WEB" -F "overwrite=1" \
  -F "file-1=@$SCRIPT_DIR/.htaccess"

echo "Done. Run: curl 'https://psfnew.nchads.gov.kh/start-node.php?key=psf-setup-2026'"
