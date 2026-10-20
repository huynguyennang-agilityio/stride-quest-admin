# Plan 001: StrideQuest web admin — workflow, structure, sign in and challenge management

Status: approved
Approved: 2026-10-20
Issues: #1, #2, #3, #4, #5, #6, #7, #8 (plan issues 1 to 8, in order)

## Context

StrideQuest (backend and mobile in [`claude-code-training`](https://github.com/huynguyennang-agilityio/claude-code-training)) needs a web admin so an operator can manage challenges without `curl` or `hurl`. Plan 001 of that repo says "a web admin comes later"; this is that plan, in its own repository (`stride-quest-admin`).

The plan has four parts, in order:

1. **Workflow:** the same phases, gates, permissions and evidence rules as `claude-code-training`, trimmed to a single Next.js web app (no Flutter, no backend code here).
2. **Code structure:** the Next.js app, tooling and the API layer.
3. **Sign in:** admin-only sign in and sign out.
4. **Challenge management:** list, create, edit, publish, unpublish and delete challenges, with quests and image upload.

### Backend status (checked on `claude-code-training` `develop`, commit `587ac91`)

Every endpoint this plan needs is merged and in `docs/api/openapi.json`, guarded in `ROUTE_ACCESS` (`backend/tests/unit/test_auth_sweep.py`). The **integration gate is open** for all of them; nothing here waits on the backend.

| Need | Endpoint | Auth | Status |
| --- | --- | --- | --- |
| Sign in | `POST /api/v1/auth/signin` | public | merged |
| Refresh | `POST /api/v1/auth/refresh` | public (refresh token in body) | merged |
| Sign out | `POST /api/v1/auth/signout` | public (refresh token in body) | merged |
| Who am I, role | `GET /api/v1/users/me` | user | merged |
| List (published / draft, type, q, cursor) | `GET /api/v1/challenges?status=draft` | user, `draft` admin only | merged |
| Detail (drafts for admins) | `GET /api/v1/challenges/{id}` | user | merged |
| Create draft | `POST /api/v1/challenges` | admin | merged |
| Edit | `PATCH /api/v1/challenges/{id}` | admin | merged |
| Delete draft | `DELETE /api/v1/challenges/{id}` | admin | merged |
| Publish / unpublish | `POST /api/v1/challenges/{id}/publish`, `/unpublish` | admin | merged |
| Quests | `GET /api/v1/quests`, `POST /api/v1/quests` | user / admin | merged |
| Image upload | `POST /api/v1/images` (multipart) | admin | merged |

Not available in the backend, and **out of scope** here: making an admin (only `python -m app.scripts.create_admin`), editing or deleting a quest, listing users, enrollments or runs, a single "all statuses" list (the admin list shows two tabs instead).

## Open questions and assumptions

1. **Repository:** the admin stays a separate repo (`stride-quest-admin`), not a `web/` folder in `claude-code-training`. *Assumption; the user confirms.* Consequence: the API contract lives in the other repo, so it is copied here by a script pinned to a commit (see Contract sync).
2. **Mock and integration split:** the training repo splits each UI feature that calls an endpoint into `(mock)` and `(integration)` issues. Here every endpoint is already merged, so **this plan lists each feature as one issue** that is built and verified against the local backend, while tests still use fixtures equal to the contract examples. The split rule is kept in `CLAUDE.md` for later features whose endpoints are not merged yet. *The user confirms.*
3. **Design reference:** there is no Figma. The screens of Parts 3 and 4 are drawn on the design canvas <https://claude.ai/artifact/69YEnnAxPVFTBipm1j3cVa> (sign in and its errors; list with its states; detail with publish, unpublish and delete; create and edit forms with medal images). They are the ticket evidence for issues 4–8. The app is built with shadcn/ui in those colors and layouts, and the user approves screenshots of it in each PR.
4. **Who may sign in:** only accounts with `role = admin`. A valid user without the role is signed out at once and sees "This account is not an admin." *Assumption.*
5. **Timezone:** dates are entered and shown in the browser's timezone and sent as ISO 8601 with offset. *Assumption.*
6. **Package manager:** `npm` (Node 20.12 is installed, `pnpm` is not). *Assumption.*
7. **Branches:** `develop` is the default branch and `main` holds releases, as in the training repo. The repo has no commit yet, so the user creates the first commit on `main`, then `develop`, and sets `develop` as default on GitHub (the bootstrap step below). Claude never pushes to `main` or `develop`.

## Approach

### Part 1: Workflow (Phase 0)

Copied from `claude-code-training` and trimmed. What changes:

| Training repo | Admin repo |
| --- | --- |
| `CLAUDE.md` with mobile + backend rules | `CLAUDE.md` with the same Language, Workflow (Phases 0–6), Git and GitHub permissions, ticket evidence gate, verification evidence and PR review sections; architecture rules for Next.js only |
| `docs/workflow.md` (phases, branching, PR, mock/integration diagrams) | Same diagrams, "mobile" renamed to "web"; the mock/integration diagram uses `API_MODE=mock` with MSW |
| `docs/plans/README.md` template | Same template; the issue table example uses `(web)` issues |
| `.github/pull_request_template.md` | Same, unchanged |
| Agents `planner`, `code-reviewer`, `flutter-dev`, `fastapi-backend` | `planner` (repo name changed), `code-reviewer` (security step checks the cookie and role rules below instead of `ROUTE_ACCESS`), new `nextjs-dev`. No backend agent: backend changes go to the training repo through its own plan |
| Skills `flutter-feature`, `fastapi-module` | New `nextjs-feature` skill: the steps to add a feature folder, route, server actions, queries, schema, tests |
| Stop hook `check.sh` (flutter / ruff / mypy / pytest) | Same logic: on changed files run `npm run lint`, `npm run typecheck`, `npm run test` (Vitest). E2E (Playwright) needs the backend, so it is run by hand in Phase 4, like integration tests there |
| No browser tool for Claude (Flutter is checked on a simulator) | Project `.mcp.json` with the **Playwright MCP server** pinned to `@playwright/mcp@0.0.83`, so Claude can open the running app on `localhost`, click through a flow and take screenshots. Used for verification in Phase 3; the repeatable checks stay in Playwright test specs under `e2e/` |
| Labels `frontend`, `backend`, `mock`, `integration`, `docs`, `chore` | `web`, `mock`, `integration`, `docs`, `chore`, `contract` (created once with `gh label create`) |
| GitLab mirror | Not used. *Assumption; the user says if the admin must be mirrored too* |

Evidence rows for the admin (replacing the Flutter and FastAPI rows):

| Change | Evidence |
| --- | --- |
| Logic (schemas, mappers, actions) | `npm run test -- <path>` and its result |
| Component / page | RTL test covering each state (loading, empty, error, success) and an `axe` check (`vitest-axe`) |
| UI | Screenshots of the running app taken with the Playwright MCP server at 1280×800 and 390×844, light and dark, next to the matching screen of the design canvas |
| Contract | `contract/SOURCE` diff and `npm run contract:check` |
| Integration | The flow walked once with the Playwright MCP server against the local backend, then kept as a Playwright spec in `e2e/`; `npm run e2e` output covering one success case and each documented error code the screen handles |
| Auth / security | The cookie flags (`HttpOnly`, `Secure` in production, `SameSite=Lax`), a test that a non-admin is refused, and that no token reaches client components |

### Part 2: Code structure

**Stack**

- Next.js (App Router) + React + TypeScript (`strict`).
- UI: Tailwind CSS + shadcn/ui; icons `lucide-react`.
- Forms: `react-hook-form` + `zod` (`@hookform/resolvers`).
- API: `openapi-typescript` (types generated from the contract) + `openapi-fetch` (typed client), **called only from the server**.
- Tests: Vitest + React Testing Library + `vitest-axe`; MSW for fixtures and mock mode; Playwright for E2E.
- Lint: ESLint (`next/core-web-vitals`, `typescript-eslint`), Prettier, `tsc --noEmit`.

**Architecture: Next.js as a BFF (backend-for-frontend)**

```text
Browser ──(httpOnly cookies, same origin)──▶ Next.js server ──(Authorization: Bearer)──▶ FastAPI /api/v1
```

- The browser never sees a token. Next.js keeps the access and refresh tokens in httpOnly cookies and adds the `Authorization` header when it calls FastAPI. FastAPI needs no CORS change.
- Reads happen in Server Components (`features/*/queries.ts`); writes in Server Actions (`features/*/actions.ts`) that return a typed `ActionResult` and call `revalidatePath`.
- `src/lib/api/client.ts` is `import "server-only"`, so a client component can't import it by mistake.

**Layout**

```text
contract/                       copied from claude-code-training: openapi.json, *.md, examples/; SOURCE = commit SHA
scripts/sync-contract.sh        copies the contract at a given SHA; contract:check fails when types are stale
src/
  app/
    (auth)/login/page.tsx
    (admin)/layout.tsx          sidebar + header, reads the session
    (admin)/challenges/page.tsx              list
    (admin)/challenges/new/page.tsx          create
    (admin)/challenges/[id]/page.tsx         detail
    (admin)/challenges/[id]/edit/page.tsx    edit
  features/
    auth/          actions.ts, session.ts, login-form.tsx, schema.ts
    challenges/    actions.ts, queries.ts, schema.ts, mappers.ts, components/
    quests/        actions.ts, queries.ts, components/
    images/        actions.ts, components/image-upload.tsx
  lib/
    api/           client.ts (server-only), schema.d.ts (generated), errors.ts (ErrorResponse → ApiError)
    config.ts      env read and validated with zod (API_BASE_URL, API_MODE)
  components/ui/   shadcn
  middleware.ts    route guard and token refresh
tests/
  fixtures/        loaded from contract/examples (no hand-written copies)
  msw/             handlers per module
e2e/               Playwright specs
```

**Architecture rules (go into `CLAUDE.md`)**

- A feature never imports another feature's internals, only its exported `queries`/`actions`/components.
- Only `lib/api/` talks to FastAPI. Components never call `fetch` to the backend.
- Errors: branch on `error.code`, never on `message`. `lib/api/errors.ts` turns an `ErrorResponse` into an `ApiError { status, code, fields }`; `validation_error.fields` are put on the matching form fields.
- Types for API data come from `schema.d.ts`; no hand-written duplicates. Form schemas (zod) mirror the contract's field rules and are tested against the contract examples.
- Mock mode: `API_MODE=mock` (dev only) starts MSW on the server with the contract fixtures, so screens can be seen and screenshotted without the backend. Default is `real`.

**Contract sync**

`scripts/sync-contract.sh <sha>` copies `docs/api/{openapi.json,*.md,examples/}` from `claude-code-training` at that SHA into `contract/`, writes the SHA to `contract/SOURCE` and regenerates `src/lib/api/schema.d.ts`. A test checks every fixture used in tests equals its example file. A contract change is its own PR (`contract` label), as in the training repo.

### Part 3: Sign in

- `/login` form (email, password) → Server Action `signIn`:
  1. `POST /auth/signin`. On `401 invalid_credentials` show "Email or password is incorrect."; on `429 rate_limited` show the wait from `Retry-After`; on `422` put `fields` on the form.
  2. If `user.role !== "admin"`: call `POST /auth/signout` with the refresh token, keep no cookie, show "This account is not an admin."
  3. Otherwise set cookies `sq_access` (`maxAge = expires_in`) and `sq_refresh` (30 days), both `HttpOnly`, `SameSite=Lax`, `Secure` in production, `Path=/`, and redirect to `/challenges` (or the `next` path, only if it is a relative path inside the app).
- `middleware.ts` on every `(admin)` route:
  - no refresh cookie → redirect to `/login?next=…`;
  - access cookie missing or expiring within 60 s → `POST /auth/refresh` once, set the new pair on the response (rotation: the old refresh token is now revoked); refresh fails → clear cookies, redirect to `/login`.
  - Refreshing **only in middleware** avoids two server calls refreshing the same token at once and one of them being signed out by rotation.
- Server code that still gets `401 token_expired | invalid_token` redirects to `/login` (no second refresh path).
- Header shows `display_name` from `GET /users/me`; "Sign out" → Server Action `signOut`: `POST /auth/signout`, delete both cookies, redirect to `/login`. Signing out twice is safe (`204`).
- Security boundary: this part is authentication. The backend still enforces `admin` on every write route; the web check is UX only.

### Part 4: Challenge management

**List** (`/challenges`)

- Tabs **Published** / **Drafts** (`status`), filter by **type** (run, swim, cycle), search `q` (≤100 chars, debounced), all in the URL search params.
- Table: cover thumbnail, title, type, target (steps or km), city, start–end, participants, status. Row → detail.
- Paging with `next_cursor` ("Load more"); `422 invalid_cursor` resets to the first page.
- States: loading (skeleton), empty (per tab, with "Create challenge"), error (retry).

**Create** (`/challenges/new`) and **edit** (`/challenges/[id]/edit`) share one form

- Fields from the contract's field rules: title, type, target value (label and unit follow the type: steps, or km entered and sent as metres), start and end, quest (select from `GET /quests`, with a "New quest" dialog → `POST /quests`), city, landmark, cover image, description and terms (Markdown textarea with a preview that renders no HTML), medals editor (bronze / silver / gold, each optional: name, image, threshold).
- Client validation (zod) mirrors the rules: tiers increase, no threshold above target, gold equals target, `ends_at` after `starts_at`. The backend checks again; its `validation_error.fields` land on the same fields.
- Image upload: Server Action forwards the file as `multipart/form-data` to `POST /images` with `kind` `covers` or `medals`; client checks type (JPEG/PNG/WebP) and size (≤5 MB) first. `next.config` sets `serverActions.bodySizeLimit` to `6mb` (default is 1 MB) and allows `res.cloudinary.com` images. Errors `413 image_too_large`, `415 unsupported_image_type`, `502 upload_failed`, `503 storage_not_configured` get their own messages.
- Medal images are uploaded the same way with `kind` `medals`; each medal needs a name, an image and a threshold, and the returned URL becomes its `image_url`.
- Create → `201` draft → redirect to the detail page.
- Edit sends only changed fields (`PATCH`); `null` clears cover, city or landmark. When `participant_count > 0` the frozen fields (type, target, dates, medals) are read-only with a note; a `409 challenge_in_use` still gets a message. `409 challenge_not_publishable` on a published challenge says what it can't lose.

**Detail** (`/challenges/[id]`)

- Every field, medals as checkpoints, participant count, status badge.
- Actions by status:
  - draft: **Edit**, **Publish** (`409 challenge_not_publishable` lists what is missing), **Delete** (confirm dialog; `409 challenge_not_draft` / `challenge_in_use` messages).
  - published: **Edit**, **Unpublish** (confirm dialog).
- `404 challenge_not_found` → the not-found page.

## Risks

- **Contract drift** between the two repos: contained by the pinned `contract/SOURCE`, generated types and `contract:check`; a backend change reaches here only through a contract PR.
- **Token rotation races:** contained by refreshing only in middleware; covered by a test that two parallel page loads do not sign the admin out.
- **Cookie leaks / CSRF:** httpOnly + `SameSite=Lax` cookies; Server Actions are POST-only and Next.js checks their `Origin`. The `next` redirect only accepts relative paths (open-redirect test).
- **Upload size:** the Server Action body limit is raised only to `6mb`; larger files are refused on the client and by the backend.
- **Local backend data:** E2E runs only against the local docker-compose database and a local admin account; never a shared or production environment. Image upload in E2E needs Cloudinary settings in the backend `.env`; without them the test checks the `503 storage_not_configured` message instead and says so.

## Verification

- Every issue: `npm run lint`, `npm run typecheck`, `npm run test` (the Stop hook runs them too).
- Sign in: RTL tests for each error code; Playwright against the local backend: admin signs in and lands on `/challenges`; a `role = user` account is refused; wrong password; sign out; an expired access cookie is refreshed transparently.
- Challenges: unit tests for zod schemas against the contract examples (`challenge_create_request.json` passes, broken medal tiers fail) and for the request mappers; RTL tests for each list state and the form errors; Playwright: create a draft with cover and two medals → publish → appears in Published → unpublish → delete.
- Screenshots of each screen at 1280×800 and 390×844, light and dark, taken with the Playwright MCP server and attached to the PR.
- The Playwright MCP browser only opens `localhost` and uses the local test admin from the seed or `.env.example`; never a shared or production environment.
- Not verifiable here: production cookie `Secure` behaviour over HTTPS (no deployment yet) — stated as `Not verified` in the PR.

## Ticket evidence

- UI issues (5–8): low-fidelity layout in the issue (from this plan) + screenshots for the user's approval in the PR (assumption 3).
- API: the sample requests and responses are the contract files copied into `contract/` (from `docs/api/auth.md`, `docs/api/challenges.md` and `docs/api/examples/`).

## Issues to create

Order and dependencies matter. Bootstrap (before issue 1, done by the user): first commit on `main` with this plan, create `develop`, set it as default.

| # | Title | Labels | Acceptance criteria | Depends on |
| --- | --- | --- | --- | --- |
| 1 | `docs: workflow, Claude rules and agents for the web admin` | docs, chore | - [ ] `CLAUDE.md`, `docs/workflow.md`, `docs/plans/README.md`, `.github/pull_request_template.md` adapted from `claude-code-training` as in Part 1<br>- [ ] `.claude/agents/{planner,code-reviewer,nextjs-dev}.md`, `.claude/skills/nextjs-feature/SKILL.md`<br>- [ ] `.mcp.json` with the Playwright MCP server (`@playwright/mcp@0.0.83`); `README.md` says how to enable it and how to fix an npm cache owned by root<br>- [ ] Labels created | none |
| 2 | `chore: scaffold the Next.js app and tooling` | chore, web | - [ ] Next.js + TS strict, Tailwind, shadcn/ui, ESLint, Prettier, Vitest + RTL + vitest-axe, Playwright, the folder layout of Part 2<br>- [ ] `npm run lint/typecheck/test/e2e` scripts; `.env.example` (`API_BASE_URL`, `API_MODE`)<br>- [ ] `.claude/settings.json` + `.claude/hooks/check.sh` running lint, typecheck and tests on changed files; a failing check blocks the stop | 1 |
| 3 | `chore: contract sync, typed API client and error mapping` | chore, contract, web | - [ ] `scripts/sync-contract.sh` + `contract/SOURCE` at `587ac91`; `schema.d.ts` generated; `contract:check`<br>- [ ] `lib/api/client.ts` (server-only), `errors.ts` with tests for every documented error shape<br>- [ ] MSW handlers and fixtures loaded from `contract/examples`; `API_MODE=mock` works in dev | 2 |
| 4 | `feat: admin sign in and sign out (web)` | web, integration | - [ ] Part 3 behaviour: cookies and their flags, admin-only, middleware guard and single refresh, `next` relative-only<br>- [ ] Messages for `invalid_credentials`, `rate_limited`, `validation_error`, not an admin<br>- [ ] RTL + Playwright evidence against the local backend; states: idle, submitting, error | 3 |
| 5 | `feat: admin layout and challenge list (web)` | web, integration | - [ ] Sidebar layout with user and sign out<br>- [ ] Published / Drafts tabs, type filter, search, cursor paging in the URL<br>- [ ] Loading, empty, error, success states tested; screenshots at both sizes | 4 |
| 6 | `feat: create a challenge with quests, medals and image upload (web)` | web, integration | - [ ] Form of Part 4 with zod rules tested against the contract examples<br>- [ ] Quest select + create dialog; cover and medal upload with every upload error message<br>- [ ] Backend `fields` mapped to form fields; Playwright: create a draft | 5 |
| 7 | `feat: challenge detail, publish, unpublish and delete (web)` | web, integration | - [ ] Detail page; actions by status with confirm dialogs<br>- [ ] Messages for `challenge_not_publishable`, `challenge_not_draft`, `challenge_in_use`, `challenge_not_found`<br>- [ ] Playwright: draft → publish → unpublish → delete | 6 |
| 8 | `feat: edit a challenge (web)` | web, integration | - [ ] Edit reuses the form; sends only changed fields; `null` clears cover/city/landmark<br>- [ ] Frozen fields read-only when people joined; `challenge_in_use` handled<br>- [ ] Tests and Playwright edit flow | 7 |
