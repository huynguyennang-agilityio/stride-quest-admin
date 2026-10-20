# StrideQuest Admin

The web admin of StrideQuest, a running app where every run is a quest. Admins sign in here to create, edit, publish and delete challenges, with their quests, cover images and medals.

The backend (FastAPI) and the mobile app live in [`claude-code-training`](https://github.com/huynguyennang-agilityio/claude-code-training). This app calls that backend's API; its contract is copied into `contract/`.

- Plan and architecture: [`docs/plans/001-web-admin.md`](docs/plans/001-web-admin.md)
- Screens: [design canvas](https://claude.ai/artifact/69YEnnAxPVFTBipm1j3cVa)
- How work is done (plans, issues, branches, evidence, review): [`CLAUDE.md`](CLAUDE.md) and [`docs/workflow.md`](docs/workflow.md)

## Status

The Next.js app and its tooling (issue #2), and the API contract, typed client, error mapping and mock mode (issue #3) are in place; the home page is a placeholder. Admin sign in and sign out with the route guard (issue #4), the sidebar layout and the challenge list (issue #5) are in place; creating, viewing and editing a challenge (issues #6–#8) come next.

## Requirements

- Node.js 20.12 or later, and `npm` (`.nvmrc` pins Node 20.12.1)
- Google Chrome, used by the Playwright specs and the Playwright MCP server
- From issue #4 on: the StrideQuest backend running locally, from `claude-code-training` (see its README), with an admin account:

  ```bash
  python -m app.scripts.create_admin you@example.com
  ```

## Setup

```bash
npm ci
cp .env.example .env.local
npm run dev
```

The app runs on <http://localhost:3000>. `.env.local` holds `API_BASE_URL` (the backend server root, such as `http://localhost:8000`; the contract's paths already start with `/api/v1`) and `API_MODE` (`real`, or `mock` in development to serve the contract fixtures). Never commit `.env.local`.

Dependency versions are pinned (`.npmrc` sets `save-exact`). Install from the lockfile with `npm ci`. When you add or upgrade a dependency on Node 20.12, its bundled npm 10.5 can fail with `Cannot read properties of null (reading 'edgesOut')`; run that install with a newer npm instead, for example `npx -y npm@10.9.4 install -D <package>@<version>`.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the app on port 3000 |
| `npm run build`, `npm start` | Production build and server |
| `npm run lint` | ESLint (`next/core-web-vitals`, `typescript-eslint`), no warnings allowed |
| `npm run format`, `npm run format:check` | Prettier write or check (Markdown is not formatted) |
| `npm run typecheck` | Generate Next.js route types, then `tsc --noEmit` |
| `npm run test` | Vitest with React Testing Library and `vitest-axe` (`test:watch` to watch) |
| `npm run contract:types` | Regenerate `src/lib/api/schema.d.ts` from `contract/openapi.json` |
| `npm run contract:check` | Fail when `contract/SOURCE` is not a commit SHA or the generated types are stale |
| `npm run e2e` | Playwright specs in `e2e/` against the local backend, in the installed Chrome; builds and starts the app (`npm run build && npm run start`) if nothing runs on port 3000 |

## Sign in, session and the proxy

Sign in is `/login`: the form calls the `signIn` Server Action, which calls `POST /api/v1/auth/signin` from the server. Only an account with `role = admin` gets a session; any other account is signed out again at once with "This account isn't an admin". The session is two `HttpOnly`, `SameSite=Lax` cookies (`Secure` in production): `sq_access` and `sq_refresh`. The browser never sees a token.

[`src/proxy.ts`](src/proxy.ts) (Next.js 16's name for middleware) guards every page but `/login` and is the only place that refreshes the tokens. The access cookie expires a minute before the token does; when it is gone the proxy swaps the refresh token for a new pair, once per refresh token even for parallel requests (in one server process). A page that still gets `401` from the backend sends the person to `/login`. The `next` parameter of `/login` is followed only when it is a relative path inside the app.

## Challenge list

`/challenges` shows the Published and Drafts tabs (`status`), a type filter (`type`), a search (`q`, at most 100 characters, debounced) and "Load more" (`cursor`); all of it is in the URL, so a view can be shared. "Load more" adds the next page to the ones on screen: the server reads the pages up to the cursor of the URL, and a cursor it never gave starts again from the first page. Dates are shown in the browser's timezone (UTC on the first render).

## End-to-end tests

`npm run e2e` runs [`e2e/`](e2e/) against the app and the **local** backend (never a shared or production one). It needs a local admin account. Sign one up in the app or through the API, make it an admin on the backend (`backend/` of `claude-code-training`, virtualenv active), and put its credentials in the git-ignored `.env.local`:

```bash
python -m app.scripts.create_admin you@example.com
```

```bash
E2E_ADMIN_EMAIL=you@example.com
E2E_ADMIN_PASSWORD=...
```

Without them the specs are skipped. The non-admin account the specs need is signed up through the API with a fresh email each run. The backend rate-limits failed sign-ins (20 per IP in 15 minutes); the specs make one failed attempt per run.

## API contract and mock mode

`contract/` is a copy of `docs/api/` from `claude-code-training` at the commit in `contract/SOURCE`. Never edit it by hand: update it with the full commit SHA, in its own PR (label `contract`):

```bash
scripts/sync-contract.sh <40-character sha>
```

The script replaces `contract/`, writes the SHA to `contract/SOURCE` and regenerates `src/lib/api/schema.d.ts`. Test fixtures (`tests/fixtures`) and the MSW handlers (`tests/msw`) load the examples from `contract/examples/`.

With `API_MODE=mock` in `.env.local`, `npm run dev` starts MSW on the server (`src/instrumentation.ts`) and answers every API call with the contract examples, so the screens work without the backend. Sign in succeeds as an admin, the list answers with the two example challenges (a second page behind "Load more", filters on type and search), a search for `slow` keeps the list loading for a minute, and a search for `server-error` shows its error state. Mock mode is refused in production.

## Stop hook for Claude

`.claude/settings.json` runs [`.claude/hooks/check.sh`](.claude/hooks/check.sh) when Claude Code tries to finish. If files differ from the merge base with `develop` (or are untracked), it runs `npm run lint`, `npm run typecheck` and `npm run test`, and blocks the stop with the failures until they pass. After 3 failed stops in a row it lets Claude stop and shows a warning. It needs `git`; `jq` is optional. It skips `npm run e2e`.

## Playwright MCP server

Claude uses the Playwright MCP server to open the running app, walk through a flow and take the screenshots that go into each UI pull request. It is set up for this project in [`.mcp.json`](.mcp.json), pinned to `@playwright/mcp@0.0.83`.

1. Open Claude Code in this folder and approve the `playwright` server when asked (or run `/mcp` in a `claude` terminal to see and reconnect it).
2. The first run downloads the package with `npx`, so it needs network access.

### If it fails to connect

If `/mcp` shows `playwright` as failed, run the server by hand to see why:

```bash
npx -y @playwright/mcp@0.0.83 --help
```

An `EACCES` error under `~/.npm/_cacache` means the npm cache has files owned by `root`, usually from an earlier `sudo npm`. Give the cache back to your user, then reconnect the server:

```bash
sudo chown -R $(id -u):$(id -g) ~/.npm
```

By default the server drives the installed Google Chrome; install Chrome if it is missing.

The server starts with `--isolated` (the browser profile stays in memory, so no session cookie is saved to disk) and `--allowed-origins` set to the local app (`http://localhost:3000`) and Cloudinary images. That list is a guardrail, not a security boundary: use the server only on `localhost`, sign in only with a local test admin, and never use it on a shared or production environment. If the dev server runs on another port, change the origin in `.mcp.json`.
