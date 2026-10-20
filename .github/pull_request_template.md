## Summary

<!-- What does this PR change, and why? -->

## Linked issue

Closes #

## Plan

Plan: docs/plans/NNN-name.md

<!-- Where this PR deviates from the approved plan, or "No deviations". A deviation that adds a page, an API call, a dependency or scope needs the plan updated and approved again first. -->

## Evidence

<!-- For each acceptance criterion: the command run, the request and response, or the screenshot, and the result.
     UI changes: attach the Playwright MCP screenshots here, one per state, at 1280×800 and 390×844, light and dark, next to the design screen they match. Attach them; don't commit them.
     Flows: the Playwright MCP walk-through against the local backend and the `npm run e2e` output.
     Redact tokens, passwords, Authorization headers, cookies and connection strings.
     Write `Not verified: <reason>` for anything you couldn't check. See "Verification evidence" in CLAUDE.md. -->

## Review checklist

Review in this order. Tick an item only after checking it.

- [ ] **Correctness:** the change does what the issue asks and handles edge cases and errors.
- [ ] **Tests:** new logic has tests, UI changes have Playwright screenshots, and lint, type check and tests pass locally.
- [ ] **Readability:** clear names, short functions, no duplicated code.
- [ ] **Security basics:** no leaked secrets, input is validated, tokens stay on the server, admin access is checked.
- [ ] **Scope:** this PR covers exactly one issue with no unrelated changes.
