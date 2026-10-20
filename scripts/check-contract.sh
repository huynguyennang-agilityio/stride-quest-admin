#!/usr/bin/env bash
# Fail when contract/SOURCE is not a commit SHA or src/lib/api/schema.d.ts is stale
# (not what openapi-typescript generates from contract/openapi.json).
set -euo pipefail

root=$(git rev-parse --show-toplevel)
cd "$root"

if ! grep -Eq '^[0-9a-f]{40}$' contract/SOURCE; then
  echo "contract/SOURCE must hold the full commit SHA of claude-code-training." >&2
  exit 1
fi

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
npx openapi-typescript contract/openapi.json -o "$tmp/schema.d.ts" --silent
if ! diff -q "$tmp/schema.d.ts" src/lib/api/schema.d.ts >/dev/null; then
  echo "src/lib/api/schema.d.ts is stale: run npm run contract:types (or scripts/sync-contract.sh)." >&2
  exit 1
fi
echo "contract $(cut -c1-7 contract/SOURCE): types up to date."
