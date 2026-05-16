# Project guidance for Claude

## MVP build workflow

Two source-of-truth files drive MVP execution:

- `docs/build-plan.md` — 16 tasks across 4 phases. Each task has Goal, Files, Acceptance, Depends-on.
- `docs/progress.md` — checklist + decisions log.

### Picking the next task

1. Open `docs/progress.md`. Find the first `[ ]` whose dependencies are all `[x]`.
2. Read the matching task section in `docs/build-plan.md` (Goal, Files, Acceptance, Depends-on).
3. Read the **Critical conventions** section at the top of `build-plan.md` before touching code. Money = INTEGER cents, Hono routes must be chained, Leaflet client-only, all web↔API via Hono RPC + TanStack Query, etc.

### During work

- Flip the task to `[~]` in `progress.md` when starting.
- Touch only the files listed for the task. Out-of-scope changes go in a separate task.
- If you deviate from the plan or hit a blocker, add a line to the **Notes / Decisions Log** in `progress.md` (`YYYY-MM-DD — task — note`).

### Finishing

1. Run the task's **Acceptance** checks.
2. **Run `bun run --filter '*' typecheck` from repo root. Must be green. Fix any TS errors before moving on.**
3. If schema changed: `bun run --filter db db:push` then `bun run --filter db db:seed`.
4. Flip the task to `[x]` in `progress.md`.

### Quality checks after code work

After any code changes (prompts, edits, new files):

1. Run `bun run --filter '*' typecheck` — fix all TS errors immediately.
2. Run linting if configured (check `package.json` scripts). Fix lint errors.
3. Verify no regressions by running the affected apps locally (`bun run --filter api dev`, `bun run --filter web dev`).

If errors surface, fix them inline before reporting the work done.

### Scope guardrails

- Do not implement features outside the current task.
- Do not build anything in the "Out of scope" section of `build-plan.md`.
- Full spec context lives in `docs/mvp-smaller.md`. Refer to it for business rules, not for task ordering.
