# Furniture Receivables & Collections — Phase 3 Build Plan

## Context

Phase 2 is complete. All 9 tasks (A1–E1) are done. Phase 3 addresses the deferred operational workflows and observability features that are now the natural next priority: payment corrections, blacklist governance, access management, map improvements, and audit/reporting.

Feature candidates are drawn from the Phase 2 "Out of scope" list plus `docs/mvp-smaller.md` items 7–15 in the Suggested Phase 2 backlog.

Same ground rules as all prior phases: pick the first `[ ]` task whose dependencies are all `[x]`, touch only the listed files, log decisions in `docs/phase3-progress.md`.

## Locked decisions (Phase 2 — carried over)

- **Auth**: `better-auth` (Hono + Drizzle SQLite adapter). Session cookies.
- **API client**: Hono RPC (`hc<AppType>`) wrapped in TanStack Query.
- **Map**: Leaflet + OpenStreetMap (client-only).
- **Money**: stored as **INTEGER cents** in SQLite. UI divides by 100 for display, multiplies by 100 on submit.
- **Roles**: `admin`, `distributor`. Distributor scope enforced by `scopeToDistributor` middleware.
- **Schedules**: `payment_schedules` table, one row per installment. Payment allocation: oldest unpaid rows first.

## New locked decisions (Phase 3)

- **Voided payments**: marked with a non-null `voidedAt` timestamp + `voidReason` text column on the `payments` table. Void triggers a full schedule recalculation: reset all schedule rows for the receivable to `pending` (paidAmountCents = 0), then replay all non-voided payments in chronological order using the same allocation algorithm from D2. For receivables without schedules, just recalculate `currentBalanceCents` from non-voided payments.
- **Blacklist workflow**: state machine `pending → approved | rejected`. Distributor submits a request with a required reason. Admin reviews from a dedicated queue. Approval atomically sets `customer.riskStatus = blacklisted`. Distributor can only see requests within their own scope.
- **Audit log**: append-only `auditEvents` table. Events are inserted in the same DB transaction as the primary operation. No deletes ever. Events covered in Phase 3: `payment.recorded`, `payment.voided`, `customer.status_changed`, `blacklist.requested`, `blacklist.approved`, `blacklist.rejected`, `user.password_reset`, `user.distributor_assigned`.
- **Password reset**: admin-triggered only. No email / SMTP required. Admin sets a new temporary password for any `distributor`-role user. Password communicated out-of-band. Admin cannot reset another admin's password.
- **Collection route planning**: client-side ephemeral. No DB persistence. The collection route view reads overdue customers (with lat/lng from the overdue endpoint) and lets the user build an ordered stop list. Route state lives in component memory; navigation away clears it.

## Critical conventions (read before any task)

1. **Money stays integer cents.** No new real/float columns for money.
2. **Hono routes remain chained** (`app.get(...).post(...).route(...)`). Every new subapp must export a chained const.
3. **Distributor scoping is single source of truth.** Every new read/write touching `customers`, `receivables`, `payments`, `payment_schedules`, or `auditEvents` MUST apply `scopeToDistributor` (or join-filter equivalent). Cross-distributor reads return empty; cross-distributor writes return `403`.
4. **Void is transactional.** Mark payment voided + recalculate all schedule rows + update receivable balance in one DB transaction. No partial voids.
5. **Audit writes are non-blocking within the same transaction.** Use `db.insert(auditEvents)` inside the same transaction as the primary operation so that a failed primary rolls back the audit row too.
6. **Kebab-case filenames** for all new web files (match the convention set in Phase 2).
7. **Schema changes go through `drizzle-kit push` + seed re-run.** F1, F2, and I1 each add to the schema.

## Target file layout (deltas vs. Phase 2)

```
packages/db/src/schema/
  domain.ts                # extend: voidedAt/voidReason on payments; blacklistRequests table; auditEvents table

packages/schema/src/
  payment.ts               # extend: voidPaymentSchema
  blacklist.ts             # NEW: insert/select Zod schemas for blacklist requests
  audit.ts                 # NEW: event type union + auditEvent select schema
  user.ts                  # NEW: userListItemSchema for admin user management
  report.ts                # NEW: distributorPerformanceRow schema

apps/api/src/
  routes/
    payments.ts            # extend: POST /:id/void; audit log calls in I2
    customers.ts           # extend: hasOverdue filter param; audit call on status change
    blacklist.ts           # NEW: GET/POST /blacklist-requests; PATCH /:id (approve/reject)
    audit.ts               # NEW: GET /audit (admin only, filtered, paginated)
    reports.ts             # NEW: GET /reports/distributor-performance
    users.ts               # extend: GET /; POST /:id/reset-password
    overdue.ts             # extend: include latitude/longitude on each row
  services/
    payments.ts            # extend: voidPayment() transaction + schedule recalculation
    audit.ts               # NEW: logEvent() helper
    overdue.ts             # extend: add lat/lng to query result
  index.ts                 # mount blacklist, audit, reports routes

apps/web/src/
  features/
    payments/
      void-payment-dialog.tsx    # NEW: confirm void + reason field
      payment-history.tsx        # extend: Void button (admin only), Voided badge
    customers/
      blacklist-request-button.tsx  # NEW: submit request dialog
      customer-profile.tsx          # extend: render BlacklistRequestButton
    users/
      reset-password-dialog.tsx  # NEW
      user-list.tsx              # NEW: admin user management table
      queries.ts                 # extend: useUsersQuery()
    map/
      map-filters.tsx            # NEW: risk status + overdue toggle
      map-view.tsx               # extend: clustering + filter prop
    collection-routes/
      collection-route-view.tsx  # NEW: ordered stop list + numbered map markers
    audit/
      audit-log.tsx              # NEW: paginated event table
      queries.ts                 # NEW
    reports/
      distributor-performance.tsx  # NEW: per-distributor metrics table
      queries.ts                   # NEW
  routes/_authed/
    blacklist-requests/index.tsx   # NEW: admin review queue
    users/index.tsx                # NEW: user management page
    collection-routes/index.tsx    # NEW
    audit/index.tsx                # NEW
    reports/index.tsx              # NEW
    distributors/$id.edit.tsx      # extend: Reset Password button
  components/
    app-sidebar.tsx                # extend: Users, Collection Route, Audit Log, Reports nav links
```

---

## PHASE F — Operational Corrections (2 tasks)

### Task F1 — Payment void/correction

**Goal**: Admin can void a recorded payment. Voiding reverses the balance change, recalculates schedule rows from remaining payments, and marks the voided payment visually in history.

**Files**:

- `packages/db/src/schema/domain.ts` — add `voidedAt` (timestamp, nullable) and `voidReason` (text, nullable) columns to the `payments` table. A payment is voided when `voidedAt IS NOT NULL`.
- `packages/schema/src/payment.ts` — add `voidPaymentSchema` (`{ reason: z.string().min(1) }`).
- `apps/api/src/routes/payments.ts` — `POST /:id/void` (admin only). Calls service. Returns updated receivable + schedule.
- `apps/api/src/services/payments.ts` — `voidPayment(db, paymentId, reason)` in a single transaction: (1) set `voidedAt = now()`, `voidReason`; (2) reset all `payment_schedules` for the receivable to `pending` / `paidAmountCents = 0`; (3) replay all non-voided payments for the receivable in `createdAt` order using the existing allocation logic; (4) update `receivable.currentBalanceCents` and `status`.
- `apps/web/src/features/payments/void-payment-dialog.tsx` (new) — AlertDialog. Required reason field. Confirm button calls mutation.
- `apps/web/src/features/payments/payment-history.tsx` — add "Void" button on each non-voided payment row (admin only). Render a "Voided" badge + `voidReason` tooltip on voided rows. Voided rows are greyed out.

**Acceptance**:

- Admin voids a payment → `currentBalanceCents` increases by the voided amount.
- Schedule rows that were `paid`/`partial` due to the voided payment revert deterministically (recalculated from remaining payments).
- Voided payment remains visible in history with "Voided" badge.
- Distributor has no Void button; `POST /:id/void` returns `403` for distributor role.
- `bun run --filter db db:push` succeeds (schema change).
- `bun run --filter '*' typecheck` green.

**Depends on**: Phase 2 complete (specifically D2 allocation logic in `services/payments.ts`).

---

### Task F2 — Blacklist approval workflow

**Goal**: Distributor can request that a customer be blacklisted. Admin reviews a queue of pending requests and approves or rejects each. Approval atomically sets the customer's `riskStatus` to `blacklisted`.

**Files**:

- `packages/db/src/schema/domain.ts` — add `blacklistRequests` table: `id`, `customerId` (FK → customers), `requestedByUserId` (FK → user), `distributorId` (int), `reason` (text), `status` (`pending` | `approved` | `rejected`), `reviewedByUserId` (nullable FK), `reviewedAt` (nullable timestamp), `reviewNote` (nullable text), `createdAt`.
- `packages/schema/src/blacklist.ts` (new) — `blacklistRequestInsertSchema`, `blacklistRequestSelectSchema`.
- `apps/api/src/routes/blacklist.ts` (new) — chained:
  - `POST /` (distributor or admin): creates a pending request. Distributor can only create for their own customers. Rejects if customer is already blacklisted or has a pending request.
  - `GET /` (admin sees all, distributor sees own, scoped). Returns `{ requests: [...] }` with customer name + distributor name.
  - `PATCH /:id` (admin only): body `{ action: "approve" | "reject", reviewNote?: string }`. Approve atomically sets `customer.riskStatus = blacklisted`.
- `apps/api/src/index.ts` — `.route("/blacklist-requests", blacklistRequests)`.
- `apps/web/src/features/customers/blacklist-request-button.tsx` (new) — shown on customer profile when `riskStatus !== "blacklisted"` and no pending request exists. Opens a dialog with required reason field.
- `apps/web/src/features/customers/customer-profile.tsx` — render `<BlacklistRequestButton />` below risk badge.
- `apps/web/src/routes/_authed/blacklist-requests/index.tsx` (new) — admin review queue table. Approve/Reject actions inline. Distributor visiting this page sees only their own requests (or redirect to 403 — pick one and stay consistent).

**Acceptance**:

- Distributor submits a request → appears in admin queue with `pending` status.
- Admin approves → customer `riskStatus` becomes `blacklisted` immediately. Request status becomes `approved`.
- Admin rejects with a note → request status becomes `rejected`. Customer status unchanged.
- Distributor cannot see another distributor's requests.
- Cannot submit duplicate pending requests for the same customer.
- `bun run --filter db db:push` + `db:seed` succeed.
- `bun run --filter '*' typecheck` green.

**Depends on**: Phase 2 complete (A1 for scoping).

---

## PHASE G — Access Management (2 tasks)

### Task G1 — Admin-triggered password reset

**Goal**: Admin can set a new password for any distributor-role user from that distributor's edit page. No email/SMTP required.

**Files**:

- `apps/api/src/routes/users.ts` — add `POST /:id/reset-password` (admin only). Body: `{ newPassword: string }` (min 8 chars). Rejects if target user has `role !== "distributor"`. Updates password via `auth.api` or direct Drizzle update on the `account` table's `password` field (hash via better-auth's hashing util). Returns `204`.
- `apps/web/src/features/users/reset-password-dialog.tsx` (new) — Dialog. New password + confirm field. Submit calls mutation.
- `apps/web/src/routes/_authed/distributors/$id.edit.tsx` — add "Reset Password" button on each assigned user row. Renders the dialog.

**Acceptance**:

- Admin sets a new password for a distributor user.
- Target user can log in with the new password.
- Old session for the target user remains valid (acceptable — no forced logout in this phase).
- Admin cannot reset another admin's password (`403`).
- Minimum 8-character validation on client and server.
- Password not echoed in any API response.
- `bun run --filter '*' typecheck` green.

**Depends on**: Phase 2 complete (B3 — users route exists, user creation pattern established).

---

### Task G2 — User management page

**Goal**: Admin can see all users (both roles) in one place, with their role, distributor assignment, and a link to reset password or change distributor.

**Files**:

- `apps/api/src/routes/users.ts` — add `GET /` (admin only). Returns all users: `id`, `name`, `email`, `role`, `distributorId`, distributor name, `createdAt`. Join `user` ← `distributors` left join.
- `packages/schema/src/user.ts` (new) — `userListItemSchema`.
- `apps/web/src/features/users/user-list.tsx` (new) — Shadcn table. Columns: name, email, role badge, distributor (or "—"), actions (Reset Password, Go to Distributor).
- `apps/web/src/features/users/queries.ts` — add `useUsersQuery()`.
- `apps/web/src/routes/_authed/users/index.tsx` (new) — renders `<UserList />`.
- `apps/web/src/components/app-sidebar.tsx` — add "Users" nav link (admin only, same pattern as "Distributors").

**Acceptance**:

- Admin sees full user list with correct role badges and distributor names.
- "Reset Password" opens the dialog from G1 (import `reset-password-dialog.tsx`).
- Distributor visiting `/users` → `403` from API; web redirects or shows 403 message.
- `bun run --filter '*' typecheck` green.

**Depends on**: G1 (reset-password-dialog imported on the list page).

---

## PHASE H — Map Enhancements (2 tasks)

### Task H1 — Map filters + marker clustering

**Goal**: Map page gains risk-status filters and overdue-only toggle. Markers cluster at high zoom-out levels.

**Files**:

- `apps/api/src/routes/customers.ts` — extend `GET /` to accept `hasOverdue=true` query param. When set, filter to customers that have at least one receivable where `status` is not `fully_paid` and (`firstDueDate < today` or any schedule row with `dueDate < today` and `status` in `pending|partial`). Existing `riskStatus` filter (if not already present) added here too.
- `apps/web/src/features/map/map-filters.tsx` (new) — compact filter bar: multi-select risk status checkboxes (`good`, `watchlist`, `blacklisted`) + "Overdue only" toggle. Controlled by parent state.
- `apps/web/src/features/map/map-view.tsx` — integrate `leaflet.markercluster` (install as dependency). Accept `filters` prop; use filtered customer list. Clustering applied to all marker layers.
- `apps/web/src/features/customers/queries.ts` — extend `useCustomersMapQuery` (or equivalent) to accept and forward filter params.
- `apps/web/src/routes/_authed/map.tsx` — hold filter state (URL search params for shareability). Render `<MapFilters />` above the map; pass active filters to both components.

**Acceptance**:

- Default map loads all customers (no filter active).
- Toggling "Overdue only" removes customers with no overdue receivables from the map.
- Risk status filter reduces markers to matching customers only.
- Markers cluster visually at low zoom; individual markers appear at high zoom.
- Active filters are reflected in URL search params (survive refresh).
- `bun run --filter '*' typecheck` green.

**Depends on**: Phase 2 complete.

---

### Task H2 — Collection route view

**Goal**: New `/collection-routes` page lets admin or distributor build an ordered stop list of overdue customers to visit. Shows numbered map markers, supports manual reordering, and exports the list as CSV. Route state is ephemeral (in-memory only).

**Files**:

- `apps/api/src/routes/overdue.ts` — extend the overdue rows response to include `latitude` and `longitude` from the customers join. Only rows where `latitude IS NOT NULL AND longitude IS NOT NULL` are usable for route planning (include all rows; UI filters).
- `apps/api/src/services/overdue.ts` — add `lat`/`lng` to the SELECT in `listOverdue()`.
- `apps/web/src/features/collection-routes/collection-route-view.tsx` (new) — split-panel layout: left = ordered stop list (drag-to-reorder or up/down buttons); right = Leaflet map with numbered markers. "Add to route" button on each overdue row with GPS. "Remove" button on route list entries. "Export CSV" anchor generates `collection-route.csv` in-memory (columns: `stop_no, customer_name, phone, address, latitude, longitude, balance_cents`).
- `apps/web/src/routes/_authed/collection-routes/index.tsx` (new) — renders `<CollectionRouteView />`. Uses existing `useOverdueQuery`.
- `apps/web/src/components/app-sidebar.tsx` — add "Collection Route" nav link (visible to admin and distributor).

**Acceptance**:

- Page loads overdue customers. Customers without GPS coordinates show an "No GPS" note and cannot be added to the route.
- Adding a customer appends them to the stop list and places a numbered marker on the map.
- Reordering the stop list renumbers markers in real-time.
- Exporting downloads a valid CSV that opens correctly in Numbers/Excel.
- Route is cleared when the user navigates away (no persistence expected).
- `bun run --filter '*' typecheck` green.

**Depends on**: H1 (map improvements in place; overdue query patterns confirmed).

---

## PHASE I — Audit & Reporting (3 tasks)

### Task I1 — Audit log infrastructure + UI

**Goal**: Append-only `auditEvents` table. `logEvent()` service helper. Admin-only `/audit` API endpoint. Audit log page in the admin UI.

**Files**:

- `packages/db/src/schema/domain.ts` — add `auditEvents` table: `id`, `event` (text — one of the defined event strings), `entityType` (text: `payment` | `customer` | `blacklist_request` | `user`), `entityId` (text), `actorId` (text, FK → user), `distributorId` (int, nullable), `metadata` (text, JSON-encoded), `createdAt` (timestamp).
- `packages/schema/src/audit.ts` (new) — `auditEventType` union of all event strings; `auditEventSelectSchema`.
- `apps/api/src/services/audit.ts` (new) — `logEvent(db, { event, entityType, entityId, actorId, distributorId?, metadata? })`. Performs a simple `db.insert(auditEvents)`. Must be called within the same transaction as the primary operation.
- `apps/api/src/routes/audit.ts` (new) — `GET /` (admin only). Query params: `entityType`, `entityId`, `actorId`, `from`, `to`, `page` (default 1), `limit` (default 50, max 200). Returns `{ events: [...], total }`.
- `apps/api/src/index.ts` — `.route("/audit", auditRoute)`.
- `apps/web/src/features/audit/audit-log.tsx` (new) — Shadcn table. Columns: timestamp, event, entity (linked if applicable), actor, distributor, metadata summary. Pagination controls.
- `apps/web/src/features/audit/queries.ts` (new) — `useAuditQuery(filters)`.
- `apps/web/src/routes/_authed/audit/index.tsx` (new) — filter bar (entityType, date range) + `<AuditLog />`.
- `apps/web/src/components/app-sidebar.tsx` — add "Audit Log" nav link (admin only).

**Acceptance**:

- `bun run --filter db db:push` + `db:seed` succeed.
- `GET /audit` returns empty array (no events yet — events are wired in I2).
- Admin can see the audit page. Distributor visiting `/audit` → `403`.
- Pagination works (change page, results shift).
- `bun run --filter '*' typecheck` green.

**Depends on**: F1, F2 (void and blacklist events will be wired in I2; having them done first means the event type union is final).

---

### Task I2 — Wire audit events into routes

**Goal**: Every key state-changing operation now calls `logEvent()`. The audit log page becomes populated.

**Files**:

- `apps/api/src/routes/payments.ts` — call `logEvent` on `POST /` (event: `payment.recorded`) and `POST /:id/void` (event: `payment.voided`). Include `paymentId`, `amountCents`, `receivableId` in metadata.
- `apps/api/src/routes/customers.ts` — call `logEvent` when `PATCH /:id` changes `riskStatus` (event: `customer.status_changed`). Include `previousStatus`, `newStatus` in metadata.
- `apps/api/src/routes/blacklist.ts` — call `logEvent` on `POST /` (`blacklist.requested`), `PATCH /:id` approve (`blacklist.approved`), `PATCH /:id` reject (`blacklist.rejected`). Include `customerId`, `reason` in metadata.
- `apps/api/src/routes/users.ts` — call `logEvent` on `POST /:id/reset-password` (`user.password_reset`) and `PATCH /:id` when `distributorId` changes (`user.distributor_assigned`). Include `targetUserId`, `newDistributorId` (where applicable) in metadata.

**Acceptance**:

- Recording a payment → `payment.recorded` row appears in audit log.
- Voiding a payment → `payment.voided` row appears.
- Changing a customer's risk status → `customer.status_changed` row.
- Submitting / approving / rejecting a blacklist request → three separate event rows.
- Admin resetting a password → `user.password_reset` row.
- Reassigning a distributor → `user.distributor_assigned` row.
- `bun run --filter '*' typecheck` green.

**Depends on**: I1 (logEvent service + auditEvents table), F1 (void route), F2 (blacklist route).

---

### Task I3 — Distributor performance report

**Goal**: Admin-only `/reports` page shows a per-distributor breakdown: total original balance, total collected, collection rate %, current outstanding, overdue amount, customer count. Filterable by date range.

**Files**:

- `packages/schema/src/report.ts` (new) — `distributorPerformanceRowSchema`: `{ distributorId, distributorName, customerCount, originalBalanceCents, collectedCents, outstandingCents, overdueCents, collectionRatePct }`.
- `apps/api/src/routes/reports.ts` (new) — chained. `GET /distributor-performance?from=&to=` (admin only). Aggregates via Drizzle: join `distributors ← customers ← receivables ← payments` (sum non-voided payments within date range). `overdueCents` reuses the scoped overdue logic. Returns array of rows, one per distributor.
- `apps/api/src/index.ts` — `.route("/reports", reports)`.
- `apps/web/src/features/reports/distributor-performance.tsx` (new) — Shadcn table. Date-range picker at top. Sortable columns. Collection rate displayed as percentage with a colour hint (green ≥ 80%, yellow 50–80%, red < 50%).
- `apps/web/src/features/reports/queries.ts` (new) — `useDistributorPerformanceQuery(from, to)`.
- `apps/web/src/routes/_authed/reports/index.tsx` (new).
- `apps/web/src/components/app-sidebar.tsx` — add "Reports" nav link (admin only).

**Acceptance**:

- Report loads with all-time data when no date range is set.
- Setting a date range changes collected amounts to payments within the range (originalBalance and outstanding are not date-scoped — they reflect current state).
- Each distributor row shows correct aggregates (verify against seed data).
- Distributor visiting `/reports` → `403`.
- `bun run --filter '*' typecheck` green.

**Depends on**: I2 (logical grouping; technically only requires Phase 2 complete).

---

## Verification (per task)

- Run `bun run --filter '*' typecheck` from repo root. Must be green.
- Schema-touching tasks (F1, F2, I1): run `bun run --filter db db:push` then `bun run --filter db db:seed`.
- After each phase: log in as both `admin@demo.local` and `dist@demo.local`, walk the affected pages.

## Out of scope for Phase 3

Defer to Phase 4 or beyond. Do NOT build these in Phase 3:

- Offline mode + sync.
- Inventory management.
- Accounting integration.
- Native mobile app.
- SMS / push notifications.
- Heatmaps, live tracking, turn-by-turn route navigation.
- Fund release tracking.
- Multi-currency support.
- Public-facing customer portal.
- Batch payment import (CSV upload).
- Scheduled / automated report delivery.

## References

- MVP plan: `docs/build-plan.md`
- MVP progress: `docs/progress.md`
- Phase 2 plan: `docs/phase2-plan.md`
- Phase 2 progress: `docs/phase2-progress.md`
- Spec: `docs/mvp-smaller.md`
- This plan's progress tracker: `docs/phase3-progress.md`
