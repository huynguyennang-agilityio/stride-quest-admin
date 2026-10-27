# Plan 003: Autonomous plan runs

Status: draft
Approved: <the user fills in the date>
Issues: <filled in after approval>

## Context

Every gate in `CLAUDE.md` stops for the user today: approving the plan, creating issues, committing, pushing, opening a PR, merging. Each feature plan therefore needs many round trips even when nothing is in doubt.

The user wants a second way to run a plan, an **autonomous plan run**:

- The user reads the plan (published as an Artifact) and approves it **once, in chat** ("approve plan NNN").
- From then on Claude does not ask the user anything. It splits the plan into tasks, runs each task in its own child session (shown under the main session in the desktop sidebar), at most **2 at the same time**, opens a PR per task, reviews it with `code-reviewer`, fixes the findings and **merges it into `develop` itself**.
- Everything Claude would have asked (doubts, assumptions, blocked tasks, ideas) goes into a notes file next to the plan. The user and Claude go through it after the run to plan bug fixes and improvements.

This plan changes the Claude rules (Phase 0). It goes through the current flow one last time: the user approves it on GitHub, and the one docs issue below is reviewed and merged by the user.

## Open questions and assumptions

- **Merge authority (decided by the user):** inside a run, Claude merges each task PR into `develop` after the review and the checks pass. `main` is never touched.
- **Approval channel (decided by the user):** the user approves in chat; Claude writes `Status: approved`, the date and `Approved by: <user> in chat`, and merges the plan PR. Approving on GitHub as today still works.
- **Assumption:** the run grant covers exactly one plan. A new plan, or a change to the approved plan, needs a new approval.
- **Assumption:** the plan file is not edited during the run (an edit would send it back to `draft`). The issue numbers go into the `Issues:` line right after approval, as part of the same approval step; everything else goes into the notes file.
- **Assumption:** child sessions run in their own worktrees, so two parallel tasks never share a checkout. Two tasks in the same wave must not touch the same files; the plan author checks this when filling the `Wave` column.

## Approach

### The run, step by step

1. **Plan.** As today, plus: the plan says `Run mode: autonomous`, the "Issues to create" table has a `Wave` column, and Claude publishes the plan as an Artifact for reading.
2. **Approval.** The user says "approve plan NNN" in chat (an Artifact comment relayed to the session counts the same). That message authorizes, for that plan only: setting `Status: approved`, creating its issues and branches, commits, pushes, PRs, the review, merges into `develop` and closing its issues.
3. **Orchestrator** (the session where the user approved):
   - sets `Status: approved`, `Approved:` and `Approved by:`, writes the issue numbers into `Issues:` after creating the issues, and merges the plan PR;
   - creates `docs/plans/NNN-<name>-notes.md`;
   - runs the waves in order. Each task is a child session started with `start_session` (`use_worktree: true`, `fresh` context) whose brief is the issue, the plan path and the task session contract below. **Never more than 2 child sessions run at once.** When one ends, the orchestrator checks its result (PR merged, the change is on `develop`), copies its notes into the notes file and starts the next task whose dependencies are merged;
   - at the end reruns `npm run lint`, `npm run typecheck`, `npm run test` (and `npm run e2e` when the plan has integration work) on `develop`, writes the summary into the notes file, merges it through a docs PR, and reports to the user in Vietnamese with the PR links and the notes.
4. **Task session contract** (each child session): branch `<type>/<issue-id>-<name>` from the latest `develop`; Phases 2 to 4 as today (tests, lint, type check, Playwright MCP screenshots, evidence); commit, push, open the PR with the template, `Closes #id` and `Plan:`; run `code-reviewer`; fix every finding behind "request changes" and repeat the checks; bring the branch up to date with `develop` when it moved; merge the PR; verify `develop`; end with a short "Notes for the run" section. It never asks the user.
5. **When something blocks** (no question to the user):
   - a non-essential gap: assume, write it in the notes, continue;
   - a task that needs something the plan or the contract does not cover (a backend change, a new dependency, a security change the plan does not name, an integration gate that is not met): don't do it, mark it `blocked` with the reason, skip the tasks that depend on it, continue with the rest;
   - checks still failing after 3 attempts, or "request changes" after 2 fix rounds: leave the PR open and unmerged, mark it `needs discussion`, skip its dependents.
6. **Never, even inside a run:** push directly to `develop` or `main`, force-push, delete branches, merge into `main`, edit `contract/` by hand, act in another repository, or break the browser and credential rules in Phase 3.

### Notes file

`docs/plans/NNN-<name>-notes.md`, sections:

- **Run log:** each task, its session, PR, result (`merged`, `blocked`, `needs discussion`, `skipped`).
- **Assumptions made:** what Claude decided instead of asking.
- **Blocked / needs discussion:** what stopped and why.
- **Follow-ups:** bugs and improvements found on the way.

### Files touched (issue 1)

- `CLAUDE.md`: a new "Autonomous plan runs" section under Workflow; the permissions table rows for `Status: approved`, commit, push and PR, merge and close get "or inside an autonomous run of an approved plan"; Phase 1 step 4 allows approval in chat; Phase 5 and 6 say a run has no user review gate per PR (the user reviews the notes after the run); the "a grant covers only…" rule names the run grant.
- `docs/plans/README.md`: `Approved by:` and `Run mode:` lines, the `Wave` column, the notes file and its sections.
- `docs/workflow.md`: a new diagram "6. Autonomous plan run" and the approval text updated.
- `.claude/skills/run-plan/SKILL.md` (new): the orchestrator's step-by-step guide (wave scheduling with the 2-session limit, the child-session brief template, the blocked rules, the notes format), so `CLAUDE.md` stays short.
- `.claude/agents/planner.md`: may write `Status: approved` only when the orchestrator asks after the user approved in chat; knows the `Wave` column and `Run mode:` line.

No application code, no dependency, no change to the session cookies, authentication or the contract.

### Security and permissions (the approval must cover this)

This plan **changes the rules on who may approve plans and merge PRs**. Inside a run, Claude merges into `develop` without a per-PR approval from the user. Containment: only `develop`, only PRs of that plan's issues, only after `code-reviewer` and the checks pass, never `main`, never force-push or branch deletion, and every decision is written in the notes file.

## Risks

- **A bad change reaches `develop` unreviewed by a person.** Contained by the reviewer and checks gate, the notes file, and `main` staying user-only; a merge commit per task makes a revert one command.
- **Two parallel tasks conflict.** Contained by the `Wave` rule (no shared files), worktrees, and updating from `develop` before merging.
- **The run goes beyond the plan.** Contained by the blocked rule: anything the plan does not cover is not done, only noted.
- **Runaway cost.** At most 2 child sessions at a time, retry limits on checks and review rounds.

## Verification

- Issue 1 is docs only: `npm run lint`, `npm run typecheck` and `npm run test` still pass; the new Mermaid diagram renders on GitHub.
- Read-through: grep `CLAUDE.md`, `docs/workflow.md`, `docs/plans/README.md` and `.claude/agents/planner.md` for "Only the user", "Never", "approved" and "Merge", and confirm nothing contradicts the run rules.
- First real run (the next feature plan): check that no more than 2 child sessions run at once and that the notes file is written and merged.

## Ticket evidence

Chore / docs: the scope is above; behavior that must stay unchanged is the non-autonomous flow, which keeps working for plans without `Run mode: autonomous`.

## Issues to create

| # | Title | Labels | Acceptance criteria | Depends on |
| --- | --- | --- | --- | --- |
| 1 | `docs: autonomous plan runs` | docs, chore | - [ ] `CLAUDE.md`, `docs/workflow.md`, `docs/plans/README.md` and `.claude/agents/planner.md` describe the run as in this plan, with no contradicting rule left<br>- [ ] `.claude/skills/run-plan/SKILL.md` covers the waves, the 2-session limit, the child-session brief, the blocked rules and the notes file<br>- [ ] lint, type check and tests pass | none |
