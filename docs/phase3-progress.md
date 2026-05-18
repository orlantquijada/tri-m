# Phase 3 Build Progress

Full task details in `docs/phase3-plan.md`. Phase 2 context in `docs/phase2-plan.md` + `docs/phase2-progress.md`.

**Status legend**: `[ ]` todo · `[~]` in progress · `[x]` done · `[!]` blocked

---

## Phase F — Operational Corrections

- [x] **F1** — Payment void/correction (admin voids payment, schedule recalculated from remaining payments)
- [x] **F2** — Blacklist approval workflow (distributor requests, admin approves/rejects, atomically sets riskStatus)

## Phase G — Access Management

- [x] **G1** — Admin-triggered password reset for distributor users (no email/SMTP)
- [x] **G2** — User management page (admin sees all users, resets passwords, navigates to distributor)

## Phase H — Map Enhancements

- [x] **H1** — Map filters (risk status, overdue-only toggle) + Leaflet marker clustering
- [x] **H2** — Collection route view (ephemeral ordered stop list + numbered markers + CSV export)

## Phase I — Audit & Reporting

- [x] **I1** — Audit log infrastructure + UI (auditEvents table, logEvent service, admin page)
- [x] **I2** — Wire audit events into routes (payments, customers, blacklist, users)
- [ ] **I3** — Distributor performance report (per-distributor aggregates, date-range filter)

---

## Notes / Decisions Log

(Add entries here when blocking or deviating from the plan. Format: `YYYY-MM-DD — task — note`.)

- 2026-05-17 — plan — Phase 3 plan written. 9 tasks across 4 mini-phases (F–I). Order: payment void → blacklist approval → password reset → user management → map filters → collection route → audit infra → audit wiring → performance report. Locked: void is transactional with schedule recalculation replay; blacklist is a state machine; audit is append-only; route planning is client-side ephemeral; password reset is admin-triggered only.
- 2026-05-18 — H1 — Filters sent server-side as query params (`hasOverdue=true`, `riskStatus=good,watchlist`). New `useCustomersMapQuery(filters)` lives alongside the existing `customerQueries.useList()` (kept untouched for the customer-list page). Map filter state persisted via TanStack Router `validateSearch`; navigate uses `to: "/map"`. Installed `leaflet.markercluster` + `@types/leaflet.markercluster`; CSS imported at top of `map-view.tsx`. Clustering applies to all markers via a single `MarkerClusterGroup`.
- 2026-05-18 — I1 — `auditEvents` table added with indexes on `createdAt` and `(entityType, entityId)` for pagination + entity lookup. `logEvent(client, input)` accepts either `db` or a transaction (typed via `Parameters<Parameters<typeof db.transaction>[0]>[0]`) — callers in I2 should pass the `tx` to satisfy the locked decision that audit writes share the transaction with the primary op. Metadata is JSON-stringified at the call site. Audit route paginates via `page`/`limit` (default 50, max 200) and returns `{ events, total, page, limit }`. UI uses prev/next buttons (not full Pagination component) since total page count is enough signal. Manually patched `routeTree.gen.ts` for `/audit` route registration (file is `@ts-nocheck` so typecheck doesn't enforce, but runtime needs it). `actorId` join to `user` table is a left-join because user rows can be deleted while audit rows persist (append-only).
- 2026-05-18 — H2 — Overdue service already exposed `latitude`/`longitude` (added during H1 work), so no API service/route changes were needed. New `CollectionRouteView` reuses `useOverdueQuery`; route state is local `useState`, cleared on navigation. Numbered Leaflet markers via `L.divIcon` (inline SVG-free, dark pin with white number). Map auto-fits to stop bounds. CSV built in-memory via `Blob` + temporary `<a download>` anchor with proper RFC 4180 escaping. Customers without GPS show a "No GPS" badge and have no Add button. Sidebar link visible to admin + distributor. Patched `routeTree.gen.ts` manually to register the new route (the TanStack Start vite plugin would otherwise regenerate it on next `dev`/`build`).
- 2026-05-18 — I2 — Wired `logEvent` calls inside each primary transaction. Payments service gained imports for `logEvent`; both `createPayment` and `voidPayment` insert audit rows inside their existing tx. `updateCustomer` was rewritten to use `db.transaction` so audit row shares tx with the customer update; logs only when `data.riskStatus` differs from `existing.riskStatus`. Blacklist POST was wrapped in `db.transaction` (was a single insert); PATCH already used tx, just appended `logEvent`. Users route handles `user.password_reset` and `user.distributor_assigned` inline via `db.transaction` (bypassing the `updateUser` service so audit + update share tx — service is now orphaned but kept to respect the "touch only listed files" rule; can be removed in a later cleanup task). For `user.distributor_assigned` the comparison is `updates.distributorId !== existing.distributorId`, so explicit reassignment to the same value is intentionally not logged. `distributorId` on the audit row uses the _new_ distributor for `user.distributor_assigned` (so admin filters by the new owner) and the target user's current `distributorId` for `user.password_reset`.
