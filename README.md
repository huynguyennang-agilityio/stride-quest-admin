# StrideQuest Admin

The web admin of StrideQuest, a running app where every run is a quest. Admins sign in here to create, edit, publish and delete challenges, with their quests, cover images and medals.

The backend (FastAPI) and the mobile app live in [`claude-code-training`](https://github.com/huynguyennang-agilityio/claude-code-training). This app calls that backend's API; its contract is copied into `contract/`.

- Plan and architecture: [`docs/plans/001-web-admin.md`](docs/plans/001-web-admin.md)
- Screens: [design canvas](https://claude.ai/artifact/69YEnnAxPVFTBipm1j3cVa)
- How work is done (plans, issues, branches, evidence, review): [`CLAUDE.md`](CLAUDE.md) and [`docs/workflow.md`](docs/workflow.md)

## Status

The Next.js app and its tooling are scaffolded (issue #2): the home page is a placeholder. The API client and contract (issue #3), sign in (issue #4) and the challenge screens (issues #5–#8) come next.

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

The app runs on <http://localhost:3000>. `.env.local` holds `API_BASE_URL` (the backend API base, including `/api/v1`) and `API_MODE` (`real`, or `mock` in development to serve the contract fixtures). Never commit `.env.local`.

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
| `npm run e2e` | Playwright specs in `e2e/`, in the installed Chrome; starts `npm run dev` if nothing runs on port 3000 |

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
