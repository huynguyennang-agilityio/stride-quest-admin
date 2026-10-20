#!/usr/bin/env bash
# Claude Code `Stop` hook: before Claude finishes, run the fast checks when files changed.
# Exit 2 blocks the stop and shows Claude the failures.
#
# Changed = files that differ from the merge base with develop (committed or not),
# plus untracked files. Then run: npm run lint, npm run typecheck, npm run test.
# Playwright specs (npm run e2e) need the app and the local backend, so run them by hand
# in Phase 4. After MAX_BLOCKS failed stops in a row the hook lets Claude stop and warns
# the user, so a failure Claude can't fix doesn't loop forever.
set -uo pipefail

MAX_BLOCKS=3

input=$(cat)
session=$(jq -r '.session_id // "unknown"' <<<"$input" 2>/dev/null || echo unknown)
counter="${TMPDIR:-/tmp}/stridequest-admin-stop-hook-${session//[^A-Za-z0-9_-]/_}"

root=$(git rev-parse --show-toplevel 2>/dev/null) || exit 0
cd "$root" || exit 0

base=develop
git rev-parse --verify --quiet origin/develop >/dev/null && base=origin/develop
git rev-parse --verify --quiet "$base" >/dev/null || exit 0
merge_base=$(git merge-base "$base" HEAD 2>/dev/null) || exit 0
changed=$({
  git diff --name-only "$merge_base"
  git ls-files --others --exclude-standard
} 2>/dev/null)

# Nothing changed, or no app to check yet.
if [ -z "$changed" ] || [ ! -f package.json ]; then
  rm -f "$counter"
  exit 0
fi

if [ ! -d node_modules ]; then
  failures=$'\n'"== node_modules is missing: run npm ci =="$'\n'
else
  failures=""
fi

# run <label> <command...>: keep the tail of the output, without colors, when it fails.
run() {
  local label=$1 output
  shift
  # pipefail keeps the command's exit status through sed.
  if ! output=$("$@" 2>&1 | sed $'s/\x1b\\[[0-9;]*m//g'); then
    failures+=$'\n'"== ${label} failed: $* =="$'\n'"$(tail -n 60 <<<"$output")"$'\n'
  fi
}

if [ -z "$failures" ]; then
  run "lint" npm run --silent lint
  run "types" npm run --silent typecheck
  run "unit tests" npm run --silent test
fi

if [ -z "$failures" ]; then
  rm -f "$counter"
  exit 0
fi

blocks=$(($(cat "$counter" 2>/dev/null || echo 0) + 1))
if [ "$blocks" -gt "$MAX_BLOCKS" ]; then
  rm -f "$counter"
  message="Stop hook: checks still fail after $MAX_BLOCKS attempts, so Claude was allowed to stop. Review the failures before merging."
  if command -v jq >/dev/null 2>&1; then
    jq -n --arg message "$message" '{systemMessage: $message}'
  fi
  exit 0
fi

echo "$blocks" >"$counter"
{
  echo "The checks for the files you changed failed (attempt $blocks of $MAX_BLOCKS). Fix them before you finish:"
  echo "$failures"
} >&2
exit 2
