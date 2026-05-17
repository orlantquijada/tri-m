# Phase 3 Build Progress

Full task details in `docs/phase3-plan.md`. Phase 2 context in `docs/phase2-plan.md` + `docs/phase2-progress.md`.

**Status legend**: `[ ]` todo · `[~]` in progress · `[x]` done · `[!]` blocked

---

## Phase F — Operational Corrections

- [x] **F1** — Payment void/correction (admin voids payment, schedule recalculated from remaining payments)
- [ ] **F2** — Blacklist approval workflow (distributor requests, admin approves/rejects, atomically sets riskStatus)

## Phase G — Access Management

- [ ] **G1** — Admin-triggered password reset for distributor users (no email/SMTP)
- [ ] **G2** — User management page (admin sees all users, resets passwords, navigates to distributor)

## Phase H — Map Enhancements

- [ ] **H1** — Map filters (risk status, overdue-only toggle) + Leaflet marker clustering
- [ ] **H2** — Collection route view (ephemeral ordered stop list + numbered markers + CSV export)

## Phase I — Audit & Reporting

- [ ] **I1** — Audit log infrastructure + UI (auditEvents table, logEvent service, admin page)
- [ ] **I2** — Wire audit events into routes (payments, customers, blacklist, users)
- [ ] **I3** — Distributor performance report (per-distributor aggregates, date-range filter)

---

## Notes / Decisions Log

(Add entries here when blocking or deviating from the plan. Format: `YYYY-MM-DD — task — note`.)

- 2026-05-17 — plan — Phase 3 plan written. 9 tasks across 4 mini-phases (F–I). Order: payment void → blacklist approval → password reset → user management → map filters → collection route → audit infra → audit wiring → performance report. Locked: void is transactional with schedule recalculation replay; blacklist is a state machine; audit is append-only; route planning is client-side ephemeral; password reset is admin-triggered only.
