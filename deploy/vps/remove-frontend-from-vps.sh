#!/usr/bin/env bash
# Remove SPA from VPS IP; keep API on :80/api and backend on :3000.
set -euo pipefail

VPS_IP="${VPS_IP:-107.175.91.211}"
VPS_USER="${VPS_USER:-root}"
VPS_PASSWORD="${VPS_PASSWORD:-}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

SSH_OPTS=(-o StrictHostKeyChecking=no)
SCP_OPTS=(-o StrictHostKeyChecking=no)

ssh_cmd() {
  if [[ -n "$VPS_PASSWORD" ]] && command -v sshpass >/dev/null 2>&1; then
    sshpass -p "$VPS_PASSWORD" ssh "${SSH_OPTS[@]}" "${VPS_USER}@${VPS_IP}" "$@"
  else
    ssh "${SSH_OPTS[@]}" "${VPS_USER}@${VPS_IP}" "$@"
  fi
}

scp_cmd() {
  if [[ -n "$VPS_PASSWORD" ]] && command -v sshpass >/dev/null 2>&1; then
    sshpass -p "$VPS_PASSWORD" scp "${SCP_OPTS[@]}" "$1" "${VPS_USER}@${VPS_IP}:$2"
  else
    scp "${SCP_OPTS[@]}" "$1" "${VPS_USER}@${VPS_IP}:$2"
  fi
}

echo "Uploading API-only nginx config..."
scp_cmd "$SCRIPT_DIR/nginx-api-only.conf" /tmp/nginx-api-only.conf

ssh_cmd bash -s <<'ENDSSH'
set -e
cp /tmp/nginx-api-only.conf /etc/nginx/sites-available/default
nginx -t
rm -rf /var/www/psf/*
mkdir -p /var/www/psf
echo "PSF API only — frontend at https://psfnew.nchads.gov.kh" > /var/www/psf/README.txt
chown -R www-data:www-data /var/www/psf
systemctl reload nginx
echo "Done: http://107.175.91.211/ no longer serves the SPA"
ENDSSH

echo "Verify: curl http://107.175.91.211/api/health"
