# Phase 5 Build Progress

Full task details in `docs/phase5-plan.md`. Phase 4 context in `docs/phase4-plan.md` + `docs/phase4-progress.md`. Parked Phase 6 (Reports & Commissions) lives at `docs/phase6-plan.md` + `docs/phase6-progress.md`.

**Status legend**: `[ ]` todo · `[~]` in progress · `[x]` done · `[!]` blocked

---

## Phase P — Catalog foundations

- [x] **P1** — Products schema + zod (`products` table, audit `entityType` enum extended, `productSchema` / `createProductSchema` / `updateProductSchema`). Depends on: Phase 4 complete.
- [x] **P2** — Products API (scope-aware CRUD + archive, audit each mutation, mount in `index.ts`). Depends on: P1.
- [x] **P3** — Products UI (list, create, edit, archive; sidebar + mobile nav entries; works on 375px). Depends on: P2.

## Phase Q — Stock movements ledger

- [x] **Q1** — Stock movements schema + ledger service (`stock_movements` table, `services/stock.ts` with `getStockLevel`, `recordMovement`, `voidMovement`). Depends on: P1.
- [x] **Q2** — Stock movements API (list / record / void, sign validation per type). Depends on: Q1.
- [ ] **Q3** — Stock levels endpoint + products list integration (real qty + low-stock badge). Depends on: Q2.
- [ ] **Q4** — Movement entry UI (sheet/dialog from product detail; receive / sell / adjust / transfer). Depends on: Q3.
- [ ] **Q5** — Product detail with movement history (per-distributor stock for admin, history table, void). Depends on: Q4.

## Phase R — Polish & integration

- [ ] **R1** — Inventory dashboard widget + `/inventory` alias route. Depends on: Q5.
- [ ] **R2** — CSV exports for inventory (`/products.csv`, `/stock-movements.csv`). Depends on: R1.
- [ ] **R3** — Seed updates (8–12 products, ~30 movements including 1 voided). Depends on: Q5.

---

## Notes / Decisions Log

(Add entries here when blocking or deviating from the plan. Format: `YYYY-MM-DD — task — note`.)

- 2026-05-24 — pivot — Phase 5 changed from Reports & Commissions to Inventory. Original Phase 5 plan parked as Phase 6 (`docs/phase6-plan.md`, `docs/phase6-progress.md`). Inventory ships as a standalone module — receivables stay text-only; receivable ↔ product wiring is deferred.
- 2026-05-24 — plan — 9 tasks across P (catalog) / Q (stock ledger) / R (polish). Locked: distributor-scoped products, per-distributor unique SKU, integer-unit qty, ledger-style movements (sign per type, void replaces edit, negative stock allowed), audit events `product.*` + `stock.*`, low-stock threshold fixed at 5, no receivable wiring.
- 2026-05-24 — P2 — Products API mounted at `/api/products`. SKU conflict handled via pre-insert SELECT inside the tx → `HTTPException(409)` (no DB-error parsing). Distributor users get `distributorId` auto-resolved from session; admin must pass it. Update path omits SKU per plan. Archive is idempotent (returns row unchanged if already archived, no double audit). List endpoint returns rows shaped to `productListItemSchema` with `currentQty: 0` placeholder — Q3 wires the real number via separate stock-levels endpoint.
- 2026-05-24 — P1 — `products` table added with `(distributorId, sku)` UNIQUE + `(distributorId, status)` indexes. `auditEvents.entityType` enum extended with `product` + `stock_movement` (added now so Q1 needs no second migration). Audit event-type enum gained `product.*` + `stock.*` events. Zod schemas in `packages/schema/src/product.ts`. `db:push` + `typecheck` green.
- 2026-05-24 — Q1 — `stock_movements` table added with `(distributorId, productId, createdAt)` + `(productId, voidedAt)` indexes. `referenceType` / `referenceId` nullable (forward hook). `recordedByUserId` typed as `text` (no FK to `user` — matches `visits.recordedByUserId` pattern). Stock service (`apps/api/src/services/stock.ts`) owns all qty math: `signQty(type, qty)` (receive/transfer_in → `+|qty|`, sale/transfer_out → `-|qty|`, adjustment → qty as-is), `getStockLevel(tx, productId, distributorId)`, `getStockLevels(client, { distributorId?, productIds? })` (grouped by product+distributor), `recordMovement` (asserts product active, scope, signs qty, audit), `voidMovement` (idempotent — second void returns row unchanged with no audit). Zod schemas in `packages/schema/src/stock.ts` (`stockMovementSelectSchema`, `recordMovementSchema` with `superRefine` for sign rule, `voidMovementSchema`, `stockLevelSchema`, plus query schemas for Q2/Q3). `stockMovementTypeEnum` added to `enums.ts`. `db:push` + `db:seed` + `typecheck` green.
- 2026-05-24 — Q2 — Stock movements API mounted at `/api/stock-movements`. `listMovements` added to `services/stock.ts` (joins products/distributors/user for `stockMovementListItemSchema` rows; admin can filter via `?distributorId=`, distributor scoped via `scope.filterQuery`; `includeVoided` defaults false; `from`/`to` parsed as `Date`). Route is chained (`GET /`, `POST /`, `POST /:id/void`); sign-per-type validation lives in `recordMovementSchema.superRefine` so zValidator returns 400 on negative qty for non-adjustment types. Void route unwraps `{ reason }` to keep service signature unchanged. `typecheck` green.
- 2026-05-24 — P3 — Products UI shipped: TanStack-Query hooks (`productQueries` + `useArchiveProduct`), shadcn data table (Active/Archived tabs, search by name/SKU, columns with `—` stock placeholder per Q3), TanStack-Form `ProductForm` (admin distributor combobox on create, SKU disabled on edit, price input in pesos → cents on submit), routes `/products`, `/products/new`, `/products/$id`, `/products/$id_/edit`, sidebar "Inventory" group + mobile bottom nav "Products" entry (visible to both roles). Row archive uses confirm AlertDialog. Route tree regenerated via `@tanstack/router-cli generate`. `typecheck` green.
