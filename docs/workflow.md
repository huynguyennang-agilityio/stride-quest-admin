# Development workflow

These diagrams picture the workflow in [`CLAUDE.md`](../CLAUDE.md#workflow). If a diagram and `CLAUDE.md` disagree, `CLAUDE.md` wins; fix the diagram.

## 1. Phases and gates

Each change goes through phases 1 to 6 in order, starting from an approved plan file (`docs/plans/`). Only the user can approve a plan, on GitHub or by saying "approve plan NNN" in chat. Approving a plan in chat lets Claude merge the plan PR. Approving a step-by-step plan is not authorizing the merge of its task PRs; approving an autonomous plan is (see section 6). Diamonds are gates. A gate that needs the user stops the work until they answer.

Phase 0 (project foundation: architecture, stack, layout, Claude rules, Playwright MCP server, tooling) is not a step of each change. It is done once and revisited only when the foundation itself changes, through its own issue.

```mermaid
flowchart TD
    START(["New change"]) --> TRIV{"Trivial?<br/>(typo, one-line fix)"}
    TRIV -- yes --> P3
    TRIV -- no --> P1["Phase 1: Classify the ticket"]
    P1 --> G1{"Required evidence<br/>present?"}
    G1 -- no --> ASK1["Ask the user for it"] --> G1
    G1 -- yes --> PLAN["Write docs/plans/NNN-name.md<br/>Status: draft<br/>(open questions, approach, risks,<br/>verification, issues to create)"]
    PLAN --> PMR["Push docs/plan-NNN-name,<br/>open the plan PR"]
    PMR --> APPR{"User approves:<br/>Status: approved on GitHub,<br/>or 'approve plan NNN' in chat?"}
    APPR -- "no / edits needed" --> PLAN
    APPR -- "yes in chat,<br/>Run mode: autonomous" --> RUN(["Autonomous plan run:<br/>see section 6"])
    APPR -- "yes, step by step,<br/>or autonomous approved on GitHub<br/>(chat approval: Claude merges the plan PR)" --> ISSUE["Create the issues exactly as the plan lists them<br/>(Plan: link in each),<br/>branch type/id-name from develop"]
    ISSUE --> P2["Phase 2: Impact analysis,<br/>check the contract in contract/"]
    P2 --> G2{"Needs something the<br/>approved plan or the contract<br/>does not cover?"}
    G2 -- yes --> PLAN
    G2 -- no --> P3
    P3["Phase 3: Small steps<br/>code → tests → lint → type check<br/>+ Playwright MCP: walk the flow, screenshots<br/>Stop hook reruns the checks"] --> G4
    G4{"Phase 4 gate:<br/>criteria met, lint, types and tests pass,<br/>e2e passes (integration work only),<br/>security ok, diff in scope,<br/>evidence with screenshots drafted?"}
    G4 -- no --> P3
    G4 -- yes --> P5["Phase 5, when the user asks:<br/>first time: push, open PR into develop,<br/>Closes #id, Plan: link, deviations,<br/>Playwright screenshots in the description<br/>after review: push fixes to the same PR"]
    P5 --> REV["code-reviewer runs automatically<br/>when the PR is opened"]
    REV --> UREV{"User review:<br/>changes needed?"}
    UREV -- yes --> P3
    UREV -- no --> MERGE{"User authorizes<br/>the merge of this PR?"}
    MERGE -- not yet --> UREV
    MERGE -- yes --> P6["Phase 6: Merge, verify develop,<br/>close the issue"]
```

## 2. Branching

`develop` collects finished work through pull requests. `main` only receives merges from `develop` for a release. Nobody pushes directly to either.

```mermaid
gitGraph
    commit id: "plan 001"
    branch develop
    checkout develop
    commit id: "approve plan 001"
    branch docs/1-workflow
    checkout docs/1-workflow
    commit id: "docs: workflow"
    checkout develop
    merge docs/1-workflow id: "PR workflow"
    branch feat/4-sign-in
    checkout feat/4-sign-in
    commit id: "feat: sign in"
    commit id: "test: sign in e2e"
    checkout develop
    merge feat/4-sign-in id: "PR sign in"
    checkout main
    merge develop id: "release"
```

## 3. Pull request and review

```mermaid
sequenceDiagram
    actor U as User
    participant C as Claude
    participant P as Playwright MCP
    participant R as code-reviewer agent
    participant G as GitHub
    C->>P: open localhost, walk the flow, screenshots (desktop, phone, light, dark)
    P-->>C: screenshots and what the page did
    U->>C: Push and open the PR
    C->>G: git push, open PR into develop (template, Closes #id, screenshots)
    C->>R: review the PR (runs automatically)
    R-->>C: findings by step: correctness, tests (against contract/ and criteria), readability, security, scope
    C-->>U: PR link + review findings
    U->>G: review the PR
    loop until the user is satisfied
        U->>C: address comments
        C->>C: repeat Phase 3 and Phase 4
        U->>C: commit and push
        C->>G: push fixes to the same PR
    end
    U->>C: Merge PR #id
    C->>G: merge into develop
    C->>G: check PR merged, diff on develop
    C->>C: rerun local checks on develop
    C-->>U: result ("no pipeline" while CI is off)
    C->>G: close the issue if Closes #id did not
```

## 4. Contract and the backend

The API contract lives in `claude-code-training`. This repo copies it into `contract/` at a pinned commit. A web feature whose endpoints are not merged yet is split into a `(web, mock)` and a `(web, integration)` issue (see "Web tasks: mock and integration" in [`CLAUDE.md`](../CLAUDE.md#phase-1-plan-approval-and-issues)).

```mermaid
flowchart LR
    BE["claude-code-training<br/>docs/api/ on develop"] --> SYNC["Contract PR here<br/>scripts/sync-contract.sh &lt;sha&gt;<br/>contract/ + SOURCE + types"]
    SYNC --> Q{"Endpoints merged<br/>in the backend?"}
    Q -- yes --> ONE["feat: … (web)<br/>labels web, integration<br/>one issue"]
    Q -- no --> MOCK["(web, mock)<br/>MSW fixtures = contract examples<br/>API_MODE=mock"]
    MOCK --> GATE{"Integration gate:<br/>backend issues closed,<br/>endpoints in contract/openapi.json?"}
    GATE -- no --> WAIT["Stop, tell the user<br/>which backend issue is open"]
    GATE -- yes --> INT["(web, integration)<br/>app against the local backend"]
```

## 5. Permissions

The permission rules (what Claude may write, commit, push, create or merge, and that only the user approves a plan) stay as the table in [`CLAUDE.md`](../CLAUDE.md#git-and-github-permissions). They are not drawn as a diagram, so there is only one place to change them.

## 6. Autonomous plan run

A plan with `Run mode: autonomous` needs one approval, in chat. The session where the user approved is the orchestrator; each task runs in its own child session, at most 2 at once. Nothing stops to ask the user: doubts go into the notes file. The rules are in [`CLAUDE.md`](../CLAUDE.md#autonomous-plan-runs), the steps in the [`run-plan`](../.claude/skills/run-plan/SKILL.md) skill.

```mermaid
flowchart TD
    A(["User: 'approve plan NNN' in chat"]) --> B["Orchestrator: Status approved,<br/>create the issues, Issues: line,<br/>merge the plan PR, start NNN-name-notes.md<br/>on docs/plan-NNN-notes"]
    B --> W{"Tasks left whose<br/>dependencies are merged?"}
    W -- yes --> S["Start child sessions for the next wave<br/>(never more than 2 running,<br/>only one using the app on localhost:3000)"]
    S --> T["Child session: branch from develop →<br/>code + tests → lint, types, tests →<br/>Playwright evidence → PR → code-reviewer →<br/>fix → update from develop → merge → verify"]
    T --> R{"Result"}
    R -- merged --> N["Copy its notes into the notes file"]
    R -- "blocked / needs discussion" --> K["Mark it in the notes,<br/>skip its dependents"]
    N --> W
    K --> W
    W -- no --> E["Checks on develop,<br/>notes PR merged,<br/>report to the user"]
    E --> D(["User and Claude go through the notes:<br/>fixes and improvements"])
```
