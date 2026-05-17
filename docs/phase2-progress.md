# Phase 2 Build Progress

Full task details in `docs/phase2-plan.md`. MVP context in `docs/build-plan.md` + `docs/progress.md`.

**Status legend**: `[ ]` todo · `[~]` in progress · `[x]` done · `[!]` blocked

---

## Phase A — Distributor Hardening

- [x] **A1** — Strict distributor 403s on every existing route + smoke test as `dist@demo.local`

## Phase B — Distributor Management UI

- [x] **B1** — Distributor list (`/distributors`) with aggregates (admin only)
- [x] **B2** — Add/Edit distributor form + API
- [x] **B3** — Distributor user assignment (create + reassign auth users)

## Phase C — Data Quality

- [ ] **C1** — Duplicate customer phone warning (`GET /api/customers/lookup`)

## Phase D — Schedules + Aging

- [ ] **D1** — `payment_schedules` table + generation on receivable create
- [ ] **D2** — Per-installment overdue + schedule table on receivable detail
- [ ] **D3** — Aging buckets (0–30, 31–60, 61–90, 90+) on overdue + dashboard

## Phase E — Exports

- [ ] **E1** — CSV export for overdue + customers (scoped per role)

---

## Notes / Decisions Log

(Add entries here when blocking or deviating from the plan. Format: `YYYY-MM-DD — task — note`.)

- 2026-05-17 — plan — Phase 2 plan written. 9 tasks across 5 phases (A–E). Order: distributor hardening → distributor CRUD → user assignment → dupe phone → schedules → aging → CSV. Locked: schedules stored in new table, distributor users created server-side via `auth.api.signUpEmail`, CSV streamed server-side as `text/csv`.
- 2026-05-17 — B1 — Plan listed `dashboard.tsx` for the Distributors nav link, but nav lives in `app-sidebar.tsx`. Modified `app-sidebar.tsx` instead; `dashboard.tsx` untouched. Used kebab-case filename `distributor-list.tsx` per project convention (plan said `DistributorList.tsx`).
- 2026-05-17 — B2 — Plan said `DistributorForm.tsx`; used `distributor-form.tsx` (kebab-case convention). Plan said react-hook-form; used `@tanstack/react-form` to match project pattern. Also extended `services/distributors.ts` and `queries.ts` (implicit deps not listed). Used `buttonVariants()` + Link instead of Button+asChild (Button in this project has no asChild prop). Added Edit links to `distributor-list.tsx` and New button to `distributors/index.tsx` for navigation.
- 2026-05-17 — B3 — Plan said `AssignDistributorDialog.tsx`; used `assign-distributor-dialog.tsx` (kebab-case). Plan listed `apps/api/src/routes/users.ts` and `apps/api/src/index.ts` as files; also created `apps/web/src/features/users/queries.ts` (implicit). Zod schemas defined inline in route (not in packages/schema) since they're API-internal. Save button disabled when empty distributor selected to prevent sending undefined distributorId.
