# Plan 002: Use the Next.js 16 `proxy` file for the route guard and token refresh

Status: approved
Approved: 2026-10-20
Issues: <filled in after approval>

## Context

Issue #2 scaffolded the app on Next.js 16.4.2. In Next.js 16 the `middleware` file convention is deprecated and renamed to `proxy` (`node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md`, "`middleware` to `proxy`"):

- the file is `src/proxy.ts` and the exported function is `proxy`;
- it always runs on the Node.js runtime (the `edge` runtime is not supported there);
- config flags with `middleware` in their name are renamed too (for example `skipProxyUrlNormalize`).

Plan 001 (approved) and the Claude rules still name `src/middleware.ts` as the route guard and the **only** place that refreshes tokens. Issue #4 (sign in) is the first to write that file. If it follows the rules as written, it builds on a deprecated convention; if it uses `proxy.ts`, the code no longer matches the security rule that names the single refresh point. This plan settles the name before #4 starts. The code-review of PR #11 raised it.

## Open questions and assumptions

1. **Plan 001 stays approved and unchanged.** This plan amends it instead of editing it, because editing an approved plan sends it back to `draft` and would block issues #3–#8. Where plan 001 says `middleware.ts` or "middleware", read `src/proxy.ts` / "proxy". *The user confirms.*
2. **Behaviour is unchanged.** The proxy does exactly what Part 3 of plan 001 gives the middleware: guard `(admin)` routes, refresh the tokens once per request when the access cookie is missing or expires within 60 s, clear cookies and redirect to `/login` when refresh fails. Only the file name, the export name and the runtime change.
3. **Node.js runtime is fine.** The proxy calls `POST /auth/refresh` with `fetch` and sets cookies; nothing needs the edge runtime. *Assumption.*

## Approach

Docs and rules only; no application code (the proxy itself is written in issue #4).

- `CLAUDE.md`: in "Planned structure" replace `src/middleware.ts` with `src/proxy.ts` (route guard and token refresh, Node.js runtime); in the Session rule, "Only `src/proxy.ts` refreshes tokens".
- `.claude/agents/nextjs-dev.md`, `.claude/agents/code-reviewer.md`, `.claude/skills/nextjs-feature/SKILL.md`: the same rename where they name the single refresh point.
- `docs/plans/001-web-admin.md`: not edited (assumption 1).

Security boundary: this changes the wording of the session rule (where tokens are refreshed), not the rule itself. It is called out because the approval must cover any change to the authentication rules.

No new dependency, no API call, no change to cookies, real data, production or cost.

## Risks

- **Two names in the docs:** plan 001 keeps saying `middleware`. Contained by this plan's assumption 1 and by the rules (`CLAUDE.md`, agents, skill) all naming `src/proxy.ts`, which is what Claude and reviewers read when working.
- **Next.js changes the convention again:** the bundled docs in `node_modules/next/dist/docs/` are checked when issue #4 writes the file.

## Verification

- `grep -rn "middleware" CLAUDE.md .claude/` returns nothing that names the refresh point.
- Issue #4's review checks the proxy is the only refresh point (code-reviewer step 4 reads the updated rule).
- Chore / docs evidence: the commands above and their output.

## Ticket evidence

Chore / docs: scope and the behaviour that must stay unchanged are in "Approach" and assumption 2. No images needed.

## Issues to create

| # | Title | Labels | Acceptance criteria | Depends on |
| --- | --- | --- | --- | --- |
| 1 | `docs: name src/proxy.ts as the route guard and token refresh (Next 16)` | docs | - [ ] `CLAUDE.md` "Planned structure" and Session rule name `src/proxy.ts` (Node.js runtime)<br>- [ ] `nextjs-dev`, `code-reviewer` agents and the `nextjs-feature` skill name `src/proxy.ts`<br>- [ ] No rule or agent names `middleware.ts` as the refresh point; plan 001 unchanged | none; must be merged before issue #4 starts |
