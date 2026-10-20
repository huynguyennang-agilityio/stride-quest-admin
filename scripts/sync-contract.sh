#!/usr/bin/env bash
# Copy the API contract from claude-code-training at a given commit into contract/,
# record the commit in contract/SOURCE and regenerate src/lib/api/schema.d.ts.
#
#   scripts/sync-contract.sh <full 40-character commit sha>
#
# contract/ is replaced as a whole: never edit it by hand. A contract update is its own
# PR (label `contract`).
set -euo pipefail

REPO_URL="${CONTRACT_REPO_URL:-https://github.com/huynguyennang-agilityio/claude-code-training.git}"

# GitHub serves a commit by its full SHA only, so a short SHA is refused here.
if [ $# -ne 1 ] || ! [[ $1 =~ ^[0-9a-f]{40}$ ]]; then
  echo "usage: $0 <full 40-character commit sha of claude-code-training>" >&2
  exit 1
fi
ref=$1

root=$(git rev-parse --show-toplevel)
cd "$root"

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

git -C "$tmp" init -q
git -C "$tmp" fetch -q --depth 1 "$REPO_URL" "$ref"
git -C "$tmp" checkout -q FETCH_HEAD -- docs/api
sha=$(git -C "$tmp" rev-parse FETCH_HEAD)

rm -rf contract
mkdir -p contract
cp "$tmp"/docs/api/openapi.json "$tmp"/docs/api/*.md contract/
cp -R "$tmp"/docs/api/examples contract/examples
echo "$sha" >contract/SOURCE

npm run --silent contract:types
echo "contract/ synced to $sha and src/lib/api/schema.d.ts regenerated."
