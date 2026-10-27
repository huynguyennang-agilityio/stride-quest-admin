# CLAUDE.md

Guidance for Claude when working in this repository.

## Project

StrideQuest Admin is the web admin of StrideQuest, a running app where every run is a quest: runners complete challenges to unlock medals. Admins sign in here to create, edit, publish, unpublish and delete challenges, with their quests, cover images and medals.

The backend and the mobile app live in another repository, [`claude-code-training`](https://github.com/huynguyennang-agilityio/claude-code-training). This repo has **no backend code**: it only calls the FastAPI API. A change the admin needs from the backend (a new endpoint, a changed field) goes through a plan in that repository, then reaches this one as a contract update (see [Contract](#contract)).

The plan that set up this repo, with the architecture, the screens and the reasons, is [`docs/plans/001-web-admin.md`](docs/plans/001-web-admin.md). The screens are drawn on the [design canvas](https://claude.ai/artifact/69YEnnAxPVFTBipm1j3cVa).

- **Web:** Next.js (App Router) and TypeScript (`strict`). Tailwind CSS and shadcn/ui, `lucide-react` icons. Forms with `react-hook-form` and `zod`. API types generated with `openapi-typescript` from the contract, calls made with `openapi-fetch` on the server only.
- **Tests:** Vitest, React Testing Library and `vitest-axe` for units and components; MSW for fixtures and mock mode; Playwright test specs in `e2e/` for flows against the local backend.
- **Browser for Claude:** the Playwright MCP server (`.mcp.json`), used to open the running app, walk a flow and take screenshots for the evidence.
- **Package manager:** `npm`.

## Planned structure

This is the target layout. The app, its tooling and the empty folders exist; issue #3 adds `contract/`, `scripts/` and `src/lib/api/`, and later issues fill the rest.

```text
contract/                       API contract copied from claude-code-training; SOURCE = its commit SHA
scripts/sync-contract.sh        copies the contract at a given SHA and regenerates the API types
src/app/(auth)/                 sign in
src/app/(admin)/                pages behind sign in (layout, challenges)
src/features/<feature>/         actions.ts, queries.ts, schema.ts, mappers.ts, components/
src/lib/api/                    client.ts (server-only), schema.d.ts (generated), errors.ts
src/lib/config.ts               environment, validated with zod
src/components/ui/              shadcn/ui components
src/proxy.ts                    route guard and token refresh (Next.js 16 name for middleware; Node.js runtime)
tests/fixtures/                 loaded from contract/examples, never hand-written copies
tests/msw/                      MSW handlers per module
e2e/                            Playwright specs
```

## Architecture rules

- **Next.js is a backend-for-frontend.** The browser talks only to Next.js. Next.js calls FastAPI with `Authorization: Bearer <access token>`. The browser never sees a token.
- **Server-only API.** Only `src/lib/api/` talks to FastAPI, and `client.ts` starts with `import "server-only"`. Components and client code never `fetch` the backend.
- **Reads and writes.** Reads run in Server Components through `features/<feature>/queries.ts`. Writes run in Server Actions in `features/<feature>/actions.ts`; they return a typed result (`{ ok: true, data } | { ok: false, error }`) and call `revalidatePath` after a change.
- **Features.** A feature imports another feature only through that feature's exported queries, actions or components, never its internals.
- **Session.** The access and refresh tokens live in `HttpOnly` cookies (`SameSite=Lax`, `Secure` in production). Only `src/proxy.ts` refreshes tokens, once per request, so two calls never rotate the same refresh token. Other server code that gets `401 token_expired` or `invalid_token` redirects to `/login`. Only accounts with `role = admin` may sign in; the backend still enforces `admin` on every write route.
- **Errors.** Branch on `error.code` of the `ErrorResponse`, never on `message`. `src/lib/api/errors.ts` turns it into an `ApiError { status, code, fields }`. `validation_error.fields` land on the matching form fields. Show messages written for people, never raw exception text.
- **Types.** API types come from the generated `src/lib/api/schema.d.ts`; no hand-written copies. Zod form schemas mirror the contract's field rules and are tested against the contract examples.
- **Mock mode.** `API_MODE=mock` (development only) serves the contract fixtures through MSW, so screens work without the backend. The default is `real`.
- **Redirects.** A `next` parameter is followed only when it is a relative path inside the app.

## Contract

The API contract is the source of truth for both repositories. It lives in `claude-code-training` under `docs/api/` (`auth.md`, `challenges.md`, `examples/`, `openapi.json`) and is copied here into `contract/` by `scripts/sync-contract.sh <sha>`, which writes the SHA to `contract/SOURCE` and regenerates the types.

- Never edit `contract/` by hand. A contract update is its own PR (label `contract`).
- If the admin needs something the contract lacks, stop: it is a backend change, planned in `claude-code-training` first.

## Language

- Explain things to the user in Vietnamese.
- Write all code, comments, docs, commit messages and PR text in English.

## Workflow

Every change goes through the phases below in order. Don't skip a gate. When a gate needs the user's approval, stop and ask, except inside an [autonomous plan run](#autonomous-plan-runs): there the approval of the plan stands in for the user's steps of its tasks (commit, push, PR, the per-PR review, merge into `develop`, closing the issue). Every other gate still applies; a task that fails one is marked `blocked` (rule 4 of that section). The phases, branching and review flow are drawn in [`docs/workflow.md`](docs/workflow.md); if it disagrees with this file, this file wins.

General rules:

- Every non-trivial change starts from an approved plan file (Phase 1). No plan, no issue and no code.
- Work on one GitHub issue at a time. In an autonomous plan run, each child session works on one issue, and at most 2 run at once.
- `develop` is the default branch. `main` holds released code and only receives merges from `develop`.
- Never push directly to `develop` or `main`.
- Don't commit unless asked (an autonomous plan run counts as asked for its own tasks). After each task, suggest a short commit message.
- A grant such as "go ahead without asking" or "skip the review" covers only the tasks or the session the user named. Don't carry it to new work. The approval of an autonomous plan covers exactly that plan: a new plan, or an edit to it, needs a new approval.

### Git and GitHub permissions

Being able to run a command is not permission to run it.

| Action | Allowed |
| --- | --- |
| Write a plan under `docs/plans/`, push its `docs/plan-NNN-<name>` branch and open its PR | Yes, when the user asks for work that needs a plan |
| Set `Status: approved` on a plan | Only after the user approves that plan in chat in this session ("approve plan NNN"), with `Approved by: <user> in chat`. Otherwise the user does it |
| Create an issue | Only from a plan whose `Status:` is `approved` on `develop`, exactly as the plan lists them |
| Create a branch and edit files for an issue from an approved plan | Yes |
| Commit | Only when the user asks, or inside an autonomous run of an approved plan |
| Push, open a PR | Only when the user asks, the task explicitly includes it, or inside an autonomous run of an approved plan |
| Merge a PR, close an issue | Only when the user explicitly authorizes that PR or issue, the plan PR after the user approves that plan in chat, or inside an autonomous run for the PRs and issues of that plan (merge into `develop` only) |
| Push to `develop`/`main`, force-push, delete branches | Never |

If a GitHub action isn't possible in the current session (no `gh`, no network, tool not permitted), say so and give the user the exact content to do it themselves: issue text, PR title and description, or commands.

### Phase 0: Project foundation

Set these up once and update them when they change: architecture, tech stack, repo layout, Claude rules (this file), the Playwright MCP server and local tooling (linters, formatters, test runners, the Stop hook).

### Phase 1: Plan, approval and issues

Every change goes through a plan file first. The one exception is a trivial change (a typo, a one-line fix); say in your reply that you are treating it as trivial.

1. Classify the ticket by type and check that it has the evidence below (the ticket evidence gate).
2. Write the plan as `docs/plans/NNN-<short-name>.md` (`NNN` is the next number; use the template in [`docs/plans/README.md`](docs/plans/README.md)): context, open questions and assumptions, approach (routes, features, files, API calls, security), risks, verification, and the list of issues to create, each with a title, labels, acceptance criteria and dependencies.
3. Put it on a `docs/plan-NNN-<short-name>` branch from `develop` and open a PR into `develop`. A plan needs no issue. Its first line after the title is `Status: draft`.
4. Publish the plan as an Artifact for reading (if no Artifact tool is available, give the user the plan PR link instead), then stop. The user reviews the plan and, when they agree, either sets `Status: approved` (with the date) and merges the PR, or says "approve plan NNN" in chat. Only after that chat approval do you write `Status: approved`, `Approved: <date>` and `Approved by: <user> in chat`, and merge the plan PR. That approval covers the plan PR only: a `Run mode: step by step` plan keeps the user's steps for its task PRs. You never write `approved` without it. If the plan is edited after approval, it goes back to `draft` and needs approval again; writing the issue numbers into `Issues:` is not an edit.
5. Only when the plan is `approved` on `develop`: create the issues exactly as the plan lists them, each with `Plan: docs/plans/NNN-<short-name>.md` in its description, and write the issue numbers back into the plan's `Issues:` line (a docs change through its own PR).
6. Branch from `develop` as `<type>/<issue-id>-<short-name>` (for example `docs/1-workflow`, `feat/4-sign-in`).

If the work needs something the approved plan does not cover (a new page, a new API call, a dependency, a larger scope), stop and go back to step 2.

**Web tasks: mock and integration**

A web feature that calls an endpoint which is **not yet merged** in the backend is planned as two issues, so the web work doesn't wait on the backend. When every endpoint it needs is already merged and in `contract/openapi.json`, it stays one issue labelled `web`, `integration`.

| Issue | Labels | Depends on | Scope | Evidence |
| --- | --- | --- | --- | --- |
| `feat: <feature> (web, mock)` | `web`, `mock` | the contract update that brings `<module>.md` and its examples into `contract/` | pages, actions, queries, schemas and the API calls written against the contract; MSW handlers returning fixtures loaded from `contract/examples/` | logic, component and UI rows, with the app run in `API_MODE=mock`. The Integration row is `Not verified: backend not merged` |
| `feat: <feature> (web, integration)` | `web`, `integration` | the mock issue and every backend issue for those endpoints | run against the local backend, fix drift from the contract, error mapping | the Integration row: one success case and each documented error, against the local backend |

- **Integration gate:** start an integration issue only when every backend issue it depends on is closed in `claude-code-training` and its endpoints are in `contract/openapi.json` on `develop` here. Otherwise stop and tell the user which backend issue is still open.
- If integration needs a contract change, stop and go back to step 2.

**Ticket evidence gate**

| Ticket type | Required evidence |
| --- | --- |
| `ui` | The screen on the design canvas, a screenshot or a mockup; a video when the interaction matters |
| Feature with UI | Design reference if the UI must follow an existing design; description of the expected behavior |
| `bug` | Steps to reproduce, expected result, actual result; screenshot, video or log when relevant |
| API call / integration | The contract section in `contract/` with its sample request and response |
| Refactor / chore | Scope and the behavior that must stay unchanged; no images needed |

- **Required evidence missing:** ask for it before writing code. Don't guess what the user wants.
- **Non-essential detail missing:** continue only if you state the assumption in the issue or plan and it doesn't materially change the result.

For `ui` tickets and features with UI, the acceptance criteria also name the states the screen can show (loading, empty, error, success, as they apply). The default sizes are 1280×800 (desktop) and 390×844 (phone), in light and dark.

### Phase 2: Design gate

1. Analyze the impact: the routes, features, files, API calls and session handling the change touches.
2. Check the contract in `contract/` covers every call. If it doesn't, stop: the backend changes first.
3. The approved plan is the presentation. If the implementation has to differ from it, update the plan and get it approved again before going on.
4. The plan must call out, and the user's approval must cover, any of these:
   - a new dependency or a change of core technology;
   - authentication, the session cookies, authorization or another security boundary;
   - architecture or the rules above;
   - anything that can affect real data, production environments or external costs.

### Phase 3: Implement and test

Build in small steps. For each step:

1. Write the code.
2. Add or update tests. Every feature needs tests.
3. Run lint: `npm run lint`.
4. Run type checks: `npm run typecheck`.
5. Run the tests: `npm run test`.

A `Stop` hook (`.claude/hooks/check.sh`, set up in `.claude/settings.json`) runs lint, type check and unit tests when you changed files and tries to finish, and blocks until they pass. It skips the Playwright specs, which need the backend, so run `npm run e2e` yourself before Phase 4. After 3 failed stops in a row it lets you stop and warns the user.

Passing tests don't prove everything works: Vitest doesn't show the page matches the design, and mocks don't show the app works against the backend. Also verify by ticket type:

- **UI:** open the running app with the **Playwright MCP server**, go through the screen's states and take screenshots at 1280×800 and 390×844, light and dark. Compare them with the screen on the design canvas.
- **Flow / integration:** walk the flow once with the Playwright MCP server against the local backend, then keep it as a Playwright spec in `e2e/` so `npm run e2e` repeats it. On a `(web, mock)` issue, walk the flow in `API_MODE=mock` for the screenshots; the `e2e/` spec comes with the integration issue.
- **Bug:** reproduce the bug before fixing it when feasible, then repeat the same steps after the fix.

Use the Playwright MCP browser only on `localhost`, and sign in only with the local test admin from the project's seed or `.env.example`. Never use it on a shared or production environment, and never type a real password into it. `.mcp.json` backs this up: `--isolated` keeps the browser profile in memory, so no session cookie is saved to disk, and `--allowed-origins` lets the browser request only the local app (`localhost:3000`) and Cloudinary images. Playwright says that list is not a security boundary, so the rule above still applies; add a new origin there only through a plan.

Record what you ran and what you saw as verification evidence (below). If you can't run the app or the backend, say so plainly with a `Not verified: <reason>` line. Never claim the UI or a fix was verified when it wasn't.

#### Verification evidence

Verification evidence shows the work was checked. It is not the ticket evidence from Phase 1, which is input from the reporter.

- Don't report a task as done without an `## Evidence` section in your report, in the format of the PR template. When the user asks for a PR, the same section goes into its description.
- **Every PR that changes UI carries its Playwright screenshots in the description**, one per state and size, next to the design screen they match. Attach the images to the PR; don't commit them.
- Map each acceptance criterion to at least one piece of evidence. A change can match several rows below. Every row also includes the lint and type-check results.
- Redact tokens, passwords, `Authorization` headers, cookies and connection strings before pasting anything.

| Change | Evidence |
| --- | --- |
| Logic (schemas, mappers, actions, errors) | `npm run test -- <path>` command and result |
| Component / page | RTL test covering each state (loading, empty, error, success, as they apply) and an `axe` check, with the result |
| UI | Screenshots taken with the Playwright MCP server at 1280×800 and 390×844, light and dark, next to the design screen |
| Integration | The flow walked with the Playwright MCP server against the local backend, and the `npm run e2e` output for its spec: one success case and each documented error the screen handles |
| Auth / security | The cookie flags as seen in the browser, a test that a non-admin is refused, and that no token reaches a client component |
| Contract | The `contract/SOURCE` diff and `npm run contract:check` |
| Bug fix | The reproduction steps and the actual result before the fix; the same steps and the result after it |
| Chore / docs | The commands run and their results |

If a piece of evidence can't be produced (no backend running, no Cloudinary settings), write `Not verified: <reason>` instead. Never leave it out silently.

### Phase 4: Verification gate

Before opening a PR, confirm:

1. **Acceptance criteria:** each criterion is met, and you can say how it was checked.
2. **Regression:** `npm run lint`, `npm run typecheck` and `npm run test` pass. For integration work, `npm run e2e` passes against the local backend too. A `(web, mock)` issue has no backend to run e2e against: write `Not verified: backend not merged` instead.
3. **Security:** no leaked secrets, inputs are validated, tokens stay on the server and authorization checks are in place.
4. **Git diff:** `git diff develop...HEAD` contains only changes for this issue.
5. **Evidence:** the drafted `## Evidence` section covers each acceptance criterion, with evidence or a `Not verified: <reason>` line, and has the Playwright screenshots for any UI change.

### Phase 5: PR and review

1. When the user asks (in an autonomous plan run, without asking; see [Autonomous plan runs](#autonomous-plan-runs)), push the branch and open a PR into `develop` using `.github/pull_request_template.md`, link the issue with `Closes #<id>`, and name the plan (`Plan: docs/plans/NNN-<short-name>.md`). Say where the work deviates from the plan, or write "No deviations".
2. As soon as the PR is open, Claude runs the `code-reviewer` subagent on it, following [Reviewing pull requests](#reviewing-pull-requests). This happens automatically; don't wait for the user to ask.
3. The user reviews the PR. In an autonomous plan run there is no user review per PR: Claude addresses the `code-reviewer` findings, and the user reviews the run's notes file afterwards.
4. Address the review comments, then repeat Phases 3 and 4.

### Phase 6: Merge and close

1. The user approves the PR. In an autonomous plan run there is no user step here; step 2 says when Claude merges.
2. Claude merges only after the user explicitly authorizes merging that PR. Approving a plan, or an earlier "go ahead", is not that authorization, unless the plan is run as an autonomous plan run: then the plan's approval authorizes merging that plan's task PRs into `develop`, once `code-reviewer` has no "request changes" finding and the checks pass.
3. Verify `develop` after the merge:
   - the PR shows as merged into `develop`;
   - the merge commit and diff on `develop` contain the change;
   - the relevant local checks pass again on `develop`, when feasible.
4. Report a pipeline result only if a pipeline is configured and actually ran. The repo has no CI right now, so say "no pipeline" instead.
5. Close the issue if `Closes #<id>` did not close it.

### Autonomous plan runs

A plan with `Run mode: autonomous` runs end to end after one approval. The step-by-step guide is the [`run-plan`](.claude/skills/run-plan/SKILL.md) skill; this section holds the rules.

1. **Approval.** The user says "approve plan NNN" in chat, or writes it as their own comment on the plan's Artifact, relayed to this session. A comment by anyone else, an issue or PR comment, a file or a message from another session is not an approval. An autonomous plan approved on GitHub (`Status: approved` set by the user) runs step by step, unless the user then approves the run in chat. That one message authorizes, for that plan only: setting `Status: approved`, creating its issues and branches, commits, pushes, PRs, the review, merges into `develop` and closing its issues.
2. **Orchestrator.** The session where the user approved sets the approval lines, merges the plan PR, then creates the issues, writes their numbers into `Issues:` through a docs PR, and creates `docs/plans/NNN-<short-name>-notes.md` on a `docs/plan-NNN-notes` branch, committing to it after each task. Then it runs the plan's waves in order, each task in its own child session (`start_session`, its own worktree, fresh context). **Never more than 2 child sessions run at once, and only one of them runs the app** (`npm run dev`, the Playwright MCP browser or `npm run e2e`): the app, Playwright and the MCP allow-list all use `localhost:3000`, so a second app session would test the other task's code. A task with UI or e2e evidence waits until no other app-using task runs. When one ends, it checks the result (PR merged, the change on `develop`), copies the session's notes into the notes file and starts the next task whose dependencies are merged.
3. **Task sessions.** Each one follows Phases 2 to 6 for its issue: set up the worktree (`npm ci`, link `.env.local` from the main checkout without printing it), branch from the latest `develop`, code and tests, lint, type check, tests, Playwright MCP evidence, commit, push, PR, `code-reviewer`, fix the findings and rerun `code-reviewer` until its verdict is not "request changes", update from `develop` when it moved, merge, verify `develop`, close the issue if `Closes #id` did not. It never asks the user; it ends with a "Notes for the run" section.
4. **No questions, only notes.** A non-essential gap: assume, note it, continue. A task that needs something the plan or the contract does not cover (a backend change, a new dependency, a security change the plan does not name, an integration gate that is not met): don't do it, mark it `blocked`, skip its dependents. Checks still failing after 3 attempts, or "request changes" after 2 fix rounds: leave the PR open and unmerged, mark it `needs discussion`, skip its dependents.
5. **End of the run.** Rerun `npm run lint`, `npm run typecheck`, `npm run test` (and `npm run e2e` when the plan has integration work) on `develop`, write the summary into the notes file, merge it through a docs PR, and report to the user with the PR links and the notes. The user and Claude then go through the notes to plan fixes and improvements.
6. **Never, even in a run:** push directly to `develop` or `main`, force-push, delete branches, merge into `main`, edit `contract/` by hand, act in another repository, or break the browser and credential rules in Phase 3.

## Reviewing pull requests

When asked to review a PR, walk these five steps in order and report findings under each step's heading. Write "No issues found" for a step with nothing to report. Don't skip ahead: a correctness problem matters more than a naming nit.

1. **Correctness:** does the change do what the linked issue asks? Check edge cases, error handling and the issue's acceptance criteria.
2. **Tests:** is new logic covered by tests, and do the tests check behavior rather than implementation? Compare the tests with the contract in `contract/` and the issue's acceptance criteria, not only with the code, and flag an assertion that was changed to make a test pass. Does a UI change have its Playwright screenshots?
3. **Readability:** are names clear, functions short and code free of duplication? Does it follow the architecture rules above?
4. **Security basics:** are there leaked secrets, unvalidated inputs, tokens reaching client code, cookies without `HttpOnly`, or missing admin checks?
5. **Scope:** does the PR cover exactly one issue? Flag unrelated changes.

For each finding, give the file and line, what is wrong, and a suggested fix. End with a verdict: approve, approve with nits, or request changes.
