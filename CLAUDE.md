# Project guidance for Claude

## Active workstream

**Phase 2 is active.** MVP (Phase 0–4) is complete — see `docs/build-plan.md` and `docs/progress.md` for historical context.

Two source-of-truth files drive Phase 2 execution:

- `docs/phase2-plan.md` — 9 tasks across 5 mini-phases (A–E). Each task has Goal, Files, Acceptance, Depends-on.
- `docs/phase2-progress.md` — checklist + decisions log.

When a new workstream starts, add its plan + progress files here and update this section.

## Picking the next task

1. Open `docs/phase2-progress.md`. Find the first `[ ]` whose dependencies are all `[x]`.
2. Read the matching task section in `docs/phase2-plan.md` (Goal, Files, Acceptance, Depends-on).
3. Read the **Critical conventions** section at the top of `phase2-plan.md` before touching code. Distributor scoping is now the single source of truth — every new read/write that touches `customers`, `receivables`, `payments`, or `payment_schedules` must apply `scopeToDistributor` (or its join-filter equivalent). Money is still INTEGER cents. Hono routes still chained. Leaflet still client-only. All web↔API via Hono RPC + TanStack Query.
4. If the task is part of a future workstream not yet documented, stop and ask before implementing.

## During work

- Flip the task to `[~]` in `phase2-progress.md` when starting.
- Touch only the files listed for the task. Out-of-scope changes go in a separate task.
- If you deviate from the plan or hit a blocker, add a line to the **Notes / Decisions Log** in `phase2-progress.md` (`YYYY-MM-DD — task — note`).

## Finishing

1. Run the task's **Acceptance** checks.
2. **Run `bun run --filter '*' typecheck` from repo root. Must be green. Fix any TS errors before moving on.**
3. If schema changed: `bun run --filter db db:push` then `bun run --filter db db:seed`.
4. Flip the task to `[x]` in `phase2-progress.md`.

## Quality checks after code work

After any code changes (prompts, edits, new files):

1. Run `bun run --filter '*' typecheck` — fix all TS errors immediately.
2. Run linting if configured (check `package.json` scripts). Fix lint errors.
3. Verify no regressions by running the affected apps locally (`bun run --filter api dev`, `bun run --filter web dev`).

If errors surface, fix them inline before reporting the work done.

## Scope guardrails

- Do not implement features outside the current task.
- Do not build anything in the "Out of scope for Phase 2" section of `phase2-plan.md` — that list deliberately defers payment void, audit logs, blacklist approval workflow, route planning, offline mode, and more.
- Full domain spec lives in `docs/mvp-smaller.md`. Refer to it for business rules, not for task ordering.

## Repo layout (quick reference)

- `apps/api` — Hono + Drizzle backend. Routes per resource, chained for RPC inference.
- `apps/web` — TanStack Start + Shadcn frontend. Auth-gated under `_authed` layout.
- `packages/db` — Drizzle schema + seed (`bun run --filter db db:push`, `db:seed`).
- `packages/schema` — Zod schemas shared between API and web.
- `packages/oxlint-config` — shared lint config.

A high-level README for setup + dev workflow lives at `README.md`.
