# StrideQuest Admin

The web admin of StrideQuest, a running app where every run is a quest. Admins sign in here to create, edit, publish and delete challenges, with their quests, cover images and medals.

The backend (FastAPI) and the mobile app live in [`claude-code-training`](https://github.com/huynguyennang-agilityio/claude-code-training). This app calls that backend's API; its contract is copied into `contract/`.

- Plan and architecture: [`docs/plans/001-web-admin.md`](docs/plans/001-web-admin.md)
- Screens: [design canvas](https://claude.ai/artifact/69YEnnAxPVFTBipm1j3cVa)
- How work is done (plans, issues, branches, evidence, review): [`CLAUDE.md`](CLAUDE.md) and [`docs/workflow.md`](docs/workflow.md)

## Status

The Next.js app is not scaffolded yet (issue #2). The setup steps below grow with it.

## Requirements

- Node.js 20 or later, and `npm`
- The StrideQuest backend running locally, from `claude-code-training` (see its README), with an admin account:

  ```bash
  python -m app.scripts.create_admin you@example.com
  ```

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
