# Shared Windows SSH/SCP helpers. Source from deploy/windows/*.sh — do not execute directly.
_win_ssh_script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

load_win_deploy_env() {
  WIN_SSH_HOST="${WIN_SSH_HOST:-0.tcp.ap.ngrok.io}"
  WIN_SSH_PORT="${WIN_SSH_PORT:-14155}"
  WIN_SSH_USER="${WIN_SSH_USER:-Administrator}"
  PRODUCTION_URL="${PRODUCTION_URL:-https://psfnew.nchads.gov.kh}"

  local env_file="$_win_ssh_script_dir/.env.deploy"
  if [[ -f "$env_file" ]]; then
    set -a
    # shellcheck source=/dev/null
    source "$env_file"
    set +a
  fi

  WIN_SSH_OPTS=(-o StrictHostKeyChecking=no -o ConnectTimeout=30 -p "$WIN_SSH_PORT")
  WIN_SCP_OPTS=(-o StrictHostKeyChecking=no -o ConnectTimeout=120 -P "$WIN_SSH_PORT")

  if [[ -n "${WIN_SSH_PASS:-}" ]] && command -v sshpass &>/dev/null; then
    WIN_SSH=(sshpass -p "$WIN_SSH_PASS" ssh "${WIN_SSH_OPTS[@]}")
    WIN_SCP=(sshpass -p "$WIN_SSH_PASS" scp "${WIN_SCP_OPTS[@]}")
  else
    WIN_SSH=(ssh "${WIN_SSH_OPTS[@]}")
    WIN_SCP=(scp "${WIN_SCP_OPTS[@]}")
  fi
}

win_ssh() {
  "${WIN_SSH[@]}" "$WIN_SSH_USER@$WIN_SSH_HOST" "$@"
}

win_scp() {
  "${WIN_SCP[@]}" "$@"
}

verify_production() {
  local url="${PRODUCTION_URL:-https://psfnew.nchads.gov.kh}"
  local health_url="${url%/}/api/health"
  echo ""
  echo "Verifying production..."
  if curl -fsS --connect-timeout 15 --max-time 30 "$health_url" | grep -q '"status":"ok"'; then
    echo "  API health: OK ($health_url)"
  else
    echo "  API health: FAILED ($health_url)" >&2
    return 1
  fi
  local code
  code="$(curl -fsS --connect-timeout 15 --max-time 30 -o /dev/null -w "%{http_code}" "$url/")"
  if [[ "$code" == "200" || "$code" == "304" ]]; then
    echo "  Frontend:   OK ($url → HTTP $code)"
  else
    echo "  Frontend:   HTTP $code ($url)" >&2
    return 1
  fi
}
