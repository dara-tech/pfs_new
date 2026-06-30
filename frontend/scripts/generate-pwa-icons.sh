#!/bin/bash
# Generate PWA PNG icons from public/icons/icon-source.svg
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/scripts/icon-source.svg"
OUT="$ROOT/public/icons"

if ! command -v magick >/dev/null 2>&1; then
  echo "ImageMagick (magick) is required."
  exit 1
fi

for size in 72 96 128 144 152 192 384 512; do
  magick -background none "$SRC" -resize "${size}x${size}" "$OUT/icon-${size}x${size}.png"
  echo "Wrote icon-${size}x${size}.png"
done
