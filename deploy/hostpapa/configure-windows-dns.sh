#!/bin/bash
# Point psfnew.nchads.gov.kh to Windows server (A record, removes Vercel CNAME).
# Usage:
#   CPANEL_PASS='...' WINDOWS_A_IP='36.37.175.123' ./deploy/hostpapa/configure-windows-dns.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export DNS_MODE=a
export VERCEL_A_IP="${WINDOWS_A_IP:-36.37.175.123}"
export RECORD_NAME=psfnew

exec "$SCRIPT_DIR/configure-vercel-dns.sh"
