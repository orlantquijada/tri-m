# Furniture Receivables & Collections — Phase 6 Build Plan (parked)

> **Parked 2026-05-24.** This plan was originally written as Phase 5 (Reports & Commissions) on 2026-05-23. Priority shifted: Phase 5 is now an **Inventory system** (see `docs/phase5-plan.md`). Reports & Commissions moves to Phase 6 and is parked here, untouched, ready to pick up after Phase 5 ships. All references below to "Phase 5" reflect the original framing — read them as "Phase 6" when resuming. The original progress tracker now lives at `docs/phase6-progress.md`.

## Context

Phase 4 is complete. All 8 tasks (J1–L3) are done. Phase 4 turned the app from "admin-friendly" into "distributor-friendly" with customer intake, visit/promise tracking, and a mobile-responsive layout.

Phase 5's theme is **Reports & Commissions**: turning the data the app already captures into actionable summaries (aging, collection trend, payment-method breakdown) and adding a first-class commission tracking system so distributors can see what they've earned and admins can issue payouts.

Phase 5 is 9 tasks across 3 mini-phases (M–O).

The starting state already includes a thin reporting layer: `apps/api/src/routes/reports.ts` exposes `GET /reports/distributor-performance`, and `apps/api/src/routes/exports.ts` exposes `GET /exports/overdue.csv` and `GET /exports/customers.csv`. Phase 5 extends this layer rather than replacing it.

Feature candidates are drawn from the "Out of scope for Phase 4" list, the unbuilt MVP items in `docs/mvp.md` lines 855–869 (CSV export, simple aging buckets, full reports), and the "Phase 5 / later phases" list in `docs/mvp.md` lines 998–1007 (better overdue/aging logic, CSV exports, advanced reports).

Same ground rules as all prior phases: pick the first `[ ]` task whose dependencies are all `[x]`, touch only the listed files, log decisions in `docs/phase5-progress.md`.

## Locked decisions (carried over)

- **Auth**: `better-auth` (Hono + Drizzle SQLite adapter). Session cookies.
- **API client**: Hono RPC (`hc<AppType>`) wrapped in TanStack Query.
- **Map**: Leaflet + OpenStreetMap (client-only).
- **Money**: stored as **INTEGER cents** in SQLite. UI divides by 100 for display, multiplies by 100 on submit. Commission amounts follow the same rule.
- **Roles**: `admin`, `distributor`. Distributor scope enforced by `Scope.forUser(user)` helper.
- **Schedules**: `payment_schedules` table, one row per installment. Allocation: oldest unpaid rows first.
- **Voided payments**: `voidedAt` + `voidReason` columns. Void triggers schedule recalculation.
- **Audit log**: append-only `auditEvents` table. Writes share the transaction with the primary op.
- **Blacklist workflow**: `pending → approved | rejected` state machine. Admin reviews queue.
- **Visits**: insert-only. Promise resolution is the one exception (`PATCH /:id/resolve-promise`).
- **Mobile-responsive only.** Phase 5 reports must work on a 375px viewport. No PWA, no offline.

## New locked decisions (Phase 5)

- **Aging buckets are fixed**: `0–30`, `31–60`, `61–90`, `90+` days past due. Computed against the receivable's `firstDueDate` when no schedule rows exist, otherwise the oldest pending/partial schedule row's `dueDate`. Same logic as the existing overdue list (`apps/api/src/services/overdue.ts`) — reuse, don't fork.
- **Date-range filters use payment date, not receivable creation date.** A "collected in May" report sums payments where `paymentDate` falls in May regardless of when the receivable was opened. Voided payments are excluded.
- **Commission model is percent-of-collected.** A distributor earns `commissionRatePct × paymentAmountCents` on every non-voided payment for one of their customers' receivables. Refunds (voided payments) reverse the commission via a negative line. No commission on overdue interest (none exists in MVP), promised amounts, or unpaid balances.
- **Commission rates are effective-dated per distributor.** Rows in a `commission_rates` table carry `effectiveFrom` (date) and `effectiveTo` (nullable). A payment is matched to the rate whose range covers `paymentDate`. Rate changes are not retroactive — already-paid payments keep their original rate.
- **Default commission rate is `0` until an admin sets one.** Distributors with no rate row earn no commission. The system never invents a rate.
- **Commission payouts are snapshots, not live queries.** When an admin marks a period paid, a `commission_payouts` row is written with the period range, distributor, total cents, payment-method-style metadata, and a `paidAt` timestamp. The snapshot includes the per-payment line items (denormalized JSON column or child rows — decide in N3). Once paid, the snapshot is immutable; voiding a covered payment afterwards creates a reversal line in the **next** payout, not an edit on the old one.
- **Charting library is `recharts` 3.8.0** (already in `apps/web` deps). All charts go through a thin `<Chart>` wrapper colocated with the report so swapping later is cheap.
- **PDF = print stylesheet, not a PDF library.** Printable reports use a `@media print` CSS layer plus a "Print" button that calls `window.print()`. Skip `react-pdf` / `pdfkit` for Phase 5 — the print path covers the demo, and a real PDF generator can come later without breaking the UI.
- **Reports default to admin-only.** Where a distributor-scoped view is meaningful (own collection trend, own commission ledger), expose it under a separate route restricted to that distributor's data via the existing `Scope` helper. Cross-distributor reports remain admin-only.
- **No new currency support.** Single currency assumed across the app (Phase 4 decision).

## Critical conventions (read before any task)

1. **Money stays INTEGER cents.** Including `commissionCents`, `commissionRatePctBps` (basis points — 250 = 2.50%), payout totals, and any per-bucket aging sum.
2. **Hono routes remain chained** (`app.get(...).post(...).route(...)`). Every new subapp must export a chained const.
3. **Distributor scoping is the single source of truth.** Every new read/write touching `customers`, `receivables`, `payments`, `payment_schedules`, `auditEvents`, `visits`, `commission_rates`, or `commission_payouts` MUST apply the `Scope` helper (`assertAdmin`, `assertCanRead`, `assertCanWrite`, `filterQuery`). Cross-distributor reads return empty; cross-distributor writes return `403`.
4. **Aging-bucket math lives in one service.** `apps/api/src/services/aging.ts` (new in M1) is the only place that computes bucket boundaries. Routes that need aging numbers call this service — they do not re-implement the SQL.
5. **Commission lines are derived, not stored, until payout.** Until an admin issues a payout, the per-payment commission amount is computed on demand by joining `payments` to `commission_rates`. Once a payout snapshot is written, the lines are frozen in the snapshot.
6. **Voided payments produce reversal lines in the next open period.** A void of a payment that was already paid out generates a negative-amount line in the next payout's snapshot — never edits the previous payout.
7. **Audit writes for commission-rate changes and payout issuance share the transaction with the primary op** (existing `auditEvents` pattern). New audit event types: `commission_rate.updated`, `commission_payout.issued`.
8. **Kebab-case filenames** for all new web files.
9. **Schema changes go through `drizzle-kit push` + seed re-run.** N1 adds two tables (`commission_rates`, `commission_payouts`). M-tasks add no tables.
10. **CSV exports cap at 10 000 rows** (existing pattern in `apps/api/src/routes/exports.ts`). Sort deterministically (usually by id) so pagination across exports is predictable.
11. **Charts wrap recharts in a colocated `<Chart>` component.** Do not import recharts directly in route files — keep the API surface narrow so we can swap libs later.

## Target file layout (deltas vs. Phase 4)

```
packages/db/src/schema/
  domain.ts                # extend: commissionRates, commissionPayouts (N1)

packages/schema/src/
  report.ts                # extend: agingBucketRowSchema, collectionTrendPointSchema, paymentMethodBreakdownRowSchema
  commission.ts            # NEW: commissionRateSchema, commissionLineSchema, commissionPayoutSchema
  csv.ts                   # extend: PAYMENTS_CSV_COLUMNS, RECEIVABLES_CSV_COLUMNS, VISITS_CSV_COLUMNS

apps/api/src/
  routes/
    reports.ts             # extend: /aging, /collection-trend, /payment-method-breakdown
    exports.ts             # extend: /payments.csv, /receivables.csv, /visits.csv, /commission-ledger.csv
    commissions.ts         # NEW: /rates (GET, PUT), /ledger (GET), /payouts (GET, POST, GET /:id)
  services/
    aging.ts               # NEW: buildAgingBuckets(scope, { distributorId? })
    collection-trend.ts    # NEW: buildCollectionTrend(scope, { from, to, granularity })
    payment-method-breakdown.ts  # NEW: paymentMethodBreakdown(scope, { from, to })
    commissions.ts         # NEW: rate CRUD, computeLedger, issuePayout, listPayouts
  index.ts                 # mount commissions route

apps/web/src/
  features/
    reports/
      aging-report.tsx               # NEW: table + bar chart of bucket totals
      collection-trend.tsx           # NEW: line chart of collected-per-period
      payment-method-breakdown.tsx   # NEW: donut + table
      report-date-range.tsx          # NEW: shared from/to picker
      chart.tsx                      # NEW: recharts wrapper
      printable-report.tsx           # NEW: print-friendly layout shell (O2)
      queries.ts                     # extend: useAgingQuery, useCollectionTrendQuery, usePaymentMethodBreakdownQuery
    commissions/
      commission-rates-table.tsx     # NEW: admin set/update rate per distributor
      commission-ledger.tsx          # NEW: per-payment line list with running total
      commission-payouts-table.tsx   # NEW: history of issued payouts
      issue-payout-dialog.tsx        # NEW: admin period selector + preview + confirm
      my-earnings.tsx                # NEW: distributor-scoped ledger + payout history
      queries.ts                     # NEW: all commission queries + mutations
    exports/
      export-buttons.tsx             # extend: add Payments / Receivables / Visits / Commission ledger buttons
  routes/_authed/
    reports/
      index.tsx                      # extend: tabs for Distributor Performance | Aging | Collection Trend | Payment Methods
      print.tsx                      # NEW: parameterised print view (?report=…&from=…&to=…)
    commissions/
      index.tsx                      # NEW: admin landing (rates + recent payouts)
      ledger.tsx                     # NEW: admin ledger with distributor filter
      payouts/index.tsx              # NEW: admin payouts history
      payouts/$id.tsx                # NEW: payout snapshot detail
      my.tsx                         # NEW: distributor "My earnings" page
  components/
    app-sidebar.tsx                  # extend: "Reports" group adds Aging / Trends / Methods; admin "Commissions"; distributor "My earnings"
```

---

## PHASE M — Reporting foundations (3 tasks)

### Task M1 — Aging report (buckets + table + chart + CSV)

**Goal**: Admins (and distributors for their own customers) can see outstanding receivables split into four aging buckets: `0–30`, `31–60`, `61–90`, `90+` days past due. Each row of the table shows the bucket label, count of receivables, total outstanding cents, and percentage of grand total. A small bar chart above the table visualises the distribution. CSV download exports one row per bucket.

**Files**:

- `apps/api/src/services/aging.ts` (new) — `buildAgingBuckets(scope, { distributorId? })`. Returns `{ buckets: AgingBucketRow[], generatedAt }`. Bucket boundaries: `[0, 30]`, `[31, 60]`, `[61, 90]`, `[91, Infinity]`. "Days overdue" derives from the same logic as `apps/api/src/services/overdue.ts` — extract a shared `daysOverdueExpr()` helper if duplication appears.
- `apps/api/src/routes/reports.ts` — add `GET /aging` (admin sees all; distributor scoped to own). Optional query param `distributorId` (admin only) to filter to a single distributor.
- `apps/api/src/routes/exports.ts` — add `GET /aging.csv`. Same rows the report shows, columns `bucket,count,total_cents,percent_of_total`.
- `packages/schema/src/report.ts` — add `agingBucketRowSchema` (label, lowerDays, upperDays, count, totalCents, percentOfTotal).
- `packages/schema/src/csv.ts` — add `AGING_CSV_COLUMNS`.
- `apps/web/src/features/reports/chart.tsx` (new) — thin recharts wrapper exporting `<BarChart>`, `<LineChart>`, `<DonutChart>` components used by the rest of Phase 5.
- `apps/web/src/features/reports/aging-report.tsx` (new) — table + bar chart. Distributor selector (admin only). Shows `generatedAt` timestamp.
- `apps/web/src/features/reports/queries.ts` (new) — `useAgingQuery({ distributorId? })`.
- `apps/web/src/routes/_authed/reports/index.tsx` — switch to a tabs layout. Tabs: `Distributor Performance` (existing), `Aging` (new). More tabs come in M2/M3.
- `apps/web/src/features/exports/export-buttons.tsx` — add an "Aging" button that downloads `/exports/aging.csv`.

**Acceptance**:

- Admin sees four bucket rows summing to 100% of `total_cents`.
- Distributor sees only their own customers' aging.
- Empty bucket renders as a row with `0` count and `0` total (not omitted).
- Bar chart heights match table values.
- CSV downloads with correct `Content-Disposition` header.
- Mobile (375px): chart and table stack vertically, no horizontal scroll.
- `bun run --filter '*' typecheck` green.

**Depends on**: Phase 4 complete.

---

### Task M2 — Collection trend (date-range + line chart)

**Goal**: Stakeholders see how much was collected over time. The trend report sums non-voided payments by day, week, or month between two dates and renders a line chart with totals + count. Default range: trailing 30 days, daily granularity.

**Files**:

- `apps/api/src/services/collection-trend.ts` (new) — `buildCollectionTrend(scope, { from, to, granularity })`. Granularity: `day | week | month`. Buckets payments by `paymentDate`, excludes `voidedAt IS NOT NULL`. Returns `{ points: { periodStart, periodEnd, label, collectedCents, paymentCount }[] }`. Validate `from <= to` and that the range is ≤ 366 days.
- `apps/api/src/routes/reports.ts` — add `GET /collection-trend?from=&to=&granularity=&distributorId=`. Admin can set `distributorId`; distributor is forced to own scope.
- `packages/schema/src/report.ts` — add `collectionTrendPointSchema` and `collectionTrendGranularityEnum`.
- `apps/web/src/features/reports/report-date-range.tsx` (new) — shared `{ from, to, onChange }` picker (two date inputs + preset buttons "7d", "30d", "90d", "MTD", "YTD"). Used by M2 and M3.
- `apps/web/src/features/reports/collection-trend.tsx` (new) — line chart + a small KPI strip showing total collected, payment count, and average payment.
- `apps/web/src/features/reports/queries.ts` — add `useCollectionTrendQuery({ from, to, granularity, distributorId? })`.
- `apps/web/src/routes/_authed/reports/index.tsx` — new tab "Collection Trend".

**Acceptance**:

- Default load shows last 30 days, daily.
- Switching to weekly/monthly re-bins without changing the from/to range.
- Voided payments don't contribute.
- Admin can filter to a single distributor; distributor login is auto-scoped.
- Empty range shows an empty chart + zero KPIs (no error).
- Mobile: KPI strip wraps to 2x2; chart resizes to viewport width.
- `bun run --filter '*' typecheck` green.

**Depends on**: M1 (chart wrapper exists).

---

### Task M3 — Payment-method breakdown + date range on Distributor Performance

**Goal**: Two additions on the Reports page. (a) Payment-method breakdown: donut + table showing collected-per-method (`cash | gcash | bank_transfer | other` — match existing enum in `packages/schema/src/payment.ts`) for the selected date range. (b) Add the shared date-range picker to the existing Distributor Performance tab and pipe `from`/`to` through to the API (route already accepts them; today's UI passes nothing).

**Files**:

- `apps/api/src/services/payment-method-breakdown.ts` (new) — `paymentMethodBreakdown(scope, { from, to, distributorId? })`. Groups non-voided payments by method, returns `{ method, count, collectedCents, percentOfTotal }[]`.
- `apps/api/src/routes/reports.ts` — add `GET /payment-method-breakdown`.
- `packages/schema/src/report.ts` — add `paymentMethodBreakdownRowSchema`.
- `apps/web/src/features/reports/payment-method-breakdown.tsx` (new) — donut + table.
- `apps/web/src/features/reports/queries.ts` — add `usePaymentMethodBreakdownQuery({ from, to, distributorId? })`.
- `apps/web/src/features/reports/distributor-performance.tsx` — replace the local `useState` date inputs with `<ReportDateRange />`. Pass `from`/`to` to the existing query (already accepts them on the API side).
- `apps/web/src/routes/_authed/reports/index.tsx` — new tab "Payment Methods".

**Acceptance**:

- Donut renders one wedge per non-zero method; legend labels match enum (formatted human-readable).
- Switching date range updates both donut and table.
- Distributor Performance tab honours the shared range picker.
- Method with zero in the range is hidden from the donut but listed in the table with 0 (clearer for completeness).
- Mobile: donut + table stack; donut shrinks gracefully.
- `bun run --filter '*' typecheck` green.

**Depends on**: M2 (`ReportDateRange` exists).

---

## PHASE N — Commission tracking (3 tasks)

### Task N1 — Commission rates schema + admin rate management

**Goal**: Admin can set and adjust a distributor's commission rate. Rates are effective-dated (one row per period) so future rate changes don't retroactively alter historical commissions. Stored in basis points to avoid floating-point math.

**Schema** (added to `packages/db/src/schema/domain.ts`):

```ts
commission_rates
- id (int, pk, autoincrement)
- distributorId (int, FK distributors, NOT NULL)
- ratePctBps (int, NOT NULL)               // basis points: 250 = 2.50%
- effectiveFrom (text, YYYY-MM-DD, NOT NULL)
- effectiveTo (text, YYYY-MM-DD, nullable) // null = current
- setByUserId (text, FK user, NOT NULL)
- note (text, nullable)
- createdAt (int timestamp_ms, default now())
Indexes: (distributorId, effectiveFrom DESC)
```

Setting a new rate closes the previous row (sets `effectiveTo` to `newEffectiveFrom - 1 day`). No two rows for the same distributor may overlap — service enforces this in a transaction.

**Files**:

- `packages/db/src/schema/domain.ts` — add `commissionRates` table.
- `packages/schema/src/commission.ts` (new) — `commissionRateInsertSchema`, `commissionRateSelectSchema`. Zod refine: `ratePctBps >= 0 && <= 10_000` (0–100%), `effectiveFrom` is a valid `YYYY-MM-DD`, `effectiveTo IS NULL || effectiveTo >= effectiveFrom`.
- `apps/api/src/services/commissions.ts` (new) — `getCurrentRate(distributorId, asOf?)`, `listRateHistory(distributorId)`, `setRate({ distributorId, ratePctBps, effectiveFrom, note, setByUserId })`. `setRate` runs in a transaction: closes the open row by setting its `effectiveTo`, inserts the new row, writes a `commission_rate.updated` audit event in the same tx.
- `apps/api/src/routes/commissions.ts` (new) — chained. `GET /rates` (admin-only, list current + history per distributor), `PUT /rates/:distributorId` (admin-only, sets a new rate).
- `apps/api/src/index.ts` — `.route("/commissions", commissions)`.
- `apps/web/src/features/commissions/commission-rates-table.tsx` (new) — table listing each distributor with current rate, "Edit rate" inline action that opens a dialog with `ratePctBps`, `effectiveFrom`, `note`.
- `apps/web/src/features/commissions/queries.ts` (new) — `useCommissionRatesQuery()`, `useSetCommissionRateMutation()`.
- `apps/web/src/routes/_authed/commissions/index.tsx` (new) — admin landing showing rates table.
- `apps/web/src/components/app-sidebar.tsx` — add admin "Commissions" nav link.

**Acceptance**:

- Admin sets a new rate of 2.5% for a distributor with no existing rate; row appears with `ratePctBps = 250`.
- Setting a second rate dated later closes the first row (`effectiveTo` set to one day before the new `effectiveFrom`).
- Setting a rate with `effectiveFrom < existing.effectiveFrom` returns `400` (no time-travel edits).
- Setting `ratePctBps = 10_001` returns `400`.
- Non-admin user calling `PUT /rates/:distributorId` returns `403`.
- Audit event `commission_rate.updated` written with `{ distributorId, oldRatePctBps, newRatePctBps }`.
- `bun run --filter db db:push` succeeds.
- `bun run --filter '*' typecheck` green.

**Depends on**: Phase 4 complete.

---

### Task N2 — Commission ledger (computed view + distributor self-service)

**Goal**: For any date range, show one row per non-voided payment with the matched rate at that payment's date and the resulting commission cents. Admin sees all distributors with a filter; distributor sees their own at `/commissions/my`. Includes a running total per page and a grand total.

**Files**:

- `apps/api/src/services/commissions.ts` — add `computeLedger(scope, { from, to, distributorId? })`. Joins `payments` → `receivables` → `commission_rates` where `paymentDate` falls in `[effectiveFrom, COALESCE(effectiveTo, '9999-12-31')]`. Excludes voided payments **except** when the void itself falls in the range — those produce a negative line (commission reversal). Returns `{ lines: CommissionLine[], totalCents }`.
- `apps/api/src/routes/commissions.ts` — add `GET /ledger?from=&to=&distributorId=`. Admin honours `distributorId`; distributor is auto-scoped.
- `apps/api/src/routes/exports.ts` — add `GET /commission-ledger.csv?from=&to=&distributorId=`. Same shape as the ledger.
- `packages/schema/src/commission.ts` — add `commissionLineSchema` (paymentId, paymentDate, receivableId, customerId, customerName, distributorId, amountCents, ratePctBps, commissionCents, isReversal).
- `packages/schema/src/csv.ts` — add `COMMISSION_LEDGER_CSV_COLUMNS`.
- `apps/web/src/features/commissions/commission-ledger.tsx` (new) — table + KPI (total commission, payments counted) + `<ReportDateRange />`. Distributor filter visible to admin only.
- `apps/web/src/features/commissions/my-earnings.tsx` (new) — distributor-scoped wrapper around the ledger that also shows the distributor's current rate.
- `apps/web/src/features/commissions/queries.ts` — add `useCommissionLedgerQuery({ from, to, distributorId? })`.
- `apps/web/src/routes/_authed/commissions/ledger.tsx` (new) — admin ledger page.
- `apps/web/src/routes/_authed/commissions/my.tsx` (new) — distributor self-service page.
- `apps/web/src/features/exports/export-buttons.tsx` — add "Commission ledger" button (date-range aware).
- `apps/web/src/components/app-sidebar.tsx` — add distributor "My earnings" nav link.

**Acceptance**:

- Date range with one payment for a distributor at 2.5% shows one line with the correct `commissionCents`.
- Payment that straddles a rate change picks the rate active on `paymentDate`.
- Voiding a payment in the range produces a negative `commissionCents` line flagged `isReversal = true`.
- Voiding a payment outside the range is excluded from the ledger.
- Distributor calling `/ledger?distributorId=<other>` is silently scoped to own (no error, no leak).
- Non-admin sees own data only on `/commissions/my`.
- CSV row count matches the on-screen line count.
- `bun run --filter '*' typecheck` green.

**Depends on**: N1.

---

### Task N3 — Commission payouts (snapshots + history)

**Goal**: Admin selects a date range, sees the resulting ledger preview (reusing N2), confirms, and the snapshot is frozen as a `commission_payouts` row plus its child line items. The payout has an immutable id, a `paidAt` timestamp, and a per-distributor breakdown. Past payouts are read-only; voiding a payment that was in a previous payout adds a reversal line to the next payout.

**Schema** (added to `packages/db/src/schema/domain.ts`):

```ts
commission_payouts
- id (int, pk, autoincrement)
- distributorId (int, FK distributors, NOT NULL)
- periodStart (text, YYYY-MM-DD, NOT NULL)
- periodEnd (text, YYYY-MM-DD, NOT NULL)
- totalCents (int, NOT NULL)               // sum across all lines, includes reversals
- paidAt (int timestamp_ms, NOT NULL, default now())
- paidByUserId (text, FK user, NOT NULL)
- note (text, nullable)
- createdAt (int timestamp_ms, default now())
Indexes: (distributorId, periodEnd DESC)

commission_payout_lines
- id (int, pk, autoincrement)
- payoutId (int, FK commission_payouts, NOT NULL)
- paymentId (int, FK payments, NOT NULL)
- amountCents (int, NOT NULL)              // payment amount the commission was based on
- ratePctBps (int, NOT NULL)               // rate at the time
- commissionCents (int, NOT NULL)          // can be negative for reversals
- isReversal (int as boolean, NOT NULL, default 0)
Indexes: (payoutId), (paymentId)
```

**Files**:

- `packages/db/src/schema/domain.ts` — add `commissionPayouts` and `commissionPayoutLines` tables.
- `packages/schema/src/commission.ts` — add `commissionPayoutSchema`, `commissionPayoutLineSchema`.
- `apps/api/src/services/commissions.ts` — add `issuePayout(scope, { distributorId, from, to, note, paidByUserId })` (admin only). Runs in a transaction: recompute ledger, sum total, insert `commission_payouts` + lines, write `commission_payout.issued` audit event. Also add `listPayouts(scope, { distributorId? })` and `getPayout(scope, payoutId)`.
- `apps/api/src/routes/commissions.ts` — add `GET /payouts`, `GET /payouts/:id`, `POST /payouts` (admin only).
- `apps/web/src/features/commissions/issue-payout-dialog.tsx` (new) — admin dialog: distributor select, date range, preview of computed ledger from N2's query, "Confirm payout" button.
- `apps/web/src/features/commissions/commission-payouts-table.tsx` (new) — list of issued payouts with date, period, total, link to detail.
- `apps/web/src/features/commissions/queries.ts` — add `usePayoutsQuery()`, `usePayoutQuery(id)`, `useIssuePayoutMutation()`. Invalidate ledger key after issue.
- `apps/web/src/routes/_authed/commissions/payouts/index.tsx` (new) — admin payouts list.
- `apps/web/src/routes/_authed/commissions/payouts/$id.tsx` (new) — payout snapshot detail (lines + reversal lines visible).
- `apps/web/src/routes/_authed/commissions/my.tsx` — append a "Past payouts" section linking to the per-payout view (distributor sees own).

**Acceptance**:

- Admin issues a payout; row appears in `commission_payouts` with `totalCents` matching the preview's sum.
- Payout detail page shows every line, including reversals.
- Voiding a payment that was covered by a past payout creates a reversal line in the **next** payout, not the existing one.
- Non-admin POST `/payouts` returns `403`.
- Payout detail is read-only — no edit/delete routes exist.
- Distributor sees own payouts (read-only) at `/commissions/my`.
- Audit event `commission_payout.issued` written with `{ payoutId, distributorId, periodStart, periodEnd, totalCents }`.
- `bun run --filter db db:push` succeeds.
- `bun run --filter '*' typecheck` green.

**Depends on**: N2.

---

## PHASE O — Exports & printable reports (3 tasks)

### Task O1 — Expand CSV exports (payments / receivables / visits)

**Goal**: Phase 4 shipped `overdue.csv` and `customers.csv`. Phase 5 adds `payments.csv`, `receivables.csv`, and `visits.csv` so every primary table has an audit-ready export. All exports respect distributor scope. Each is filterable by date range when a date column exists.

**Files**:

- `packages/schema/src/csv.ts` — add `PAYMENTS_CSV_COLUMNS`, `RECEIVABLES_CSV_COLUMNS`, `VISITS_CSV_COLUMNS` plus row types.
- `apps/api/src/routes/exports.ts` — add `GET /payments.csv?from=&to=`, `GET /receivables.csv`, `GET /visits.csv?from=&to=`. Reuse existing `toCsv` and `escapeField` helpers. Cap each at 10 000 rows.
- `apps/web/src/features/exports/export-buttons.tsx` — add three buttons. Buttons that have a date range pop a small range picker before download.

**Acceptance**:

- Distributor downloads `payments.csv` and sees only payments on their customers' receivables.
- `voidedAt` and `voidReason` columns appear in `payments.csv`.
- `receivables.csv` includes the customer name (joined), distributor name, original/current balance, status.
- `visits.csv` includes `outcome`, `promisedAmountCents`, `promisedDate`, `promiseResolvedAt`, `gpsLat`, `gpsLng`.
- Each file downloads with proper `Content-Disposition` and `Content-Type: text/csv; charset=utf-8`.
- Cap enforced at 10 000 rows (no error; truncation is silent, matching the existing pattern).
- `bun run --filter '*' typecheck` green.

**Depends on**: Phase 4 complete.

---

### Task O2 — Printable report layout (print stylesheet + landing route)

**Goal**: Admin (or distributor) opens a printable version of any report — Distributor Performance, Aging, Collection Trend, Payment Methods, Commission ledger — at `/reports/print?report=<name>&from=&to=&distributorId=`. The page uses a clean, print-optimised layout (no sidebar, no chrome) and a "Print" button that fires `window.print()`. CSS `@media print` hides interactive elements and tightens spacing.

**Files**:

- `apps/web/src/features/reports/printable-report.tsx` (new) — shell component that renders a logo strip, title, params summary (range, distributor), then `children`. Applies a `.print-page` class with `@media print` rules.
- `apps/web/src/routes/_authed/reports/print.tsx` (new) — TanStack Start route that parses search params (`report`, `from`, `to`, `distributorId`) and renders the corresponding report component inside `<PrintableReport />`. Reuses the existing report components without their toolbars (each component must accept an optional `chrome?: boolean` prop — default true; print view passes `false`).
- `apps/web/src/features/reports/aging-report.tsx`, `collection-trend.tsx`, `payment-method-breakdown.tsx`, `distributor-performance.tsx`, `commission-ledger.tsx` — accept `chrome?: boolean`. When `false`, hide date pickers + filter controls (data is already filtered by URL params).
- `apps/web/src/routes/_authed/reports/index.tsx` — add a "Print" link on each tab that opens `/reports/print?...` with the current filter state preserved.
- `apps/web/src/styles/print.css` (or extend existing global stylesheet) — global `@media print` rules to hide `<aside>`, `<nav>`, mobile bottom-nav, and any element with `.no-print`. Force black-on-white.

**Acceptance**:

- Opening `/reports/print?report=aging` shows the aging report without sidebar or top chrome.
- Clicking "Print" opens the browser print dialog.
- Print preview is single-column, black text on white, no overflow on Letter or A4.
- URL params populate the report (range + distributor) on load.
- Print view is accessible to the same roles as the underlying report.
- `bun run --filter '*' typecheck` green.

**Depends on**: M3 (all M-tab reports exist).

---

### Task O3 — Payment receipt voucher (per-payment printable)

**Goal**: Every payment gets a printable voucher with customer + distributor + payment details, useful as a written receipt. Linked from the payment detail row (and from `receivable-detail.tsx`'s payment history). Reuses the print stylesheet from O2.

**Files**:

- `apps/web/src/routes/_authed/payments/$id/receipt.tsx` (new) — printable voucher route. Calls `GET /payments/:id` (existing or new endpoint — check current `apps/api/src/routes/payments.ts`; add a `GET /:id` if missing). Layout: header (logo, "PAYMENT VOUCHER", receipt no. = payment id), 2-col grid (customer + distributor), payment details (date, method, reference, amount in words + figures), signature lines, "Print" button.
- `apps/api/src/routes/payments.ts` — if `GET /:id` is missing, add a chained handler that returns the payment joined to receivable + customer + distributor, scoped via the customer's distributor.
- `apps/web/src/features/payments/payment-history.tsx` — add a "Receipt" link per row that opens `/payments/$id/receipt`.
- `apps/web/src/lib/peso-words.ts` (new) — small helper to format `amountCents` as words ("One thousand two hundred pesos only"). Local pure function — no extra dependency.

**Acceptance**:

- Clicking "Receipt" on a payment row opens a clean voucher.
- Voucher includes amount in figures (₱1,200.00) and words ("One thousand two hundred pesos only").
- Voided payments show a large "VOID" watermark and the void reason; original receipt details remain visible.
- Print preview is single-page on Letter and A4.
- Distributor can only open receipts for their own customers' payments (`403` otherwise).
- `bun run --filter '*' typecheck` green.

**Depends on**: O2 (print stylesheet).

---

## Verification (per task)

- Run `bun run --filter '*' typecheck` from repo root. Must be green.
- Schema-touching tasks (N1, N3): run `bun run --filter db db:push` then `bun run --filter db db:seed`.
- After each phase: log in as both `admin@demo.local` and `dist@demo.local`, walk the affected pages on **both** desktop (≥1024px) and a 375px mobile viewport (Chrome DevTools device mode).
- For print-friendly pages (O2, O3): open Chrome's print preview (Cmd+P) and verify the layout fits Letter and A4 without clipping.

## Out of scope for Phase 5

Defer to a later phase. Do NOT build these in Phase 5:

- File uploads (customer photo, ID document, receipt photo).
- Offline mode / service worker / PWA.
- SMS / push notifications (still only `tel:` / `sms:` links).
- Native mobile app.
- Inventory management.
- Accounting integration (QuickBooks, Xero, generic ledger export).
- Fund release tracking.
- Multi-currency support.
- Public-facing customer portal.
- Smart duplicate-phone resolution.
- Customer transfer between distributors.
- Promise auto-resolution from payments.
- Heat-mapped visit density / route optimisation.
- Distributor-to-distributor messaging.
- Real PDF generation (use the print stylesheet for now — PDF library can come later).
- Email scheduling for reports.
- Custom report builder / saved filters.

## References

- Phase 4 plan: `docs/phase4-plan.md`
- Phase 4 progress: `docs/phase4-progress.md`
- Phase 3 plan: `docs/phase3-plan.md`
- Phase 3 progress: `docs/phase3-progress.md`
- Phase 2 plan: `docs/phase2-plan.md`
- Phase 2 progress: `docs/phase2-progress.md`
- MVP plan: `docs/build-plan.md`
- MVP progress: `docs/progress.md`
- Domain spec: `docs/mvp.md` (full reference) and `docs/mvp-smaller.md` (smaller demo scope)
- This plan's progress tracker: `docs/phase5-progress.md`
