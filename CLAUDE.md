# Project guidance for Claude

## Active workstream

**Phase 5 is active.** Phase 4 is complete (all 8 tasks done). Phases 2–4 and the MVP are also complete — see `docs/phase4-plan.md` / `docs/phase4-progress.md`, `docs/phase3-plan.md` / `docs/phase3-progress.md`, `docs/phase2-plan.md` / `docs/phase2-progress.md`, and `docs/build-plan.md` / `docs/progress.md` for historical context.

Phase 5's theme is **Reports & Commissions**: turning the data the app already captures into actionable summaries (aging, collection trend, payment-method breakdown) and adding a first-class commission tracking system. Two source-of-truth files drive Phase 5 execution:

- `docs/phase5-plan.md` — 9 tasks across 3 mini-phases (M–O). Each task has Goal, Files, Acceptance, Depends-on.
- `docs/phase5-progress.md` — checklist + decisions log.

When a new workstream starts, add its plan + progress files here and update this section.

## Picking the next task

1. Open `docs/phase5-progress.md`. Find the first `[ ]` whose dependencies are all `[x]`.
2. Read the matching task section in `docs/phase5-plan.md` (Goal, Files, Acceptance, Depends-on).
3. Read the **Critical conventions** section at the top of `phase5-plan.md` before touching code. Distributor scoping is the single source of truth — every new read/write touching `customers`, `receivables`, `payments`, `payment_schedules`, `auditEvents`, `visits`, `commission_rates`, or `commission_payouts` must apply the `Scope` helper. Money is INTEGER cents (including `commissionCents` and `ratePctBps` basis points). Hono routes chained. Aging math lives in one service. Commission lines are derived until payout, then frozen as snapshots. Voided-after-payout produces reversal lines in the next payout, never edits the past. Audit writes go inside the same transaction as the primary operation. Charts wrap recharts via a colocated `<Chart>` component. PDF = print stylesheet (no PDF library in Phase 5).
4. If the task is part of a future workstream not yet documented, stop and ask before implementing.

## During work

- Flip the task to `[~]` in `phase5-progress.md` when starting.
- Touch only the files listed for the task. Out-of-scope changes go in a separate task.
- If you deviate from the plan or hit a blocker, add a line to the **Notes / Decisions Log** in `phase5-progress.md` (`YYYY-MM-DD — task — note`).

## Finishing

1. Run the task's **Acceptance** checks.
2. **Run `bun run --filter '*' typecheck` from repo root. Must be green. Fix any TS errors before moving on.**
3. If schema changed: `bun run --filter db db:push` then `bun run --filter db db:seed`.
4. For UI-touching tasks: verify on both desktop (≥1024px) and a 375px mobile viewport (Chrome DevTools device mode). Phase 5 stays mobile-responsive — regressions at small viewports count as bugs.
5. For print-friendly pages (O2, O3): verify Chrome print preview (Cmd+P) fits Letter and A4 without clipping.
6. Flip the task to `[x]` in `phase5-progress.md`.

## Quality checks after code work

After any code changes (prompts, edits, new files):

1. Run `bun run --filter '*' typecheck` — fix all TS errors immediately.
2. Run linting if configured (check `package.json` scripts). Fix lint errors.
3. Verify no regressions by running the affected apps locally (`bun run --filter api dev`, `bun run --filter web dev`).

If errors surface, fix them inline before reporting the work done.

## Scope guardrails

- Do not implement features outside the current task.
- Do not build anything in the "Out of scope for Phase 5" section of `phase5-plan.md` — that list defers file uploads, offline/PWA, native mobile, SMS push, inventory, accounting integration, customer transfer, real PDF generation, and more.
- Full domain spec lives in `docs/mvp.md` (full reference) and `docs/mvp-smaller.md` (smaller demo scope). Refer to them for business rules, not for task ordering.

## Repo layout (quick reference)

- `apps/api` — Hono + Drizzle backend. Routes per resource, chained for RPC inference.
- `apps/web` — TanStack Start + Shadcn frontend. Auth-gated under `_authed` layout.
- `packages/db` — Drizzle schema + seed (`bun run --filter db db:push`, `db:seed`).
- `packages/schema` — Zod schemas shared between API and web.
- `packages/oxlint-config` — shared lint config.

A high-level README for setup + dev workflow lives at `README.md`.
