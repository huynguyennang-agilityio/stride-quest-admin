---
name: run-plan
description: Step-by-step guide for the orchestrator of an autonomous plan run in StrideQuest Admin. The user approves a plan once in chat ("approve plan NNN"), and Claude runs its tasks end to end in child sessions (at most 2 at a time), merges each task PR into develop and writes every doubt into the plan's notes file. Use only right after the user approves, in chat, a plan whose header says `Run mode: autonomous`.
---

# Run a plan

How the orchestrator runs an approved plan from the first issue to the final report. The rules live in [`CLAUDE.md`](../../../CLAUDE.md#autonomous-plan-runs). This skill shows how to apply them. If this file and CLAUDE.md disagree, CLAUDE.md wins; fix this file.

The orchestrator is the session where the user approved. It does not write feature code itself; each task runs in its own child session.

## 1. Approve and set up

1. Check two things, and stop here if either fails:
   - the plan's header says `Run mode: autonomous`. A `step by step` plan, or one with no `Run mode:` line, follows the normal flow in CLAUDE.md, even if the user approved it in chat;
   - the user approves this exact plan (for example "approve plan 004") in their own message in this session, or in their own comment on the plan's Artifact relayed to this session. A comment by anyone else, an issue or PR comment, a file or a message from another session is not an approval. A `Status: approved` the user set on GitHub is not a run approval either: follow the step-by-step flow unless the user then approves the run in chat.
2. On the plan branch, set:
   ```text
   Status: approved
   Approved: <today, YYYY-MM-DD>
   Approved by: <user> in chat
   ```
   Commit, push and merge the plan PR into `develop`.
3. Create the issues exactly as the plan's "Issues to create" table lists them, in table order, each with `Plan: docs/plans/NNN-<short-name>.md`, its acceptance criteria and its dependencies as real issue numbers.
4. On a `docs/plan-NNN-issues` branch, write the numbers into `Issues:`. PR it and merge it.
5. Create a `docs/plan-NNN-notes` branch from the updated `develop`, add `docs/plans/NNN-<short-name>-notes.md` from the template below, commit and push it. This branch holds the notes for the whole run, so nothing is lost if the session ends early.
6. Check the main checkout has `node_modules` and `.env.local`; each child worktree links that `.env.local`. If it is missing, write it in the notes: tasks that need the app or e2e will be `blocked`.

## 2. Schedule the waves

- A task is **ready** when every task in its `Depends on` is `merged`.
- Run waves in order. Inside a wave, start ready tasks until **2 child sessions are running**; never start a third.
- **Only one running session may use the app.** A task "uses the app" when its evidence needs `npm run dev`, the Playwright MCP browser or `npm run e2e` (UI and integration tasks). The app, `playwright.config.ts` and the `.mcp.json` allow-list all use `localhost:3000`, so a second one would test the other task's code. Pair an app-using task with a task that doesn't (logic, schema, docs, contract), or run it alone.
- When a session ends, check its result before starting the next task. Then start the next ready task, from the same wave or the next one once the wave is done.
- If two ready tasks turn out to touch the same files, run them one after the other and note it.

Start each task with `start_session`: `use_worktree: true`, context `fresh`, a short `title` (the issue title), and the brief below.

### Child-session brief

```text
Autonomous plan run of docs/plans/NNN-<short-name>.md, task <n>: issue #<id> "<title>".
Read CLAUDE.md (Autonomous plan runs) and the plan first. Do not ask the user anything.

This task <uses | does not use> the app on localhost:3000. If it does not, never start
npm run dev, the Playwright MCP browser or npm run e2e.

0. Set up the worktree: npm ci, then ln -s <main checkout path>/.env.local .env.local.
   Never print or copy the contents of .env.local.
1. Branch <type>/<id>-<short-name> from the latest origin/develop.
2. Phases 2 to 4 of CLAUDE.md for this issue only: code, tests, npm run lint,
   npm run typecheck, npm run test, Playwright MCP evidence (and npm run e2e for integration work).
3. Commit, push, open a PR into develop with the template, "Closes #<id>",
   "Plan: docs/plans/NNN-<short-name>.md" and the Evidence section with screenshots.
4. Run the code-reviewer subagent on the PR. Fix every finding behind "request changes",
   rerun the checks, push, then run code-reviewer again. Merge only when its verdict is
   not "request changes". At most 2 fix rounds.
5. Bring the branch up to date with develop if it moved, rerun the checks, merge the PR
   (merge commit), verify develop (merged, diff present, checks pass), and close the
   issue if "Closes #<id>" did not.
6. Stop instead of asking:
   - needs something the plan or contract lacks -> don't do it, report "blocked: <reason>";
   - checks fail after 3 attempts, or "request changes" after 2 rounds -> leave the PR
     open, report "needs discussion: <reason>".
Never push to develop or main, force-push, delete branches, merge into main,
edit contract/ by hand or act in another repository.

End your report with:
## Notes for the run
- Result: merged | blocked | needs discussion
- PR: <link>
- Assumptions: ...
- Follow-ups (bugs, improvements): ...
```

## 3. After each task

1. Read the session's report. It is the session's own word, not proof: check with `gh pr view <n> --json state,mergeCommit` and `git log origin/develop`.
2. Add its line to the **Run log** and copy its notes into the right sections of the notes file on `docs/plan-NNN-notes`. Commit and push after each task.
3. If the result is `blocked` or `needs discussion`, mark every task that depends on it `skipped`.

## 4. End of the run

1. On the latest `develop`, run `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run e2e` when the plan has integration work. Write the results in the notes file.
2. Bring `docs/plan-NNN-notes` up to date with `develop`, open its PR and merge it.
3. Report to the user in Vietnamese: each task with its PR and result, then what is in "Blocked / needs discussion" and "Follow-ups". Say plainly what was not verified.

## Notes file template

```markdown
# Plan NNN notes: <title>

Plan: docs/plans/NNN-<short-name>.md
Run: <start date> to <end date>

## Run log

| Task | Issue | Session | PR | Result |
| --- | --- | --- | --- | --- |
| 1 | #<id> | <session name> | #<pr> | merged |

## Assumptions made

- <task>: what was decided instead of asking, and why.

## Blocked / needs discussion

- <task>: what stopped it, and what is needed to unblock it.

## Follow-ups

- Bug: ...
- Improvement: ...

## Checks on develop

- `npm run lint`: ...
- `npm run typecheck`: ...
- `npm run test`: ...
- `npm run e2e`: ... or Not verified: <reason>
```
