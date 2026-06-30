#!/bin/bash
# Upload PSF frontend build to psfnew.nchads.gov.kh via cPanel Fileman API.
# Usage: CPANEL_PASS='your-pass' ./deploy/hostpapa/deploy-frontend.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
CPANEL_HOST="${CPANEL_HOST:-https://nchad459.hostpapavps.net:2083}"
CPANEL_USER="${CPANEL_USER:-nchads3}"
REMOTE_DIR="public_html/psfnew"

ENV_DEPLOY="$SCRIPT_DIR/.env.deploy"
if [[ -f "$ENV_DEPLOY" ]]; then
  set -a
  # shellcheck source=/dev/null
  source "$ENV_DEPLOY"
  set +a
fi

if [[ -z "${CPANEL_PASS:-}" ]]; then
  echo "Set CPANEL_PASS or create deploy/hostpapa/.env.deploy with:"
  echo "  CPANEL_PASS=your-cpanel-password"
  exit 1
fi

AUTH=(-s -k -u "$CPANEL_USER:$CPANEL_PASS")

upload() {
  local dest="$1"
  shift
  curl "${AUTH[@]}" --connect-timeout 30 --max-time 600 \
    "$CPANEL_HOST/execute/Fileman/upload_files" \
    -F "dir=$dest" -F "overwrite=1" \
    "$@"
}

# Upload each file in a local directory to a remote cPanel subdir (tar extract is unreliable on this host).
upload_dir() {
  local local_dir="$1"
  local remote_subdir="$2"
  local f n=0 args=()
  for f in "$local_dir"/*; do
    [[ -f "$f" ]] || continue
    n=$((n + 1))
    args+=(-F "file-${n}=@${f};filename=$(basename "$f")")
    if (( n >= 8 )); then
      upload "$REMOTE_DIR/$remote_subdir" "${args[@]}"
      args=()
      n=0
    fi
  done
  if (( n > 0 )); then
    upload "$REMOTE_DIR/$remote_subdir" "${args[@]}"
  fi
}

trash_remote_file() {
  local rel_path="$1"
  curl "${AUTH[@]}" \
    "$CPANEL_HOST/json-api/cpanel?cpanel_jsonapi_user=$CPANEL_USER&cpanel_jsonapi_apiversion=2&cpanel_jsonapi_module=Fileman&cpanel_jsonapi_func=fileop" \
    --data-urlencode 'op=trash' \
    --data-urlencode "sourcefiles=$REMOTE_DIR/$rel_path" >/dev/null || true
}

echo "Building frontend (HostPapa PHP API gateway)..."
cd "$ROOT_DIR/frontend"
VITE_USE_PHP_GATEWAY=true npm run build

DIST="$ROOT_DIR/frontend/dist"
BUILD_ID="$(date -u +%Y%m%dT%H%M%SZ)"
echo "Build ID: $BUILD_ID"

# Stamp build id into index.html (cache-bust + visible version in app header).
perl -pi -e "s/__PSF_BUILD__/$BUILD_ID/g" "$DIST/index.html"

CURRENT_INDEX="$(basename "$(grep -oE 'assets/index-[^"]+\.js' "$DIST/index.html" | head -1)")"
echo "Current entry bundle: $CURRENT_INDEX"

echo "Removing stale index-*.js bundles on server..."
REMOTE_INDEX_FILES="$(
  curl "${AUTH[@]}" \
    "$CPANEL_HOST/execute/Fileman/list_files?dir=$REMOTE_DIR/assets&types=file" \
  | python3 -c "
import sys, json
data = json.load(sys.stdin).get('data') or []
for item in data:
    name = item.get('file', item) if isinstance(item, dict) else str(item)
    if name.startswith('index-') and name.endswith('.js') and name != '$CURRENT_INDEX':
        print(name)
" 2>/dev/null || true
)"
if [[ -n "${REMOTE_INDEX_FILES:-}" ]]; then
  STALE=()
  while IFS= read -r line; do [[ -n "$line" ]] && STALE+=("$line"); done <<< "$REMOTE_INDEX_FILES"
  for f in "${STALE[@]}"; do trash_remote_file "assets/$f"; done
  echo "Trashed ${#STALE[@]} stale index bundle(s)."
else
  echo "No stale index bundles to delete."
fi

echo "Removing legacy PWA files on server..."
LEGACY_PWA="$(
  curl "${AUTH[@]}" \
    "$CPANEL_HOST/execute/Fileman/list_files?dir=$REMOTE_DIR&types=file" \
  | python3 -c "
import sys, json, re
data = json.load(sys.stdin).get('data') or []
pat = re.compile(r'^(manifest\.webmanifest|registerSW\.js|workbox-.*\.js)$')
for item in data:
    name = item.get('file', item) if isinstance(item, dict) else str(item)
    if pat.match(name):
        print(name)
" 2>/dev/null || true
)"
if [[ -n "${LEGACY_PWA:-}" ]]; then
  while IFS= read -r line; do
    [[ -n "$line" ]] && trash_remote_file "$line"
  done <<< "$LEGACY_PWA"
fi

echo "Uploading gateway + .htaccess..."
for f in .htaccess psf-api.php cors-allow-origin.php; do
  upload "$REMOTE_DIR" -F "file-1=@$SCRIPT_DIR/$f;filename=$f"
done

echo "Uploading index.html (build $BUILD_ID)..."
upload "$REMOTE_DIR" -F "file-1=@$DIST/index.html;filename=index.html"

echo "Uploading sw.js (clears legacy PWA cache)..."
upload "$REMOTE_DIR" -F "file-1=@$SCRIPT_DIR/sw-unregister.js;filename=sw.js"

if [[ -d "$DIST/icons" ]]; then
  echo "Uploading icons..."
  upload_dir "$DIST/icons" icons
fi

echo "Uploading assets ($(find "$DIST/assets" -type f | wc -l | tr -d ' ') files)..."
upload_dir "$DIST/assets" assets

JS=$(grep -oE 'assets/index-[^"]+\.js' "$DIST/index.html" | head -1)
CSS=$(grep -oE 'assets/index-[^"]+\.css' "$DIST/index.html" | head -1)
echo "Deployed: build=$BUILD_ID $JS $CSS"
echo "Done. Open https://psfnew.nchads.gov.kh/ — header should show v${BUILD_ID:0:8}"
echo "Verify: https://psfnew.nchads.gov.kh/$JS"
