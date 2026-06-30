#!/bin/bash
# Build frontend for Vercel and deploy (requires: npm, Vercel CLI linked to project).
# Usage: ./deploy/vercel/deploy-frontend.sh [--prod]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
FRONTEND="$ROOT_DIR/frontend"

cd "$FRONTEND"
export VITE_USE_PHP_GATEWAY=false

echo "Building for Vercel (PHP gateway off)..."
npm run build

if ! command -v vercel &>/dev/null; then
  echo "Vercel CLI not found. Install: npm i -g vercel"
  echo "Or connect the GitHub repo in vercel.com and set Root Directory = frontend."
  exit 1
fi

ARGS=("$@")
if [[ ${#ARGS[@]} -eq 0 ]]; then
  ARGS=(--prod)
fi

vercel "${ARGS[@]}"
