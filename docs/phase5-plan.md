# Furniture Receivables & Collections — Phase 5 Build Plan

## Context

Phase 4 is complete. All 8 tasks (J1–L3) are done. Phase 4 turned the app from "admin-friendly" into "distributor-friendly" with customer intake, visit/promise tracking, and a mobile-responsive layout.

Phase 5's theme is **Inventory**: a first-class catalog of products plus a ledger-style stock-movement log that tracks every receive, sale, adjustment, and transfer. Current stock per product per distributor is derived from `SUM(qty)` over non-voided movements — mirroring the money-as-ledger pattern already used by payments. This phase ships inventory as a **standalone module**: receivables continue to carry only a free-text `productDescription`. Wiring receivables to product line items is explicitly out-of-scope for Phase 5 and deferred to a later phase.

The original Phase 5 (Reports & Commissions) plan has been parked as Phase 6 — see `docs/phase6-plan.md` / `docs/phase6-progress.md`. It is ready to pick up after Phase 5 ships.

Phase 5 is 9 tasks across 3 mini-phases (P–R).

Same ground rules as all prior phases: pick the first `[ ]` task whose dependencies are all `[x]`, touch only the listed files, log decisions in `docs/phase5-progress.md`.

## Locked decisions (carried over)

- **Auth**: `better-auth` (Hono + Drizzle SQLite adapter). Session cookies.
- **API client**: Hono RPC (`hc<AppType>`) wrapped in TanStack Query.
- **Money**: stored as **INTEGER cents** in SQLite. UI divides by 100 for display, multiplies by 100 on submit.
- **Roles**: `admin`, `distributor`. Distributor scope enforced by `Scope.forUser(user)` helper.
- **Voided records**: `voidedAt` + `voidReason` columns. Voided rows are excluded from derived totals.
- **Audit log**: append-only `auditEvents` table. Writes share the transaction with the primary op.
- **Mobile-responsive only.** Phase 5 inventory pages must work on a 375px viewport. No PWA, no offline.
- **Kebab-case filenames** for all new web files.

## New locked decisions (Phase 5)

- **Products are distributor-scoped.** Each row carries `distributorId`. Admin sees across distributors via `Scope.assertAdmin`; distributor sees own only via `Scope.filterQuery`. No global catalog.
- **SKU uniqueness is per distributor.** Two distributors can both have SKU `CHAIR-01`; one distributor cannot have two rows with the same SKU.
- **Quantity is an integer count of units.** Not a decimal, not a weight. If a future product needs weight-based stock, that is a new column on a new phase.
- **Stock movements are a ledger.** Every change is a new row with a signed `qty`. Current stock = `SUM(qty)` for non-voided movements. No mutable `currentQty` column on `products`.
- **Movement `qty` sign convention**: positive for inbound (`receive`, `transfer_in`, positive `adjustment`), negative for outbound (`sale`, `transfer_out`, negative `adjustment`). The API enforces sign per type; the UI captures absolute qty + type and signs on the server.
- **Void replaces edit.** Movements cannot be edited. To correct a mistake, void the bad movement (sets `voidedAt`, `voidReason`) and record a new one. Voided rows drop out of `SUM(qty)`.
- **Stock can go negative.** No reservation, no oversell prevention in Phase 5 — negative balances simply surface the issue and are corrected via adjustments. A later phase can add reservations if needed.
- **`referenceType` / `referenceId` are nullable forward hooks.** They exist on `stock_movements` so a later phase can tie a `sale`-type movement to a `receivable` line item without a schema migration. Phase 5 never writes them.
- **No product → receivable wiring.** Receivables keep `productDescription` text. No FK, no line items, no migration.
- **New audit events**: `product.created`, `product.updated`, `product.archived`, `stock.received`, `stock.sold`, `stock.adjusted`, `stock.transferred_in`, `stock.transferred_out`, `stock.voided`. The `auditEvents.entityType` enum gains `product` and `stock_movement`.
- **Low-stock threshold is a fixed placeholder of 5 units** for the dashboard widget. Per-product configurable thresholds are out-of-scope for Phase 5.
- **CSV exports cap at 10 000 rows** (existing pattern in `apps/api/src/routes/exports.ts`). Sort deterministically by id.

## Critical conventions (read before any task)

1. **Distributor scoping is the single source of truth.** Every new read/write touching `products` or `stock_movements` MUST apply the `Scope` helper (`assertAdmin`, `assertCanRead`, `assertCanWrite`, `filterQuery`). Cross-distributor reads return empty; cross-distributor writes return `403`.
2. **Money stays INTEGER cents.** `unitPriceCents` is cents. `qty` is units, not cents — it's an integer count.
3. **Hono routes remain chained** (`app.get(...).post(...).route(...)`). Every new subapp must export a chained const.
4. **Stock-level math lives in one service.** `apps/api/src/services/stock.ts` (new in Q1) is the only place that computes current stock via `SUM(qty)`. Routes that need a current-qty number call this service — they do not re-implement the SQL.
5. **Movements are insert-only or void-only.** The schema does not expose UPDATE on `stock_movements` beyond setting `voidedAt`. No qty edits, no type edits.
6. **Audit writes share the transaction with the primary op.** Use the existing `logEvent(tx, …)` pattern from `apps/api/src/services/payments.ts:122`. Never log audit events outside the same transaction.
7. **Schema changes go through `bun run --filter db db:push` + seed re-run.** Phase 5 adds two tables (`products`, `stock_movements`).

## Target file layout (deltas vs. Phase 4)

```
packages/db/src/schema/
  domain.ts                    # extend: products, stockMovements; extend auditEvents.entityType enum
  seed.ts (or seed file)       # extend: seed products + stock movements (R3)

packages/schema/src/
  product.ts                   # NEW: productSchema, createProductSchema, updateProductSchema
  stock.ts                     # NEW: stockMovementSchema, recordMovementSchema, stockLevelSchema
  csv.ts                       # extend: PRODUCTS_CSV_COLUMNS, STOCK_MOVEMENTS_CSV_COLUMNS

apps/api/src/
  routes/
    products.ts                # NEW: GET /, POST /, GET /:id, PATCH /:id, POST /:id/archive, GET /stock-levels
    stockMovements.ts          # NEW: GET /, POST /, POST /:id/void
    exports.ts                 # extend: GET /products.csv, GET /stock-movements.csv
  services/
    products.ts                # NEW: list, get, create, update, archive (all scope-aware)
    stock.ts                   # NEW: getStockLevel(s), recordMovement, voidMovement
    audit.ts                   # extend: entityType enum (product, stock_movement)
  index.ts                     # mount products + stockMovements

apps/web/src/
  features/
    products/
      queries.ts               # NEW: useProducts, useProduct, useCreateProduct, useUpdateProduct, useArchiveProduct, useStockLevels, useRecordMovement, useVoidMovement, useMovements
      product-list.tsx         # NEW: table view
      products-data-table.tsx  # NEW: shadcn data table wrapper
      product-form.tsx         # NEW: create/edit form
      product-detail.tsx       # NEW: detail with stock + movement history
      stock-movement-form.tsx  # NEW: modal/sheet for receive/sell/adjust/transfer
      stock-badge.tsx          # NEW: small "Qty: N" badge with low-stock state
    dashboard/
      inventory-summary.tsx    # NEW: dashboard widget (R1)
    exports/
      export-buttons.tsx (or location) # extend: Products / Stock movements buttons
  routes/_authed/
    products/
      index.tsx                # NEW: list page
      new.tsx                  # NEW: create form
      $id.tsx                  # NEW: detail page
      $id_.edit.tsx            # NEW: edit form
    inventory/
      index.tsx                # NEW: alias landing for /inventory → products list (R1)
  components/
    app-sidebar.tsx            # extend: add "Inventory" / "Products" nav entry
    mobile-bottom-nav.tsx      # extend: add inventory entry
```

---

## PHASE P — Catalog foundations (3 tasks)

### Task P1 — Products schema + zod

**Goal**: A `products` table exists with the columns needed for a distributor-scoped catalog. Zod schemas in `packages/schema` cover create + update payloads. Audit `entityType` enum gains `product`. No API or UI yet.

**Schema** (added to `packages/db/src/schema/domain.ts`):

```ts
products
- id (text, pk, cuid2)
- distributorId (text, FK distributors, NOT NULL)
- name (text, NOT NULL)
- sku (text, NOT NULL)
- description (text, nullable)
- unitPriceCents (int, nullable)             // suggested retail; null = unpriced
- status (text, NOT NULL, default 'active')  // 'active' | 'archived'
- createdAt (int timestamp_ms, default now())
- updatedAt (int timestamp_ms, default now())
Indexes:
- (distributorId, sku) UNIQUE
- (distributorId, status)
```

**Files**:

- `packages/db/src/schema/domain.ts` — add `products` table. Extend the `entityType` enum (or text constraint) used by `auditEvents` to include `product` and `stock_movement` (do it now so P2 doesn't need a second migration).
- `packages/schema/src/product.ts` (new) — `productSchema`, `createProductSchema` (`name`, `sku`, `description?`, `unitPriceCents?`, `distributorId` — distributor users have this auto-injected on the server), `updateProductSchema` (partial, no `distributorId`, no `sku` change after create — SKU is a partial identifier; if the user really needs to rename SKU they archive + recreate).
- `packages/schema/src/index.ts` (or whatever the barrel is) — re-export the new schemas.

**Acceptance**:

- `bun run --filter db db:push` succeeds with no manual SQL.
- `bun run --filter '*' typecheck` green.
- A duplicate `(distributorId, sku)` insert raises a SQLite UNIQUE violation (verify via a quick repl or a one-off script — no permanent test needed).

**Depends on**: Phase 4 complete.

---

### Task P2 — Products API

**Goal**: A scope-aware Hono router exposes product CRUD + archive. Distributor users see only their own; admin sees all. Every mutation writes an audit event in the same transaction.

**Files**:

- `apps/api/src/services/products.ts` (new) —
  - `listProducts(scope, { distributorId?, status?, search? })` — applies `scope.filterQuery(productsTable.distributorId)`. `search` matches `name` or `sku` ILIKE.
  - `getProduct(scope, id)` — single fetch; `scope.assertCanRead(product.distributorId)`.
  - `createProduct(scope, input, actor)` — `scope.assertCanWrite(input.distributorId)`. Transaction: insert + `logEvent(tx, { event: "product.created", entityType: "product", entityId: product.id, distributorId, metadata: { name, sku } })`.
  - `updateProduct(scope, id, patch, actor)` — `scope.assertCanWrite(product.distributorId)`. Transaction: update + audit `product.updated` with `{ before, after }` diff.
  - `archiveProduct(scope, id, actor)` — sets `status = 'archived'`. Transaction: update + audit `product.archived`. Idempotent.
- `apps/api/src/routes/products.ts` (new) — chained:
  - `GET /` (list, with optional query params)
  - `POST /` (create — zod-validated against `createProductSchema`)
  - `GET /:id`
  - `PATCH /:id` (update)
  - `POST /:id/archive`
- `apps/api/src/index.ts` — mount via `.route("/products", products)`.

**Acceptance**:

- `dist@demo.local` GET `/api/products` returns only that distributor's rows.
- `admin@demo.local` GET `/api/products?distributorId=<other>` returns the targeted distributor's rows.
- POST as distributor with `distributorId` of another distributor returns `403`.
- POST with duplicate SKU returns `409` (catch the UNIQUE violation and map to a clean Hono response).
- Audit event written for each create / update / archive with the actor + distributor.
- RPC client (`hc<AppType>`) on the web side picks up the new routes with full types (no `any`).
- `bun run --filter '*' typecheck` green.

**Depends on**: P1.

---

### Task P3 — Products UI

**Goal**: Distributor or admin can list, create, edit, and archive products from the web app. Nav entries added to sidebar + mobile bottom nav. Stock column shows `—` (real qty arrives in Q3). Works on desktop (≥1024px) and 375px mobile viewport.

**Files**:

- `apps/web/src/features/products/queries.ts` (new) — TanStack Query hooks: `useProducts({ status?, search? })`, `useProduct(id)`, `useCreateProduct()`, `useUpdateProduct()`, `useArchiveProduct()`. Invalidate `["products"]` on every mutation.
- `apps/web/src/features/products/products-data-table.tsx` (new) — shadcn data table wrapper. Mirror `apps/web/src/features/customers/customers-data-table.tsx` for column-toggle, search, pagination.
- `apps/web/src/features/products/product-list.tsx` (new) — page-level component using the data table. Columns: `name`, `sku`, `unitPrice` (formatted), `stock` (placeholder `—` until Q3), `status` (badge). Row click → detail. Row actions: edit, archive.
- `apps/web/src/features/products/product-form.tsx` (new) — react-hook-form + zod resolver against `createProductSchema` / `updateProductSchema`. Fields: name, sku (disabled on edit), description, unitPriceCents (cents helper, displayed in pesos).
- `apps/web/src/routes/_authed/products/index.tsx` (new) — list route.
- `apps/web/src/routes/_authed/products/new.tsx` (new) — create route.
- `apps/web/src/routes/_authed/products/$id.tsx` (new) — detail route placeholder (Q5 fleshes it out; for P3, just show name, SKU, price, status, and an "Edit" link).
- `apps/web/src/routes/_authed/products/$id_.edit.tsx` (new) — edit route.
- `apps/web/src/components/app-sidebar.tsx` — add an "Inventory" group with "Products" link (visible to both roles).
- `apps/web/src/components/mobile-bottom-nav.tsx` — add inventory entry where the layout permits (replace or augment existing slots per current pattern).

**Acceptance**:

- Distributor creates a product; row appears in the list and is visible only to that distributor.
- Editing updates the row optimistically; reverting on error.
- Archiving moves the row to the "archived" filter; list defaults to active.
- Form validation: missing name, missing SKU, negative price all blocked.
- Duplicate SKU error from the API renders inline ("SKU already in use for this distributor").
- 375px viewport: data table collapses to a card list (or horizontal scroll per existing pattern); form fields stack; no horizontal overflow.
- `bun run --filter '*' typecheck` green.

**Depends on**: P2.

---

## PHASE Q — Stock movements ledger (5 tasks)

### Task Q1 — Stock movements schema + ledger service

**Goal**: A `stock_movements` table exists. A service module (`apps/api/src/services/stock.ts`) is the only place that reads or writes movement rows or computes current stock via `SUM(qty)`.

**Schema** (added to `packages/db/src/schema/domain.ts`):

```ts
stock_movements
- id (text, pk, cuid2)
- productId (text, FK products, NOT NULL)
- distributorId (text, FK distributors, NOT NULL)   // denormalised for scoping; must equal product.distributorId
- type (text, NOT NULL)                              // 'receive' | 'sale' | 'adjustment' | 'transfer_in' | 'transfer_out'
- qty (int, NOT NULL)                                // signed; sign enforced per type by the service
- reasonNote (text, nullable)
- referenceType (text, nullable)                     // forward hook (e.g. 'receivable' later)
- referenceId (text, nullable)
- recordedByUserId (text, FK user, NOT NULL)
- createdAt (int timestamp_ms, default now())
- voidedAt (int timestamp_ms, nullable)
- voidReason (text, nullable)
Indexes:
- (distributorId, productId, createdAt)
- (productId, voidedAt)
```

**Files**:

- `packages/db/src/schema/domain.ts` — add `stockMovements` table. `auditEvents.entityType` already extended in P1.
- `packages/schema/src/stock.ts` (new) — `stockMovementSchema`, `recordMovementSchema` (input: `productId`, `type`, `qty` as positive integer + sign derived from `type` on server; or pass signed for `adjustment`), `stockLevelSchema` (`productId`, `distributorId`, `currentQty`).
- `apps/api/src/services/stock.ts` (new) —
  - `signQty(type, absQty)` — pure helper. Receive / transfer_in → `+absQty`. Sale / transfer_out → `-absQty`. Adjustment → caller passes a signed value (so adjustments can be either direction).
  - `getStockLevel(tx, productId, distributorId)` → `SELECT COALESCE(SUM(qty), 0) FROM stock_movements WHERE productId = ? AND distributorId = ? AND voidedAt IS NULL`.
  - `getStockLevels(tx, distributorId | null, productIds?)` → batch version returning `{ productId, currentQty }[]`.
  - `recordMovement(scope, input, actor)` — `scope.assertCanWrite(product.distributorId)`. Transaction: validate `product` exists and is `active`, assert `input.distributorId === product.distributorId`, derive signed qty, insert, write audit event matching `type` (`stock.received` etc.).
  - `voidMovement(scope, id, reason, actor)` — `scope.assertCanWrite(movement.distributorId)`. Transaction: set `voidedAt = now()`, `voidReason`, audit `stock.voided`. Idempotent (voiding an already-voided row returns the row unchanged, no double audit).

**Acceptance**:

- `bun run --filter db db:push` green.
- Calling `recordMovement` with `type: 'receive'` and `qty: 10` inserts a row with `qty = +10`.
- Calling with `type: 'sale'` and `qty: 3` inserts `qty = -3`.
- Calling with `type: 'adjustment'` and signed `qty: -1` inserts `qty = -1`.
- Cross-distributor write (movement on a product belonging to another distributor) returns `403`.
- `getStockLevel` after one receive of 10 and one sale of 3 returns 7. Voiding the receive then returns -3.
- `bun run --filter '*' typecheck` green.

**Depends on**: P1.

---

### Task Q2 — Stock movements API

**Goal**: Hono routes expose movement list, record, and void. Validation maps movement type to qty-sign rules.

**Files**:

- `apps/api/src/routes/stockMovements.ts` (new) — chained:
  - `GET /` — query params: `productId?`, `distributorId?` (admin only), `from?`, `to?`, `includeVoided?`. Scope filter applied.
  - `POST /` — zod-validate `recordMovementSchema`; reject negative qty for `receive` / `sale` / `transfer_in` / `transfer_out` (UI sends absolute qty), allow signed qty for `adjustment`.
  - `POST /:id/void` — body `{ reason: string }`. Calls `voidMovement`.
- `apps/api/src/index.ts` — mount via `.route("/stock-movements", stockMovements)`.

**Acceptance**:

- Distributor list call returns only own movements.
- Admin can filter by `distributorId`.
- POST as distributor on a product belonging to a different distributor returns `403`.
- POST `receive` with negative qty returns `400` with a clear message.
- POST `adjustment` with signed qty (positive or negative) succeeds.
- Voiding twice is idempotent (no error, no duplicate audit).
- `bun run --filter '*' typecheck` green.

**Depends on**: Q1.

---

### Task Q3 — Stock levels endpoint + list integration

**Goal**: A single endpoint returns current stock for one product, a list of products, or all products in scope. Products list page displays real current qty.

**Files**:

- `apps/api/src/routes/products.ts` — add `GET /stock-levels?productId=&distributorId=` (admin can pass `distributorId`; distributor is scoped). Returns `{ productId, distributorId, currentQty }[]`. Without `productId`, returns one row per product in scope. Implementation calls `getStockLevels` from the stock service.
- `apps/web/src/features/products/stock-badge.tsx` (new) — small badge: shows `Qty: N`, applies `low-stock` style when `N <= 5`, `out-of-stock` style when `N <= 0`. Pure presentation; no fetching.
- `apps/web/src/features/products/queries.ts` — add `useStockLevels({ productIds? })`. Cache key `["products", "stock-levels", ...]`. Invalidated by movement mutations.
- `apps/web/src/features/products/product-list.tsx` — replace the `—` placeholder with `<StockBadge qty={…} />` using `useStockLevels`.

**Acceptance**:

- List page shows real current qty per row.
- Low-stock (≤ 5) badge style applies.
- Out-of-stock (≤ 0) badge style applies for negative balances.
- Recording a movement on the detail page (after Q4) refreshes the list badge on return.
- `bun run --filter '*' typecheck` green.

**Depends on**: Q2.

---

### Task Q4 — Movement entry UI

**Goal**: From the product detail page, a user can record a receive, sale, adjustment, or transfer. The form captures absolute qty + type + reason; the server signs the qty.

**Files**:

- `apps/web/src/features/products/stock-movement-form.tsx` (new) — modal/sheet (use the existing shadcn `Sheet` or `Dialog` per current convention). Fields:
  - `type` (segmented: Receive / Sale / Adjustment / Transfer in / Transfer out)
  - `qty` (positive integer for non-adjustment types; signed integer for adjustment — UI exposes a +/- toggle for adjustments)
  - `reasonNote` (textarea, required for adjustment and void scenarios, optional otherwise)
- `apps/web/src/features/products/queries.ts` — add `useRecordMovement()`, `useVoidMovement()`. On success invalidate `["products"]`, `["products", "stock-levels"]`, `["movements", productId]`.
- `apps/web/src/routes/_authed/products/$id.tsx` — add two quick-action buttons: "Receive stock" (opens form pre-filled with `type=receive`) and "Adjust stock" (opens form pre-filled with `type=adjustment`).

**Acceptance**:

- Receive 10 → list badge shows 10.
- Sale 3 → badge shows 7.
- Adjustment -1 → badge shows 6.
- Adjustment +2 → badge shows 8.
- Negative qty on a non-adjustment type is blocked client-side AND rejected server-side.
- Sheet/dialog closes on success; stays open on error with inline error.
- 375px viewport: form fields stack, buttons full-width.
- `bun run --filter '*' typecheck` green.

**Depends on**: Q3.

---

### Task Q5 — Product detail with movement history

**Goal**: Product detail page shows current stock (per distributor for admin; own only for distributor) plus a movement-history table with void action. Inline movement entry button kept from Q4. History sorts newest-first.

**Files**:

- `apps/web/src/features/products/queries.ts` — add `useMovements(productId, { includeVoided? })` returning newest-first.
- `apps/web/src/features/products/product-detail.tsx` (new — extracted from `$id.tsx` for testability) — sections:
  - Header (name, SKU, status, unit price, edit / archive actions)
  - Stock summary: for admin, a small table of `distributor | currentQty`; for distributor, a single big number with stock badge.
  - Movement history table: `createdAt`, `type` (badge), `qty` (positive green, negative red, with explicit sign), `recordedBy`, `reasonNote`, void button (disabled if already voided; shows "VOID — <reason>" tag).
- `apps/web/src/routes/_authed/products/$id.tsx` — render `<ProductDetail />`.

**Acceptance**:

- Detail loads, history populated.
- Void on a movement updates the list (voided row gets a "VOID" tag) and recalculates current stock.
- Re-voiding the same row is a no-op.
- 375px viewport: history table becomes a card list per existing data-list pattern.
- `bun run --filter '*' typecheck` green.

**Depends on**: Q4.

---

## PHASE R — Polish & integration (3 tasks)

### Task R1 — Inventory dashboard widget + `/inventory` alias

**Goal**: Dashboard surfaces inventory health at a glance: total active products, low-stock count (≤ 5), out-of-stock count (≤ 0), and the 5 most recent movements. A new `/inventory` route lands on the products list (alias for `/products`, so the sidebar can be labelled "Inventory" if that suits the menu).

**Files**:

- `apps/web/src/features/dashboard/inventory-summary.tsx` (new) — KPI cards (`Active products`, `Low stock`, `Out of stock`) + a compact list of the 5 most recent movements with product name + qty + actor. Uses existing `useProducts` and `useStockLevels`; adds a recent-movements query in `apps/web/src/features/products/queries.ts` (`useRecentMovements({ limit: 5 })`).
- `apps/api/src/routes/stockMovements.ts` — accept `?limit=&recent=true` (or a dedicated `GET /recent?limit=`) for the dashboard query. Distributor-scoped.
- `apps/web/src/routes/_authed/index.tsx` (or wherever the dashboard composes its cards) — render `<InventorySummary />` alongside existing summary cards.
- `apps/web/src/routes/_authed/inventory/index.tsx` (new) — alias route that internally renders the same component as `/products` (or simple redirect to `/products` if TanStack Router supports it cleanly per existing patterns).

**Acceptance**:

- Dashboard renders for admin (counts across all distributors) and distributor (own only) without error.
- `/inventory` resolves to the products list.
- Empty state (no products): widget shows zero counts and an "Add product" CTA.
- 375px viewport: KPI cards wrap to 2x2; recent-movements list scrolls.
- `bun run --filter '*' typecheck` green.

**Depends on**: Q5.

---

### Task R2 — CSV exports for inventory

**Goal**: Admin or distributor can export the product catalog and a movement log. Both respect distributor scope. Movement log is filterable by date range.

**Files**:

- `packages/schema/src/csv.ts` — add `PRODUCTS_CSV_COLUMNS` (`id`, `distributorId`, `distributorName`, `name`, `sku`, `description`, `unitPriceCents`, `currentQty`, `status`, `createdAt`) and `STOCK_MOVEMENTS_CSV_COLUMNS` (`id`, `productId`, `productName`, `sku`, `distributorId`, `distributorName`, `type`, `qty`, `reasonNote`, `referenceType`, `referenceId`, `recordedBy`, `createdAt`, `voidedAt`, `voidReason`).
- `apps/api/src/routes/exports.ts` — add `GET /products.csv` and `GET /stock-movements.csv?from=&to=`. Reuse the existing `toCsv` / `escapeField` helpers. Cap each at 10 000 rows. Sort by id desc.
- `apps/web/src/features/products/product-list.tsx` — add an "Export CSV" button on the toolbar that downloads `/api/exports/products.csv` (scope-respecting).
- `apps/web/src/features/products/product-detail.tsx` — add an "Export movements" button that downloads `/api/exports/stock-movements.csv?productId=…` (date range optional in this iteration; keep it lean).

**Acceptance**:

- Distributor download contains only own products / movements.
- Admin download contains all rows (or, optionally, filtered to a chosen distributor via query param — keep this admin-only).
- `Content-Disposition: attachment; filename="..."` and `Content-Type: text/csv; charset=utf-8` set.
- Movement CSV includes void columns; voided rows are present (not filtered out) for audit completeness.
- 10 000-row cap enforced silently (matching existing pattern).
- `bun run --filter '*' typecheck` green.

**Depends on**: R1 (just for sequencing — could ship independently).

---

### Task R3 — Seed updates

**Goal**: `bun run --filter db db:seed` produces a non-trivial inventory dataset: 8–12 products across the 2 seed distributors and ~30 movements with realistic mix.

**Files**:

- `packages/db/src/seed.ts` (or wherever the seed entrypoint lives) — extend with:
  - 8–12 products (e.g. "Bed frame queen", "Dining table 6-seater", "Office chair ergonomic", "Sofa 3-seater", etc.) split across the 2 distributors. Mix of priced and unpriced rows. One archived product.
  - ~30 stock movements spread over the last 60 days:
    - 8–10 `receive` movements (initial inventory).
    - 10–12 `sale` movements (varying products).
    - 2–3 `adjustment` movements (some positive, some negative — including a -2 correction).
    - 1–2 `transfer_in` and 1–2 `transfer_out` between the seed distributors.
    - 1 voided movement (so the void UI has data to show).
  - All movements get a sensible `reasonNote` for adjustments and a `recordedByUserId` of one of the seeded users.

**Acceptance**:

- Seed re-run is idempotent (clears + re-inserts per existing pattern).
- After `db:seed`, the products list page is populated for both `admin@demo.local` and `dist@demo.local`.
- Low-stock badge appears on at least one product.
- Out-of-stock badge appears on at most one product (intentional negative seed for demo).
- Dashboard inventory widget shows non-zero counts.
- `bun run --filter '*' typecheck` green.

**Depends on**: Q5 (so movements have a UI to land in).

---

## Verification (per task)

- Run `bun run --filter '*' typecheck` from repo root. Must be green.
- Schema-touching tasks (P1, Q1): run `bun run --filter db db:push` then `bun run --filter db db:seed`.
- After each phase: log in as both `admin@demo.local` and `dist@demo.local`, walk the affected pages on **both** desktop (≥1024px) and a 375px mobile viewport (Chrome DevTools device mode).
- End-to-end smoke (after all 9 tasks):
  1. As distributor: create a product → receive 10 → sell 3 → adjust -1 → confirm qty = 6.
  2. Void the receive → confirm qty = -4 and movement shows VOID tag.
  3. As admin: view both distributors' inventory; export CSVs; confirm rows.
  4. Open the audit log page; confirm `product.*` and `stock.*` events present.

## Out of scope for Phase 5

Defer to a later phase. Do NOT build these in Phase 5:

- Receivable ↔ product wiring (line items, FK from receivables to products, migration of `productDescription`).
- Reservations / oversell prevention.
- Per-product low-stock thresholds (we use a fixed 5).
- Product images / file uploads.
- Multi-currency pricing.
- Cost / margin tracking (we store `unitPriceCents` as retail only).
- Barcode scanning, QR codes.
- Stock-take / cycle-count workflows.
- Inter-distributor approval flow for transfers.
- Real PDF export (CSV only).
- Reports & Commissions (parked as Phase 6 — see `docs/phase6-plan.md`).

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
- Parked Phase 6 (Reports & Commissions): `docs/phase6-plan.md` / `docs/phase6-progress.md`
- This plan's progress tracker: `docs/phase5-progress.md`
