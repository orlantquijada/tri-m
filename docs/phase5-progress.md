# Phase 5 Build Progress

Full task details in `docs/phase5-plan.md`. Phase 4 context in `docs/phase4-plan.md` + `docs/phase4-progress.md`.

**Status legend**: `[ ]` todo · `[~]` in progress · `[x]` done · `[!]` blocked

---

## Phase M — Reporting foundations

- [ ] **M1** — Aging report (buckets + table + bar chart + CSV). Depends on: Phase 4 complete.
- [ ] **M2** — Collection trend (date-range + line chart + KPI strip). Depends on: M1.
- [ ] **M3** — Payment-method breakdown + date range on Distributor Performance. Depends on: M2.

## Phase N — Commission tracking

- [ ] **N1** — Commission rates schema + admin rate management (effective-dated rows). Depends on: Phase 4 complete.
- [ ] **N2** — Commission ledger (computed view + distributor self-service + CSV). Depends on: N1.
- [ ] **N3** — Commission payouts (snapshots + history + reversal handling). Depends on: N2.

## Phase O — Exports & printable reports

- [ ] **O1** — Expand CSV exports (payments / receivables / visits). Depends on: Phase 4 complete.
- [ ] **O2** — Printable report layout (print stylesheet + landing route). Depends on: M3.
- [ ] **O3** — Payment receipt voucher (per-payment printable). Depends on: O2.

---

## Notes / Decisions Log

(Add entries here when blocking or deviating from the plan. Format: `YYYY-MM-DD — task — note`.)

- 2026-05-23 — plan — Phase 5 plan written. 9 tasks across 3 mini-phases (M–O). Theme: Reports + commissions. Locked: aging buckets are fixed (0–30, 31–60, 61–90, 90+), date-range filters use `paymentDate` (not receivable creation), commission model is percent-of-collected, rates are effective-dated in basis points (no retroactive recalc), default rate is 0, payouts are immutable snapshots (reversals via next payout), chart lib is recharts (already in deps), PDF = print stylesheet (no PDF lib), reports default to admin-only with distributor-scoped views for own collection trend + own commission ledger. New audit events: `commission_rate.updated`, `commission_payout.issued`. New tables in N1 (commission_rates) and N3 (commission_payouts + commission_payout_lines). M-tasks add no tables. Existing reporting infra (`/reports/distributor-performance`, `/exports/overdue.csv`, `/exports/customers.csv`) is extended, not replaced.
