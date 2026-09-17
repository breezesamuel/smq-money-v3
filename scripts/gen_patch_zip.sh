#!/usr/bin/env bash
set -euo pipefail

# Generate a zip patch bundle from patch_bundle directory
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PATCH_DIR="$ROOT_DIR/patch_bundle"
OUTPUT="$ROOT_DIR/smq-v3-deploy-patch.zip"

if [ ! -d "$PATCH_DIR" ]; then
  echo "Patch bundle directory not found: $PATCH_DIR" >&2
  exit 1
fi

echo "Creating patch zip: $OUTPUT"
if command -v zip >/dev/null 2>&1; then
  rm -f "$OUTPUT" 2>/dev/null || true
  zip -j -r "$OUTPUT" "$PATCH_DIR"/* >/dev/null
  echo "Patch zip created: $OUTPUT"
  exit 0
fi

if command -v tar >/dev/null 2>&1; then
  tar -czf "${OUTPUT%.zip}.tar.gz" -C "$PATCH_DIR" .
  echo "ZIP not found, created tar.gz: ${OUTPUT%.zip}.tar.gz"
  exit 0
fi

exit 1
