# Project guidance for Claude

## Active workstream

**Phase 3 is active.** Phase 2 is complete (all 9 tasks done). MVP (Phase 0–4) is also complete — see `docs/build-plan.md` and `docs/progress.md` for historical context.

Two source-of-truth files drive Phase 3 execution:

- `docs/phase3-plan.md` — 9 tasks across 4 mini-phases (F–I). Each task has Goal, Files, Acceptance, Depends-on.
- `docs/phase3-progress.md` — checklist + decisions log.

When a new workstream starts, add its plan + progress files here and update this section.

## Picking the next task

1. Open `docs/phase3-progress.md`. Find the first `[ ]` whose dependencies are all `[x]`.
2. Read the matching task section in `docs/phase3-plan.md` (Goal, Files, Acceptance, Depends-on).
3. Read the **Critical conventions** section at the top of `phase3-plan.md` before touching code. Distributor scoping is the single source of truth — every new read/write touching `customers`, `receivables`, `payments`, `payment_schedules`, or `auditEvents` must apply `scopeToDistributor` (or its join-filter equivalent). Money is INTEGER cents. Hono routes chained. Leaflet client-only. All web↔API via Hono RPC + TanStack Query. Void operations are transactional. Audit writes go inside the same transaction as the primary operation.
4. If the task is part of a future workstream not yet documented, stop and ask before implementing.

## During work

- Flip the task to `[~]` in `phase3-progress.md` when starting.
- Touch only the files listed for the task. Out-of-scope changes go in a separate task.
- If you deviate from the plan or hit a blocker, add a line to the **Notes / Decisions Log** in `phase3-progress.md` (`YYYY-MM-DD — task — note`).

## Finishing

1. Run the task's **Acceptance** checks.
2. **Run `bun run --filter '*' typecheck` from repo root. Must be green. Fix any TS errors before moving on.**
3. If schema changed: `bun run --filter db db:push` then `bun run --filter db db:seed`.
4. Flip the task to `[x]` in `phase3-progress.md`.

## Quality checks after code work

After any code changes (prompts, edits, new files):

1. Run `bun run --filter '*' typecheck` — fix all TS errors immediately.
2. Run linting if configured (check `package.json` scripts). Fix lint errors.
3. Verify no regressions by running the affected apps locally (`bun run --filter api dev`, `bun run --filter web dev`).

If errors surface, fix them inline before reporting the work done.

## Scope guardrails

- Do not implement features outside the current task.
- Do not build anything in the "Out of scope for Phase 3" section of `phase3-plan.md` — that list deliberately defers offline mode, inventory, accounting integration, mobile app, SMS, and more.
- Full domain spec lives in `docs/mvp-smaller.md`. Refer to it for business rules, not for task ordering.

## Repo layout (quick reference)

- `apps/api` — Hono + Drizzle backend. Routes per resource, chained for RPC inference.
- `apps/web` — TanStack Start + Shadcn frontend. Auth-gated under `_authed` layout.
- `packages/db` — Drizzle schema + seed (`bun run --filter db db:push`, `db:seed`).
- `packages/schema` — Zod schemas shared between API and web.
- `packages/oxlint-config` — shared lint config.

A high-level README for setup + dev workflow lives at `README.md`.
