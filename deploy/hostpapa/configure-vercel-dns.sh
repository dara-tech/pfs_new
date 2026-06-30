#!/bin/bash
# Fix psfnew.nchads.gov.kh DNS for Vercel (removes A+TXT+CNAME conflict, sets one record).
#
# Usage:
#   CPANEL_PASS='your-pass' ./deploy/hostpapa/configure-vercel-dns.sh
# Or: deploy/hostpapa/.env.deploy with CPANEL_PASS=...
#
# Default: single A → 76.76.21.21 (Vercel). Set DNS_MODE=cname for CNAME instead.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CPANEL_HOST="${CPANEL_HOST:-https://nchad459.hostpapavps.net:2083}"
CPANEL_USER="${CPANEL_USER:-nchads3}"
ZONE_DOMAIN="${ZONE_DOMAIN:-nchads.gov.kh}"
RECORD_NAME="${RECORD_NAME:-psfnew}"
DNS_MODE="${DNS_MODE:-a}"
VERCEL_A_IP="${VERCEL_A_IP:-76.76.21.21}"
VERCEL_CNAME="${VERCEL_CNAME:-5bad525f5025e224.vercel-dns-017.com}"

ENV_DEPLOY="$SCRIPT_DIR/.env.deploy"
if [[ -f "$ENV_DEPLOY" ]]; then
  set -a
  # shellcheck source=/dev/null
  source "$ENV_DEPLOY"
  set +a
fi

if [[ -z "${CPANEL_PASS:-}" ]]; then
  echo "Missing CPANEL_PASS."
  echo "  cp deploy/hostpapa/.env.deploy.example deploy/hostpapa/.env.deploy"
  echo "  # edit CPANEL_PASS=..."
  echo "  ./deploy/hostpapa/configure-vercel-dns.sh"
  exit 1
fi

AUTH=(-s -k -u "$CPANEL_USER:$CPANEL_PASS")
FQDN="${RECORD_NAME}.${ZONE_DOMAIN}"

cpanel_api2() {
  local func="$1"
  shift
  curl "${AUTH[@]}" --connect-timeout 30 --max-time 120 \
    "$CPANEL_HOST/json-api/cpanel" \
    -G \
    --data-urlencode "cpanel_jsonapi_user=$CPANEL_USER" \
    --data-urlencode "cpanel_jsonapi_apiversion=2" \
    --data-urlencode "cpanel_jsonapi_module=ZoneEdit" \
    --data-urlencode "cpanel_jsonapi_func=$func" \
    "$@"
}

echo "Zone: $ZONE_DOMAIN"
echo "Host: $FQDN"
echo "Target mode: $DNS_MODE"
echo ""

echo "Loading zone..."
ZONE_JSON="$(cpanel_api2 fetchzone --data-urlencode "domain=$ZONE_DOMAIN")"

LINES_TO_REMOVE="$(python3 - "$ZONE_JSON" "$FQDN" <<'PY'
import json, sys
raw, target = sys.argv[1], sys.argv[2].rstrip(".").lower() + "."
try:
    data = json.loads(raw)
except json.JSONDecodeError as e:
    print(f"PARSE_ERROR:{e}", file=sys.stderr)
    sys.exit(1)
records = []
r = data.get("cpanelresult") or {}
d = r.get("data") or []
if isinstance(d, dict):
    d = [d]
for item in d:
    if isinstance(item, dict) and "record" in item:
        records.extend(item.get("record") or [])
    elif isinstance(item, dict):
        records.append(item)
lines = []
for rec in records:
    name = (rec.get("name") or rec.get("dname") or "").rstrip(".").lower() + "."
    if name != target:
        continue
    line = rec.get("Line") or rec.get("line")
    typ = (rec.get("type") or "").upper()
    val = rec.get("cname") or rec.get("address") or rec.get("txtdata") or ""
    if line is not None:
        lines.append((int(line), typ, val))
        print(f"  found line {line}: {typ} {name} -> {val}", file=sys.stderr)
for line, _, _ in sorted(lines, key=lambda x: -x[0]):
    print(line)
PY
)"

if [[ -z "$LINES_TO_REMOVE" ]]; then
  echo "No existing DNS lines for $FQDN (will add new record)."
else
  while IFS= read -r line; do
    [[ -z "$line" ]] && continue
    echo "Removing zone line $line ..."
    REMOVE_JSON="$(cpanel_api2 remove_zone_record \
      --data-urlencode "domain=$ZONE_DOMAIN" \
      --data-urlencode "line=$line")"
    echo "$REMOVE_JSON" | python3 -c "
import json,sys
d=json.load(sys.stdin).get('cpanelresult',{})
ev=(d.get('event') or '').lower()
if ev not in ('ok','1'):
    print('  warn:', d.get('reason') or d)
" 2>/dev/null || echo "  (remove response logged)"
  done <<< "$LINES_TO_REMOVE"
fi

echo ""
if [[ "$DNS_MODE" == "cname" ]]; then
  echo "Adding CNAME -> $VERCEL_CNAME"
  RESULT="$(cpanel_api2 add_zone_record \
    --data-urlencode "domain=$ZONE_DOMAIN" \
    --data-urlencode "name=${FQDN}." \
    --data-urlencode "type=CNAME" \
    --data-urlencode "cname=${VERCEL_CNAME}." \
    --data-urlencode "ttl=300" \
    --data-urlencode "class=IN")"
else
  echo "Adding A -> $VERCEL_A_IP"
  RESULT="$(cpanel_api2 add_zone_record \
    --data-urlencode "domain=$ZONE_DOMAIN" \
    --data-urlencode "name=${FQDN}." \
    --data-urlencode "type=A" \
    --data-urlencode "address=$VERCEL_A_IP" \
    --data-urlencode "ttl=300" \
    --data-urlencode "class=IN")"
fi

echo "$RESULT" | python3 -c "
import json,sys
d=json.load(sys.stdin).get('cpanelresult',{})
ev=d.get('event')
ok = d.get('data') or (ev == 1) or (isinstance(ev, dict) and ev.get('result') == 1) or str(ev).lower() == 'ok'
if ok:
    print('OK: zone updated.')
    sys.exit(0)
print(json.dumps(d, indent=2))
sys.exit(1)
"

echo ""
echo "Wait 5–15 min, then Vercel → Domains → Refresh psfnew.nchads.gov.kh"
echo "Check: dig +short psfnew.nchads.gov.kh A"
