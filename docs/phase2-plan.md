# Furniture Receivables & Collections — Phase 2 Build Plan

## Context

The demo MVP is complete (see `docs/build-plan.md`, `docs/progress.md`). Phase 2 turns the demo into something the client can actually run with: real multi-distributor mode, distributor management, data-quality safeguards, installment schedules, and lightweight exports.

Phase 2 is split into 5 mini-phases (A–E), 9 tasks total (~30–60 min each, 3–6 files per task). Same ground rules as Phase 0–4: pick the first `[ ]` task whose dependencies are all `[x]`, touch only the listed files, log decisions in `docs/phase2-progress.md`.

Source spec for the features in this plan: `docs/mvp-smaller.md` §"Suggested Phase 2" (lines 1083–1101) plus the "Nice to Have" items in the Priority Backlog (lines 982–991).

## Locked decisions (carried over from MVP)

- **Auth**: `better-auth` (Hono + Drizzle SQLite adapter). Session cookies.
- **API client**: Hono RPC (`hc<AppType>`) wrapped in TanStack Query.
- **Map**: Leaflet + OpenStreetMap (client-only).
- **Money**: stored as **INTEGER cents** in SQLite. UI divides by 100 for display, multiplies by 100 on submit.
- **Roles**: `admin`, `distributor`. Distributor scope enforced by `scopeToDistributor` middleware.

## New locked decisions (Phase 2)

- **Schedules** stored in a new `payment_schedules` table, one row per installment. Generated at receivable creation when `paymentTermMonths` is set. Existing receivables without a term keep working on the simple `first_due_date` path.
- **Distributor user creation**: admin creates the auth user via `auth.api.signUpEmail` from the server route, then sets `role` + `distributorId` via Drizzle update. Mirrors the seed pattern in `packages/db/src/seed.ts`. No client-side `signUp`.
- **CSV exports** rendered server-side as `text/csv` with `Content-Disposition: attachment`. No client-side CSV libs.
- **Duplicate phone detection** is a warning, not a hard block. Admin can still confirm-and-save.

## Critical conventions (read before any task)

1. **Money stays integer cents.** New schedule table follows the same rule (`due_amount_cents INTEGER`).
2. **Hono routes remain chained** (`app.get(...).post(...).route(...)`). Any new subapp must export a chained const.
3. **Distributor scoping is the single source of truth.** Every new read/write endpoint that touches `customers`, `receivables`, `payments`, or `payment_schedules` MUST apply `scopeToDistributor` (or its equivalent join filter). Cross-distributor reads/writes return `403`.
4. **Admin overrides are explicit.** Any endpoint that allows an admin to bypass a distributor rule (e.g. create receivable for blacklisted) must check `role === "admin"` explicitly. No accidental bypass via missing guard.
5. **Schema changes go through `drizzle-kit push` + seed re-run.** Schedule table addition is a schema change.
6. **CSV endpoints stream rows.** Do not load the full table into memory; use the Drizzle iterator (`.all()` is fine for demo scale, but cap with `LIMIT 10_000`).

## Target file layout (deltas vs. MVP)

```
packages/db/src/schema/
  domain.ts                # extend with paymentSchedules table

packages/schema/src/
  distributor.ts           # NEW: insert/update/select Zod schemas for distributors
  schedule.ts              # NEW: schedule row schema
  csv.ts                   # NEW: shared CSV row types (overdue, customers)

apps/api/src/routes/
  distributors.ts          # NEW: GET/POST/PATCH /api/distributors
  users.ts                 # NEW: admin-only user assignment (role + distributorId)
  schedules.ts             # NEW: GET /api/receivables/:id/schedule (mounted under receivables)
  exports.ts               # NEW: GET /api/exports/overdue.csv, /api/exports/customers.csv

apps/api/src/services/
  receivable.ts            # extend: schedule generation on create
  overdue.ts               # NEW: per-installment overdue resolver + aging buckets

apps/web/src/features/
  distributors/            # NEW: list, form, queries
  users/                   # NEW: assignment dialog
  customers/DuplicatePhoneWarning.tsx   # NEW
  receivables/ScheduleTable.tsx         # NEW
  overdue/AgingBuckets.tsx              # NEW
  exports/ExportButtons.tsx             # NEW

apps/web/src/routes/_authed/
  distributors/index.tsx
  distributors/new.tsx
  distributors/$id.edit.tsx
```

---

## PHASE A — Distributor Hardening (1 task)

### Task A1 — Strict distributor 403s

**Goal**: Every existing route correctly enforces distributor scope. Cross-distributor reads return empty (filtered), cross-distributor writes return `403`. Manual smoke test as `dist@demo.local` proves it.

**Files**:

- `apps/api/src/middleware/auth.ts` — add `requireOwnDistributor(getDistributorId)` helper that 403s when `role === "distributor"` and the resource's `distributorId !== session.user.distributorId`.
- `apps/api/src/routes/customers.ts` — apply to `PATCH /:id`, `GET /:id` (currently scoped on list only, verify on detail + edit).
- `apps/api/src/routes/receivables.ts` — apply to `GET /:id`, `POST /` (verify `customer.distributorId === session.user.distributorId` for distributors).
- `apps/api/src/routes/payments.ts` — apply to `POST /` (verify via join: payment's receivable's customer's distributorId).
- `apps/api/src/routes/overdue.ts` — confirm filter via `scopeToDistributor`.
- `apps/api/src/routes/dashboard.ts` — confirm `SUM(...)` aggregates are scoped.

**Acceptance**:

- Log in as `dist@demo.local`. Visit `/customers`, `/map`, `/overdue`, `/dashboard`. Numbers and rows match only distributor 1's data.
- Directly hit `GET /api/customers/<id-of-another-distributor>` via curl with distributor cookie → `403`.
- Try to `POST /api/receivables` with `customerId` from another distributor → `403`.
- Try to `POST /api/payments` against a receivable belonging to another distributor → `403`.
- Seed retains both `admin@demo.local` and `dist@demo.local` users.

**Depends on**: nothing (MVP complete).

---

## PHASE B — Distributor Management UI (3 tasks)

### Task B1 — Distributor list page

**Goal**: Admin-only `/distributors` page lists every distributor with name, area, status, customer count, total outstanding.

**Files**:

- `packages/schema/src/distributor.ts` (new) — `distributorSelectSchema`, `distributorListItemSchema` (adds `customerCount`, `outstandingCents`).
- `apps/api/src/routes/distributors.ts` (new) — `GET /` admin-only (rejects distributor role with 403). Join customers + receivables for aggregates.
- `apps/api/src/index.ts` — `.route("/distributors", distributors)`.
- `apps/api/src/middleware/auth.ts` — `requireAdmin` helper if not present.
- `apps/web/src/features/distributors/queries.ts` (new) — `useDistributorsQuery()`.
- `apps/web/src/features/distributors/DistributorList.tsx` (new) — Shadcn table.
- `apps/web/src/routes/_authed/distributors/index.tsx` (new).
- `apps/web/src/routes/_authed/dashboard.tsx` — add "Distributors" nav link (admin only).

**Acceptance**:

- Admin sees full list with correct aggregates.
- Distributor user visiting `/distributors` → redirected or 403'd (your choice; pick one and stay consistent).
- `bun run --filter '*' typecheck` green.

**Depends on**: A1.

---

### Task B2 — Add / Edit distributor

**Goal**: Admin can create a distributor and edit name, phone, assigned area, status (active/inactive).

**Files**:

- `packages/schema/src/distributor.ts` — `distributorInsertSchema`, `distributorUpdateSchema`. `status` enum from `enums.ts`.
- `packages/schema/src/enums.ts` — `distributorStatusEnum` if not present.
- `apps/api/src/routes/distributors.ts` — `POST /`, `PATCH /:id`, `GET /:id`. Admin only.
- `apps/web/src/features/distributors/DistributorForm.tsx` (new) — react-hook-form + Zod resolver.
- `apps/web/src/routes/_authed/distributors/new.tsx`, `_authed/distributors/$id.edit.tsx` (new).

**Acceptance**:

- Admin can create + edit distributor.
- Setting status to `inactive` disables the distributor everywhere it appears in customer/receivable forms (filter `status === 'active'` in the select).
- Validation errors surface (name required, phone non-empty).
- Distributor role → 403 on all writes.

**Depends on**: B1.

---

### Task B3 — Distributor user assignment

**Goal**: Admin can create a distributor login (auth user with `role=distributor` + `distributorId`) and reassign an existing user's distributor.

**Files**:

- `apps/api/src/routes/users.ts` (new) — `POST /distributor-users` (creates auth user via `auth.api.signUpEmail`, then Drizzle update for role + distributorId), `PATCH /:id` (admin can change distributorId or set role inactive). Admin only.
- `apps/api/src/index.ts` — `.route("/users", users)`.
- `apps/web/src/features/users/AssignDistributorDialog.tsx` (new) — opens from distributor edit page. Lists existing distributor-role users + "Create new user" form (email + password + auto-set role/distributorId).
- `apps/web/src/routes/_authed/distributors/$id.edit.tsx` — render the dialog.

**Acceptance**:

- Admin can create a new distributor user, log out, log in as that user, sees only that distributor's data.
- Admin can reassign an existing distributor user to a different `distributorId`. After re-login, scope reflects new assignment.
- Passwords are not echoed in API responses.

**Depends on**: B2.

**Security note**: this route creates auth users. Confirm `requireAdmin` runs BEFORE the body is parsed. Reject any request that arrives without a session.

---

## PHASE C — Data Quality (1 task)

### Task C1 — Duplicate customer phone warning

**Goal**: On create / edit, if another customer has the same phone, show a warning with a link to the existing customer. Admin can still confirm-and-save. Distributor sees the warning only if the duplicate is within their own scope (do not leak other distributors' data).

**Files**:

- `apps/api/src/routes/customers.ts` — `GET /lookup?phone=<phone>` returns `{ matches: [{ id, fullName, distributorId }] }`. Scoped to distributor.
- `apps/web/src/features/customers/DuplicatePhoneWarning.tsx` (new).
- `apps/web/src/features/customers/CustomerForm.tsx` — call lookup on blur of phone field; render warning above submit button.

**Acceptance**:

- Typing a duplicate phone surfaces the warning without blocking submit.
- Save still works (warning is advisory).
- Distributor cannot see matches owned by another distributor (lookup is scoped).

**Depends on**: A1.

---

## PHASE D — Schedules + Aging (3 tasks)

### Task D1 — Payment schedules table + generation

**Goal**: New `payment_schedules` table. When a receivable is created with `paymentTermMonths > 0`, generate one schedule row per month. Receivables without a term continue to use the single-`first_due_date` model.

**Files**:

- `packages/db/src/schema/domain.ts` — add `paymentSchedules` table: `id`, `receivableId` (FK), `installmentNo` (int), `dueDate` (date), `dueAmountCents` (int), `paidAmountCents` (int default 0), `status` (`pending` | `partial` | `paid` | `overdue`), `createdAt`, `updatedAt`.
- `packages/schema/src/schedule.ts` (new) — Zod select/insert schemas.
- `apps/api/src/services/receivable.ts` — extend `createReceivable` service: if `paymentTermMonths > 0`, insert N schedule rows in the same transaction. `dueAmountCents = floor(originalBalance / N)` with the remainder added to the final installment.
- `apps/api/src/routes/receivables.ts` — `GET /:id` includes `schedule[]` (ordered by `installmentNo`).
- `packages/db/src/seed.ts` — generate schedules for the existing 3 overdue + 5 current receivables. Idempotent (delete-then-insert).

**Acceptance**:

- `bun run --filter db db:push` succeeds. `bun run --filter db db:seed` runs twice without error.
- Creating a receivable with `paymentTermMonths=10` produces 10 schedule rows, sum of `dueAmountCents` === `originalBalanceCents`.
- `GET /api/receivables/:id` returns schedule array sorted by `installmentNo`.

**Depends on**: A1.

---

### Task D2 — Per-installment overdue + UI

**Goal**: Overdue logic uses schedule rows when available. A receivable is "overdue" if any schedule row is `pending`/`partial` and `due_date < today`. Schedules table appears on receivable detail page.

**Files**:

- `apps/api/src/services/overdue.ts` (new) — `getOverdueReceivables(scope)`: prefers `payment_schedules` when present; falls back to `first_due_date` for receivables with no schedule rows.
- `apps/api/src/routes/overdue.ts` — use the new service. Adds `oldestUnpaidDueDate`, `pastDueInstallmentCount` to each row.
- `apps/web/src/features/receivables/ScheduleTable.tsx` (new) — renders schedule rows with status pills.
- `apps/web/src/features/receivables/ReceivableDetail.tsx` — embed `<ScheduleTable />` between balances and payment history.
- Payment recording (`apps/api/src/routes/payments.ts`) — when a payment lands, allocate it to the oldest unpaid schedule rows in the same transaction. Mark rows `paid` or `partial`. Mark receivable `fully_paid` only when all schedule rows are `paid`.

**Acceptance**:

- Overdue page shows receivables with past-due installments, hides receivables that only have future installments.
- Recording a payment moves schedule rows from `pending` → `partial`/`paid` deterministically.
- Receivable without a schedule still appears in overdue if `currentBalance > 0 && firstDueDate < today` (back-compat).

**Depends on**: D1.

---

### Task D3 — Aging buckets

**Goal**: Overdue page and dashboard show aging breakdown: `0–30`, `31–60`, `61–90`, `90+` days, by oldest unpaid installment.

**Files**:

- `apps/api/src/routes/dashboard.ts` — `GET /aging` returns `{ bucket0_30Cents, bucket31_60Cents, bucket61_90Cents, bucket90PlusCents }`. Scoped.
- `apps/api/src/routes/overdue.ts` — same buckets in the response payload (aggregate over the filtered set).
- `apps/web/src/features/overdue/AgingBuckets.tsx` (new) — 4 small cards above the overdue table.
- `apps/web/src/features/dashboard/DashboardCards.tsx` — extend with optional aging row (or new section).

**Acceptance**:

- Buckets sum equals the page's `Total overdue amount`.
- Admin sees business-wide buckets, distributor sees own.

**Depends on**: D2.

---

## PHASE E — Exports (1 task)

### Task E1 — CSV export (overdue + customers)

**Goal**: Two CSV download buttons: "Export Overdue" on `/overdue`, "Export Customers" on `/customers`. Scoped per role.

**Files**:

- `apps/api/src/routes/exports.ts` (new) — `GET /overdue.csv`, `GET /customers.csv`. Sets `Content-Type: text/csv; charset=utf-8` and `Content-Disposition: attachment; filename="<name>.csv"`. Reuses the same scoped queries as the overdue + customer list endpoints. Cap with `LIMIT 10000`.
- `packages/schema/src/csv.ts` (new) — column order types so API + tests stay in sync.
- `apps/web/src/features/exports/ExportButtons.tsx` (new) — `<a href={api.exports.overdue.csv.$url()} download>`. Hono RPC `.$url()` returns a URL builder; for CSV use a plain anchor so the browser handles the download.
- `apps/web/src/routes/_authed/overdue.tsx`, `_authed/customers/index.tsx` — render the relevant button.

**Acceptance**:

- Clicking the button downloads a CSV that opens correctly in Numbers/Excel.
- Admin export contains all rows; distributor export contains only their own rows.
- Columns: overdue → `customer_name, phone, address, distributor, product, total_cents, current_balance_cents, first_due_date, days_overdue, status`. Customers → `full_name, phone, address, latitude, longitude, distributor, risk_status`.

**Depends on**: D3.

---

## Verification (per task)

- Run `bun run --filter '*' typecheck` from the repo root. Must be green.
- Schema-touching tasks (D1): run `bun run --filter db db:push` then `bun run --filter db db:seed`.
- After each phase: log in as both `admin@demo.local` and `dist@demo.local`, walk the affected pages.

## Out of scope for Phase 2

Defer to Phase 3 or beyond. Do NOT build these in Phase 2:

- Payment correction / void workflow.
- Audit logs.
- Full blacklist approval workflow.
- GPS clustering, heatmaps, route planning.
- Offline mode + sync.
- Inventory management.
- Accounting integration.
- Native mobile app.
- SMS / push notifications.
- Advanced reports (anything beyond the 4 dashboard cards + aging buckets).
- Password reset flow (admin manually resets via DB for now).

## References

- MVP plan: `docs/build-plan.md`
- MVP progress: `docs/progress.md`
- Spec: `docs/mvp-smaller.md` (Phase 2 backlog at lines 1083–1101)
- This plan's progress tracker: `docs/phase2-progress.md`
