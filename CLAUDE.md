# Project guidance for Claude

## Active workstream

**Phase 4 is active.** Phase 3 is complete (all 9 tasks done). Phase 2 and the MVP (Phase 0–4) are also complete — see `docs/phase3-plan.md` / `docs/phase3-progress.md`, `docs/phase2-plan.md` / `docs/phase2-progress.md`, and `docs/build-plan.md` / `docs/progress.md` for historical context.

Phase 4's theme is the **distributor's field workflow**: customer intake, visit/promise tracking, and mobile-responsive UX. Two source-of-truth files drive Phase 4 execution:

- `docs/phase4-plan.md` — 8 tasks across 3 mini-phases (J–L). Each task has Goal, Files, Acceptance, Depends-on.
- `docs/phase4-progress.md` — checklist + decisions log.

When a new workstream starts, add its plan + progress files here and update this section.

## Picking the next task

1. Open `docs/phase4-progress.md`. Find the first `[ ]` whose dependencies are all `[x]`.
2. Read the matching task section in `docs/phase4-plan.md` (Goal, Files, Acceptance, Depends-on).
3. Read the **Critical conventions** section at the top of `phase4-plan.md` before touching code. Distributor scoping is the single source of truth — every new read/write touching `customers`, `receivables`, `payments`, `payment_schedules`, `auditEvents`, or `visits` must apply `scopeToDistributor` (or its join-filter equivalent). Money is INTEGER cents (including `promisedAmountCents`). Hono routes chained. Leaflet client-only. All web↔API via Hono RPC + TanStack Query. Void operations are transactional. Audit writes go inside the same transaction as the primary operation. Visits are insert-only — corrections happen via follow-up visits, not edits.
4. If the task is part of a future workstream not yet documented, stop and ask before implementing.

## During work

- Flip the task to `[~]` in `phase4-progress.md` when starting.
- Touch only the files listed for the task. Out-of-scope changes go in a separate task.
- If you deviate from the plan or hit a blocker, add a line to the **Notes / Decisions Log** in `phase4-progress.md` (`YYYY-MM-DD — task — note`).

## Finishing

1. Run the task's **Acceptance** checks.
2. **Run `bun run --filter '*' typecheck` from repo root. Must be green. Fix any TS errors before moving on.**
3. If schema changed: `bun run --filter db db:push` then `bun run --filter db db:seed`.
4. For UI-touching tasks: verify on both desktop (≥1024px) and a 375px mobile viewport (Chrome DevTools device mode). Phase 4 is mobile-responsive — regressions at small viewports count as bugs.
5. Flip the task to `[x]` in `phase4-progress.md`.

## Quality checks after code work

After any code changes (prompts, edits, new files):

1. Run `bun run --filter '*' typecheck` — fix all TS errors immediately.
2. Run linting if configured (check `package.json` scripts). Fix lint errors.
3. Verify no regressions by running the affected apps locally (`bun run --filter api dev`, `bun run --filter web dev`).

If errors surface, fix them inline before reporting the work done.

## Scope guardrails

- Do not implement features outside the current task.
- Do not build anything in the "Out of scope for Phase 4" section of `phase4-plan.md` — that list deliberately defers file uploads, offline/PWA, native mobile, SMS push, inventory, accounting integration, customer transfer, and more.
- Full domain spec lives in `docs/mvp.md` (full reference) and `docs/mvp-smaller.md` (smaller demo scope). Refer to them for business rules, not for task ordering.

## Repo layout (quick reference)

- `apps/api` — Hono + Drizzle backend. Routes per resource, chained for RPC inference.
- `apps/web` — TanStack Start + Shadcn frontend. Auth-gated under `_authed` layout.
- `packages/db` — Drizzle schema + seed (`bun run --filter db db:push`, `db:seed`).
- `packages/schema` — Zod schemas shared between API and web.
- `packages/oxlint-config` — shared lint config.

A high-level README for setup + dev workflow lives at `README.md`.
