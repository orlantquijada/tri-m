# Phase 2 Build Progress

Full task details in `docs/phase2-plan.md`. MVP context in `docs/build-plan.md` + `docs/progress.md`.

**Status legend**: `[ ]` todo · `[~]` in progress · `[x]` done · `[!]` blocked

---

## Phase A — Distributor Hardening

- [ ] **A1** — Strict distributor 403s on every existing route + smoke test as `dist@demo.local`

## Phase B — Distributor Management UI

- [ ] **B1** — Distributor list (`/distributors`) with aggregates (admin only)
- [ ] **B2** — Add/Edit distributor form + API
- [ ] **B3** — Distributor user assignment (create + reassign auth users)

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
