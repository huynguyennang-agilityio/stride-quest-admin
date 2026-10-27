# Plans

Every non-trivial change starts with a plan file here, before any issue, branch or code. The flow is in [`CLAUDE.md`](../../CLAUDE.md#phase-1-plan-approval-and-issues) and drawn in [`../workflow.md`](../workflow.md).

- **Name:** `docs/plans/NNN-<short-name>.md`, where `NNN` is the next number (`001`, `002`, ...).
- **Branch:** `docs/plan-NNN-<short-name>` from `develop`, with its own PR into `develop`. A plan needs no issue.
- **Status:** the first line after the title is `Status: draft` or `Status: approved`. **Only the user approves**: either they set `approved` with the date and merge the plan PR, or they say "approve plan NNN" in chat and Claude writes `approved`, the date and `Approved by: <user> in chat`. Claude never writes `approved` without that. A plan edited after approval goes back to `draft`; writing the issue numbers into `Issues:` is not an edit.
- **Issues:** Claude creates issues only from a plan that is `approved` on `develop`, exactly as the plan lists them, and writes the numbers into the `Issues:` line.
- **Artifact:** Claude publishes each plan as an Artifact so the user can read it before approving.
- **Run mode:** `Run mode: autonomous` means that after approval Claude runs the whole plan without asking, as in [`CLAUDE.md`](../../CLAUDE.md#autonomous-plan-runs). `Run mode: step by step` keeps a user gate at each PR. The `Wave` column orders the tasks: tasks in the same wave don't depend on each other and don't touch the same files, so up to 2 of them run at once.
- **Notes file:** an autonomous run writes `docs/plans/NNN-<short-name>-notes.md` instead of asking questions. Its sections: **Run log** (task, session, PR, result: `merged`, `blocked`, `needs discussion`, `skipped`), **Assumptions made**, **Blocked / needs discussion**, **Follow-ups** (bugs and improvements found on the way).
- **Trivial changes** (a typo, a one-line fix) need no plan.
- **Web features whose endpoints are not merged yet** are listed as two issues, `(web, mock)` and `(web, integration)`. When the endpoints are already merged, the feature is one issue labelled `web`, `integration`. The rules are in [`CLAUDE.md`](../../CLAUDE.md#phase-1-plan-approval-and-issues) under "Web tasks: mock and integration".
- **UI issues** name their screen on the design canvas and the states to show; their evidence includes Playwright MCP screenshots.

## Template

Copy this into `docs/plans/NNN-<short-name>.md`.

````markdown
# Plan NNN: <title>

Status: draft
Approved: <the date, filled in on approval>
Approved by: <filled in on approval, for example "<user> in chat" or "<user> on GitHub">
Run mode: autonomous | step by step
Issues: <filled in after approval, for example #12, #13>

## Context

What is wanted, and why. Link the design screens, the request or the bug report.

## Open questions and assumptions

- Question or assumption, and who answers it.

## Approach

- Routes, features and files touched (`src/app/...`, `src/features/...`, `src/lib/...`).
- API calls used and where they are in `contract/`. A call the contract lacks is a backend change, planned in `claude-code-training` first.
- Say plainly if it touches: a new dependency or core technology, the session cookies, authentication or authorization, real data, production or cost. The approval must cover these.

## Risks

What could go wrong, and how it is contained.

## Verification

How each acceptance criterion will be checked (unit and component tests, Playwright MCP walk-through and screenshots, `e2e/` specs against the local backend), and what cannot be checked.

## Ticket evidence

What the ticket evidence gate in `CLAUDE.md` requires for each issue, and where it is (design canvas screen, contract section, reproduction steps).

## Issues to create

| # | Title | Labels | Acceptance criteria | Depends on | Wave |
| --- | --- | --- | --- | --- | --- |
| 1 | `chore: sync the contract for <module>` | chore, contract | - [ ] `contract/` at `<sha>`, types regenerated, `contract:check` passes | none | 1 |
| 2 | `feat: <feature> (web, mock)` | web, mock | - [ ] Pages, actions and schemas against the contract; MSW fixtures from `contract/examples/`<br>- [ ] Each state tested; Playwright MCP screenshots with `API_MODE=mock`; Integration row `Not verified: backend not merged` | 1 | 2 |
| 3 | `feat: <feature> (web, integration)` | web, integration | - [ ] Against the local backend: one success case and each documented error, kept as an `e2e/` spec. Integration gate: the backend issues are closed and the endpoints are in `contract/openapi.json` on `develop` | 2 | 3 |
````
