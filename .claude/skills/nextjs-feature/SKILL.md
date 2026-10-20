---
name: nextjs-feature
description: Step-by-step guide for adding or extending a StrideQuest Admin feature under src/features/ (schema, API call, query or Server Action, components, route) with its Vitest, RTL and Playwright tests, then verifying it with the Playwright MCP server. Use when creating a new page, form, Server Action, query or API call in the web admin.
---

# Next.js feature

How to build a feature in `src/features/<feature>/` and its route in `src/app/`. The rules themselves live in [`CLAUDE.md`](../../../CLAUDE.md). This skill shows how to apply them. If this file and CLAUDE.md disagree, CLAUDE.md wins; fix this file.

Examples use a `challenges` feature; swap in your own names. `features/auth` is the first feature built (issue #4); once it exists, copy its shape.

## Before you start

1. Make sure the issue has its ticket evidence and acceptance criteria (CLAUDE.md, Phase 1): the design screen, the states to show, the contract section.
2. Read the contract in `contract/<module>.md` and its examples in `contract/examples/<module>/`. Every call you make must be there. If it isn't, stop: that is a backend change.
3. Check which kind of issue it is (CLAUDE.md, "Web tasks: mock and integration"):
   - **`(web, mock)`:** build everything against the contract and run with `API_MODE=mock`; the Integration evidence row is `Not verified: backend not merged`.
   - **`(web, integration)`** or a single `web, integration` issue: check the Integration gate (backend issues closed, endpoints in `contract/openapi.json` on `develop`), then run against the local backend.

## Build order

Build inside out and add the tests for each step as you go.

```text
src/features/challenges/
├── schema.ts            # zod: form input and its rules
├── mappers.ts           # form values ⇄ API bodies, API data → view data
├── queries.ts           # reads for Server Components
├── actions.ts           # "use server" writes
└── components/          # client and server components of this feature
src/app/(admin)/challenges/
├── page.tsx             # list
├── new/page.tsx
└── [id]/page.tsx
```

### 1. Schema

- One zod schema per form, mirroring the field rules of the contract (lengths, ranges, enums, cross-field rules such as medal tiers).
- Test it with the contract's request examples: the example passes, each broken rule fails with a message for people.

### 2. API call and mapper

- Call the backend only through `src/lib/api/client.ts`, with the generated path types (`client.GET("/api/v1/challenges", ...)`). Never hand-write a response type.
- Map an error with `toApiError()` from `src/lib/api/errors.ts`, then to the feature's message by `code`. Every code the contract documents for that call has a message; anything else gets a generic one.
- `mappers.ts` turns form values into the request body (units: km entered, metres sent) and only the changed fields for a `PATCH`, with `null` to clear.
- Test the mappers and the error messages against `contract/examples/`.

### 3. Query or Server Action

- **Reads** (`queries.ts`): plain async functions used by Server Components. Search, filters and the cursor come from the URL's search params.
- **Writes** (`actions.ts`, `"use server"`): validate with the zod schema again, call the API, return `{ ok: true, data } | { ok: false, error: { code, message, fields } }`, then `revalidatePath` what changed. Never throw an API error to the client, and never return a token.
- A `401 token_expired` or `invalid_token` redirects to `/login`; don't refresh here (only `middleware.ts` does).

### 4. Components and page

- Server Component page that calls the query; client components only where there is interaction (forms, dialogs, tabs).
- Build every state the issue names: loading (`loading.tsx` or a skeleton), empty, error (with a retry), success.
- shadcn/ui components from `src/components/ui/`; follow the design screen's layout at 1280×800 and 390×844, in light and dark.
- Forms: `react-hook-form` with the zod resolver; put the action's `fields` back on the form with `setError`.
- Destructive actions (delete, unpublish) ask for confirmation in a dialog.

### 5. Tests

- **Unit** (Vitest): schema, mappers, error messages.
- **Component** (RTL + `vitest-axe`): each state renders, the main interaction works, no axe violations. Use the MSW handlers in `tests/msw/` with fixtures loaded from `contract/examples/`.
- **Flow** (Playwright, `e2e/`), integration work only: one spec per flow the issue names, against the local backend: one success case and each documented error the screen handles. A `(web, mock)` issue writes no spec; its integration issue does.

## Verify with the Playwright MCP server

Run `npm run lint`, `npm run typecheck`, `npm run test`. Then start the app (`npm run dev`, with the local backend for integration work or `API_MODE=mock` for a mock issue) and use the Playwright MCP server:

1. Resize to 1280×800, open the page, and screenshot each state. Repeat at 390×844 and in dark mode.
2. Walk the flow once, signed in as the local test admin: against the local backend for integration work, in `API_MODE=mock` for a mock issue. Note what the page did and check the console for errors.
3. Integration work only: turn the walk-through into a spec in `e2e/` and run `npm run e2e`. A mock issue writes `Not verified: backend not merged` instead.
4. Put each screenshot next to the matching design screen and check they agree.

Open only `localhost`, and never type a real password. If something can't be checked, write `Not verified: <reason>`.

## Checklist

- [ ] Every call is in the contract; no hand-written API types.
- [ ] Tokens never reach client code; only `src/lib/api/` calls FastAPI.
- [ ] Every documented error code has a message for people.
- [ ] Every named state is built and tested, with an axe check.
- [ ] Playwright MCP screenshots at both sizes, light and dark, ready for the PR's `## Evidence`.
- [ ] Integration work: each flow has an `e2e/` spec, and `npm run e2e` passes. Mock issue: `Not verified: backend not merged`.
- [ ] `npm run lint`, `npm run typecheck`, `npm run test` pass.
