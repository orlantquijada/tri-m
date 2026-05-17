# Task runner prompt

Reusable prompt for kicking off a task-by-task implementation session. Paste verbatim into a fresh Claude session.

The prompt deliberately points at `CLAUDE.md` for the active workstream's plan + progress files instead of hard-coding `docs/build-plan.md` / `docs/progress.md`. That way the same prompt keeps working as the project moves through Phase 2, Phase 3, etc. — just update `CLAUDE.md` when a new workstream becomes active.

## Prompt (copy from below)

```
Read CLAUDE.md first — it explains the workflow and names the active workstream's plan + progress files.

Then:

1. Open the progress file named in CLAUDE.md (currently docs/phase2-progress.md). Find the first task marked [ ] whose dependencies are all [x].
2. Read that task's full section in the plan file named in CLAUDE.md (currently docs/phase2-plan.md): Goal, Files, Acceptance, Depends-on.
3. Read the Critical Conventions section at the top of the plan file before writing any code.
4. Implement the task. Touch only the files listed.
5. Run the Acceptance checks. Run `bun run --filter '*' typecheck` from repo root.
6. If schema changed, run `bun run --filter db db:push && bun run --filter db db:seed`.
7. Mark the task [x] in the progress file. If you hit a blocker, mark [!] and log it in the Notes / Decisions Log section (format: YYYY-MM-DD — task — note).
```

## What changed vs. the original MVP prompt

- File references moved from `docs/build-plan.md` / `docs/progress.md` to "the files named in CLAUDE.md", with the current Phase 2 names as a parenthetical hint. Prompt stays correct across future phases without edits.
- Step 7 spells out the blocker-log format (`YYYY-MM-DD — task — note`) to match the convention used in `docs/progress.md` and `docs/phase2-progress.md`.

## When to update this file

- New workstream starts (Phase 3, etc.) → update the parenthetical hints in the prompt to point at the new plan/progress filenames. The logic stays the same.
- `CLAUDE.md` workflow rules change (e.g. new mandatory check between steps) → mirror the change here.

## Related files

- `CLAUDE.md` — declares the active workstream and its plan/progress files.
- `docs/phase2-plan.md` — current active plan.
- `docs/phase2-progress.md` — current active progress tracker.
- `docs/build-plan.md`, `docs/progress.md` — MVP (Phase 0–4), historical reference.

```

```
