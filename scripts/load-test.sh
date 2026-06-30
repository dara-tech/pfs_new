#!/usr/bin/env bash
# PSF capacity smoke test (Apache Bench + optional autocannon).
#
# Usage:
#   ./scripts/load-test.sh local
#   ./scripts/load-test.sh production
#   TARGET=http://127.0.0.1:3000 ./scripts/load-test.sh
#
# Requires: ab (Apache Bench). Optional: npx autocannon for sustained tests.

set -euo pipefail

PROFILE="${1:-local}"
case "$PROFILE" in
  local)
    TARGET="${TARGET:-http://127.0.0.1:3000}"
    ;;
  production|prod)
    TARGET="${TARGET:-http://107.175.91.211}"
    ;;
  hostpapa)
    TARGET="${TARGET:-https://psfnew.nchads.gov.kh/psf-api.php?p=health}"
    ;;
  *)
    echo "Usage: $0 [local|production|hostpapa]"
    exit 1
    ;;
esac

if ! command -v ab >/dev/null 2>&1; then
  echo "Install Apache Bench (ab) first."
  exit 1
fi

run_ab() {
  local label="$1"
  local url="$2"
  local n="$3"
  local c="$4"
  echo ""
  echo "=== $label (n=$n c=$c) ==="
  echo "URL: $url"
  ab -q -n "$n" -c "$c" "$url" 2>&1 | grep -E "^(Concurrency Level|Time taken|Complete requests|Failed requests|Non-2xx|Requests per second|  50%|  90%|  95%|  99%| 100%)"
}

health_url() {
  if [[ "$TARGET" == *"psf-api.php"* ]]; then
    echo "$TARGET"
  else
    echo "${TARGET%/}/api/health"
  fi
}

H="$(health_url)"
TOKENS="${TARGET%/}/api/questionnaire/tokens"
CLIENT="${TARGET%/}/api/questionnaire/client/Jh1r5FFP/kh"

echo "Profile: $PROFILE"
echo "Target:  $TARGET"

run_ab "Health" "$H" 200 10
run_ab "Health (higher concurrency)" "$H" 500 50

if [[ "$PROFILE" != "hostpapa" ]]; then
  run_ab "DB: questionnaire tokens" "$TOKENS" 100 10
  run_ab "Questionnaire page" "$CLIENT" 100 10
fi

if command -v npx >/dev/null 2>&1 && [[ "$PROFILE" == "local" ]]; then
  echo ""
  echo "=== Sustained 10s @ 50 concurrent (autocannon) ==="
  npx --yes autocannon@7 -d 10 -c 50 "$(health_url)"
fi

echo ""
echo "Done. See scripts/LOAD_TEST_RESULTS.md for interpretation."
