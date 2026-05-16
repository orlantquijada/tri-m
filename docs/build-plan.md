# Furniture Receivables & Collections — Demo MVP Build Plan

## Context

Build an internal demo MVP for tracking customer receivables, payments, overdue accounts, and customer locations on a map. Full spec at `docs/mvp-smaller.md`. Demo answers: who owes, how much, who is overdue, where they are.

The repo is already scaffolded (Bun monorepo, Drizzle + SQLite/Turso, Hono API skeleton, TanStack Start + Shadcn web shell). What's missing is everything domain-specific: auth, all business tables (only a sample `users` exists), all API routes, all pages, the API↔web wiring, and the map.

The plan is split into 16 small tasks (~30–60 min each, ~3–6 files per task) so it can be executed task-by-task by an LLM without context overflow. Each task lists its goal, files, dependencies, and acceptance criteria.

Progress tracked in `docs/progress.md`.

## Locked decisions

- **Scope**: Admin + Distributor (with own-record restrictions for distributors). No distributor CRUD UI — distributors are seeded.
- **Auth**: `better-auth` (Hono + Drizzle SQLite adapter). Session cookies.
- **API client**: Hono RPC (`hc<AppType>`) wrapped in TanStack Query.
- **Map**: Leaflet + OpenStreetMap (client-only).
- **Money**: stored as **INTEGER cents** in SQLite (no `real`). Format in UI.

## Critical conventions (read before any task)

1. **All money fields are `integer` cents**, never `real`. UI divides by 100 for display, multiplies by 100 on submit.
2. **All web↔API data flow uses Hono RPC + TanStack Query**. Do NOT use TanStack Start `createServerFn` for domain reads/writes. Server functions are only acceptable for proxying the better-auth handler if SSR cookies require it.
3. **Hono routes must be chained** (`app.get(...).post(...).route(...)`) on the same `app` instance, and every subapp re-mounted via `.route()` must itself be a chained const. Breaking the chain breaks RPC type inference.
4. **Leaflet must be client-only**. Dynamic-import inside `useEffect` or mark the route `ssr: false`. Never import `leaflet` from a route loader.
5. **better-auth owns the `user`, `session`, `account`, `verification` tables.** Extend better-auth's `user` table with `role` (`admin`|`distributor`) and `distributorId` columns instead of keeping a separate domain users table. Delete the existing skeleton `users` table in `packages/db/src/schema.ts`.
6. **Distributor column lands in Phase 0** (FK on `customers`, `receivables`, and the better-auth `user`). Bolt-on later = destructive migration.
7. **CORS**: web runs `:3000`, API runs on its own port. Hono needs explicit origin + `credentials: true`. Client `hc` needs `init: { credentials: "include" }`. `*` origin will silently break cookies.
8. **Protected routes use a TanStack `_authed` layout route** with a `beforeLoad` redirect, so children inherit the guard.

## Target file layout

```
packages/db/src/
  schema/
    auth.ts              # better-auth-generated tables + role/distributorId extension
    domain.ts            # distributors, customers, receivables, payments
  schema.ts              # re-export auth + domain
  seed.ts                # bun run db:seed
  index.ts               # db client export (existing)

packages/schema/src/
  enums.ts               # riskStatus, receivableStatus, paymentMethod, role
  customer.ts            # insert/update/select Zod schemas
  receivable.ts
  payment.ts
  index.ts               # barrel export

apps/api/src/
  index.ts               # composes app, exports AppType for RPC
  lib/auth.ts            # better-auth server instance
  routes/
    auth.ts              # better-auth handler mount
    customers.ts
    receivables.ts
    payments.ts
    overdue.ts
    dashboard.ts
  middleware/
    auth.ts              # requireSession, requireRole, scopeToDistributor

apps/web/src/
  lib/
    api.ts               # hc<AppType> client (credentials: include)
    auth-client.ts       # better-auth react client
    query.ts             # QueryClient + provider
  features/
    customers/ (components, queries.ts, hooks)
    receivables/
    payments/
    map/MapView.tsx      # client-only Leaflet
    overdue/
    dashboard/
  routes/
    __root.tsx           # existing
    login.tsx            # new
    _authed.tsx          # layout: redirect if no session
    _authed/dashboard.tsx
    _authed/customers/index.tsx
    _authed/customers/new.tsx
    _authed/customers/$id.tsx
    _authed/customers/$id.edit.tsx
    _authed/map.tsx
    _authed/receivables/new.tsx
    _authed/receivables/$id.tsx
    _authed/overdue.tsx
```

---

## PHASE 0 — Foundations (4 tasks)

### Task 0a — Schema + seed

**Goal**: All 5 domain tables exist, migrate cleanly, seed script populates a known set of demo rows.

**Files**:

- `packages/db/src/schema/domain.ts` (new) — `distributors`, `customers`, `receivables`, `payments` per spec (lines 692–809 of mvp-smaller.md). Money columns as `integer` (cents). Risk/status/method as `text` with literal unions enforced by Zod, not SQLite enums.
- `packages/db/src/schema.ts` — re-export from `./schema/domain` (auth tables added in 0c).
- Delete the existing skeleton `users` table.
- `packages/db/src/seed.ts` (new) — idempotent (delete-then-insert on fixed IDs): 2 distributors, 1 admin user (placeholder — better-auth-managed in 0c), 3 customers with Manila coords (lat 14.5–14.7, long 120.9–121.1), 2 receivables, 1 payment.
- `packages/db/package.json` — add `"db:seed": "bun src/seed.ts"`.

**Acceptance**:

- `bun run --filter db db:push` succeeds.
- `bun run --filter db db:seed` runs twice in a row without errors (idempotent).
- `bun run --filter db db:studio` shows all 4 tables with seeded rows.

**Depends on**: nothing.

---

### Task 0b — Hono restructure + RPC export

**Goal**: API split into per-resource route files, chained for RPC inference, with a typed `AppType` export the web app can consume.

**Files**:

- `apps/api/src/routes/customers.ts`, `receivables.ts`, `payments.ts`, `overdue.ts`, `dashboard.ts` (new) — each exports a chained `Hono` instance with stub `GET /` returning `[]`.
- `apps/api/src/index.ts` — compose: `const app = new Hono().basePath("/api").route("/customers", customers).route("/receivables", receivables)...`. Add CORS middleware (`hono/cors`) with explicit origin `http://localhost:3000` and `credentials: true`. `export type AppType = typeof app`. Remove the sample `/users` CRUD.
- `apps/api/src/env.ts` — add `WEB_ORIGIN` (default `http://localhost:3000`).

**Acceptance**:

- `bun run --filter api dev` boots.
- `curl http://localhost:<PORT>/api/customers` returns `[]`.
- `bunx tsc --noEmit` in `apps/api` passes.

**Depends on**: 0a.

---

### Task 0c — better-auth wiring

**Goal**: Email+password auth working end-to-end against SQLite, with `role` + `distributorId` columns on the auth `user` table.

**Files**:

- `apps/api/src/lib/auth.ts` (new) — `betterAuth({ database: drizzleAdapter(db, { provider: "sqlite" }), emailAndPassword: { enabled: true }, user: { additionalFields: { role: { type: "string", required: true, defaultValue: "admin" }, distributorId: { type: "number", required: false } } } })`.
- Run `bunx @better-auth/cli generate --config apps/api/src/lib/auth.ts --output packages/db/src/schema/auth.ts`. Commit the generated file.
- `packages/db/src/schema.ts` — re-export `./schema/auth`.
- `apps/api/src/routes/auth.ts` (new) — mount `auth.handler` on `/api/auth/**`.
- `apps/api/src/index.ts` — `.route("/auth", authRouter)` (chained).
- `packages/db/src/seed.ts` — use `auth.api.signUpEmail(...)` to create the admin (`admin@demo.local` / `demo1234`) and one distributor user (`dist@demo.local` / `demo1234`, role=`distributor`, distributorId=1). Run after table seeds.
- `bun run --filter db db:push` to apply auth tables.

**Acceptance**:

- `POST /api/auth/sign-in/email` with admin creds returns 200 + sets cookie.
- `bunx tsc --noEmit` passes everywhere.

**Depends on**: 0a, 0b.

**Risk**: This is the single biggest unknown. Do it in isolation. Commit the generated schema file before any later task touches `packages/db/src/schema/`.

---

### Task 0d — Web shell: RPC client, react-query, auth context, login page, `_authed` guard

**Goal**: Web app can log in, sees a protected dashboard placeholder, and has the data layer plumbed.

**Files**:

- `apps/web/package.json` — add `@tanstack/react-query`, `@tanstack/react-query-devtools`, `better-auth` (for the react client).
- `apps/web/src/lib/api.ts` (new) — `import type { AppType } from "api"`. `export const api = hc<AppType>(import.meta.env.VITE_API_URL, { init: { credentials: "include" } })`. (Add `api` to web's `dependencies` as `workspace:*`; export `AppType` from `apps/api/package.json` `exports`.)
- `apps/web/src/lib/auth-client.ts` (new) — `createAuthClient({ baseURL: import.meta.env.VITE_API_URL })`.
- `apps/web/src/lib/query.ts` (new) — `QueryClient` instance + `QueryClientProvider` wrapper.
- `apps/web/src/routes/__root.tsx` — wrap `<TooltipProvider>` in `<QueryClientProvider>`. Add `<ReactQueryDevtools />`.
- `apps/web/src/routes/login.tsx` (new) — Shadcn form: email/password, calls `authClient.signIn.email`, on success `router.navigate({ to: "/dashboard" })`.
- `apps/web/src/routes/_authed.tsx` (new) — layout route, `beforeLoad` checks `authClient.getSession()`; redirects to `/login` if absent. Renders `<Outlet />`.
- `apps/web/src/routes/_authed/dashboard.tsx` (new) — placeholder `<h1>Dashboard</h1>` + sign-out button.
- `apps/web/.env` (new, gitignored) — `VITE_API_URL=http://localhost:4000`.

**Acceptance**:

- `bun run --filter web dev` boots.
- Visiting `/dashboard` while logged out redirects to `/login`.
- Logging in with seeded admin creds lands on `/dashboard`. Cookie visible in devtools. Refresh keeps session.
- React Query devtools panel visible.
- `bunx tsc --noEmit` passes in both apps.

**Depends on**: 0c.

---

## PHASE 1 — Customers + Map (4 tasks)

### Task 1a — Customer list (API + page)

**Goal**: `GET /api/customers` returns scoped list; `/customers` page renders a table with risk badge + balance column.

**Files**:

- `packages/schema/src/customer.ts` (new) — `customerSelectSchema`, `customerListItemSchema` (includes `outstandingBalance` computed). `packages/schema/src/enums.ts` — `riskStatusEnum`.
- `apps/api/src/middleware/auth.ts` (new) — `requireSession` (reject if no session), `scopeToDistributor` (if `role === "distributor"`, add `where(eq(customers.distributorId, session.user.distributorId))`).
- `apps/api/src/routes/customers.ts` — `GET /` with `requireSession` + `scopeToDistributor`. Join receivables for `SUM(currentBalance)`.
- `apps/web/src/features/customers/queries.ts` (new) — `useCustomersQuery()` calls `api.customers.$get()`.
- `apps/web/src/features/customers/CustomerList.tsx` (new) — Shadcn table.
- `apps/web/src/routes/_authed/customers/index.tsx` (new) — renders `<CustomerList />`.

**Acceptance**: list page shows seeded customers with correct outstanding totals; risk badge color-coded; admin sees all, distributor sees only own.

**Depends on**: 0d.

---

### Task 1b — Add/Edit customer (form + API)

**Goal**: Create and edit customer including manual lat/long entry and a "Use Current Location" button.

**Files**:

- `packages/schema/src/customer.ts` — `customerInsertSchema`, `customerUpdateSchema`. Validate lat ∈ [-90,90], long ∈ [-180,180], phone non-empty.
- `apps/api/src/routes/customers.ts` — `POST /`, `PATCH /:id`, `GET /:id`. Distributor cannot create for another distributor; auto-assign `distributorId = session.user.distributorId` if role=distributor.
- `apps/web/src/features/customers/CustomerForm.tsx` (new) — react-hook-form + Zod resolver. "Use Current Location" calls `navigator.geolocation.getCurrentPosition` and fills lat/long.
- `apps/web/src/routes/_authed/customers/new.tsx`, `_authed/customers/$id.edit.tsx` (new).

**Acceptance**: can create + edit; lat/long button works in browser; validation errors surface; distributor cannot edit another distributor's customer (API returns 403).

**Depends on**: 1a.

---

### Task 1c — Customer profile page

**Goal**: Profile shows customer details, risk badge with watchlist/blacklist warning, location preview (small embedded Leaflet or a static link), and a list of their receivables.

**Files**:

- `apps/api/src/routes/customers.ts` — `GET /:id` returns customer + receivables array (with current balance).
- `apps/web/src/features/customers/CustomerProfile.tsx` (new).
- `apps/web/src/features/customers/RiskBadge.tsx` (new) — neutral for good, yellow warning for watchlist, red strong warning for blacklisted.
- `apps/web/src/routes/_authed/customers/$id.tsx` (new) — renders profile + "Add Receivable" button (link to `/receivables/new?customerId=...`).
- Google Maps external link: `https://www.google.com/maps?q={lat},{lng}`.

**Acceptance**: profile renders; risk warning shown for watchlist/blacklisted; "Open in Google Maps" link works; receivables list links to receivable detail page (will 404 until 2b).

**Depends on**: 1a.

---

### Task 1d — Map view (Leaflet, client-only)

**Goal**: `/map` shows pins for every customer with valid coords; popup has name, phone, risk, outstanding balance, link to profile + Google Maps.

**Files**:

- `apps/web/package.json` — add `leaflet`, `react-leaflet`, `@types/leaflet`.
- `apps/web/src/features/map/MapView.tsx` (new) — client-only: dynamic import of `react-leaflet` inside `useEffect`, render `<MapContainer>` only after mount. Import Leaflet CSS via the route file.
- `apps/web/src/routes/_authed/map.tsx` (new) — fetches `useCustomersQuery()`, filters out null coords, passes to `MapView`. Set `ssr: false` on the route.
- Default center: Manila (`14.5995, 120.9842`), zoom 12.

**Acceptance**: pins render; popup shows correct data; clicking profile link navigates; no SSR hydration error in console.

**Depends on**: 1a.

---

## PHASE 2 — Receivables (3 tasks)

### Task 2a — Create receivable (form + API + balance calc)

**Goal**: Admin/distributor can create a receivable for a customer; `original_balance = total - down_payment`; `current_balance` initialized to `original_balance`; blacklist enforcement.

**Files**:

- `packages/schema/src/receivable.ts` (new) — `receivableInsertSchema` (totalAmountCents ≥ 0, downPaymentCents ≤ totalAmountCents, valid date, customerId required).
- `packages/schema/src/enums.ts` — `receivableStatusEnum`.
- `apps/api/src/routes/receivables.ts` — `POST /` with `requireSession`. Reject if `customer.riskStatus === "blacklisted"` AND `session.user.role === "distributor"`. Admin can override. Compute balances server-side; ignore client values for the computed fields.
- `apps/web/src/features/receivables/ReceivableForm.tsx` (new) — react-hook-form. Money inputs accept decimal, multiply by 100 on submit. Watchlist warning banner if customer is watchlist; strong red warning if blacklisted (admin sees "Override" checkbox, distributor sees a blocked state).
- `apps/web/src/routes/_authed/receivables/new.tsx` (new) — reads `?customerId=` from search params, preloads customer.

**Acceptance**: balances computed correctly server-side; distributor blocked from creating for blacklisted customer (403); admin allowed; watchlist warning visible.

**Depends on**: 1b, 1c.

---

### Task 2b — Receivable detail page

**Goal**: `/receivables/:id` shows full receivable, customer link, status, balances, "Record Payment" button, payment history (empty until Phase 3).

**Files**:

- `apps/api/src/routes/receivables.ts` — `GET /:id` returns receivable + customer + payments[]. Scoped (distributor only sees own).
- `apps/web/src/features/receivables/ReceivableDetail.tsx` (new).
- `apps/web/src/routes/_authed/receivables/$id.tsx` (new).

**Acceptance**: page renders all fields; status badge correct; navigation back to customer profile works.

**Depends on**: 2a.

---

### Task 2c — Wire receivables into customer profile

**Goal**: Customer profile's receivables list (stubbed in 1c) now links to working detail pages and shows current status.

**Files**:

- `apps/web/src/features/customers/CustomerProfile.tsx` — update receivables list to show product description, current balance, status, link to detail.

**Acceptance**: end-to-end: from `/customers` → profile → receivable detail. All real data.

**Depends on**: 2b.

---

## PHASE 3 — Payments + Overdue (3 tasks)

### Task 3a — Record payment (form + API + balance update)

**Goal**: Record a payment against a receivable. Server validates `0 < amount ≤ currentBalance`, decrements `currentBalance`, marks receivable `fully_paid` when balance reaches 0.

**Files**:

- `packages/schema/src/payment.ts` (new) — `paymentInsertSchema` (amountCents > 0, valid method, paymentDate).
- `packages/schema/src/enums.ts` — `paymentMethodEnum`.
- `apps/api/src/routes/payments.ts` — `POST /` inside a Drizzle `db.transaction`: re-read current balance, validate, insert payment, update receivable. Distributor can only pay against own receivables (verify via join).
- `apps/web/src/features/payments/PaymentForm.tsx` (new) — modal/dialog opened from receivable detail. Pre-fills max = currentBalance.
- `apps/web/src/features/receivables/ReceivableDetail.tsx` — wire "Record Payment" button to open form; invalidate receivable + customer queries on success.

**Acceptance**: payment created; balance updates; overpayment rejected (server 400, client error toast); receivable auto-marks `fully_paid` at zero; distributor can't pay another distributor's receivable (403).

**Depends on**: 2b.

---

### Task 3b — Payment history on receivable detail

**Goal**: Receivable detail page shows ordered payment history (date, method, amount, notes).

**Files**:

- `apps/api/src/routes/receivables.ts` — `GET /:id` already includes payments; verify ordered by `paymentDate desc`.
- `apps/web/src/features/payments/PaymentHistory.tsx` (new).
- `apps/web/src/features/receivables/ReceivableDetail.tsx` — embed `<PaymentHistory />`.

**Acceptance**: history renders; payments appear immediately after creation (query invalidation works).

**Depends on**: 3a.

---

### Task 3c — Overdue accounts page

**Goal**: `/overdue` lists every receivable where `current_balance > 0 AND date(first_due_date) < date('now')`, with customer name, phone, address, distributor, product, total, current balance, first due date, days overdue, status, and a Google Maps link.

**Files**:

- `apps/api/src/routes/overdue.ts` — `GET /` returns overdue rows (join customers + receivables). Days overdue computed in SQL (`julianday('now') - julianday(first_due_date)`). Scoped to distributor.
- `apps/web/src/features/overdue/OverdueTable.tsx` (new).
- `apps/web/src/routes/_authed/overdue.tsx` (new).

**Acceptance**: list shows correct rows from seed data; fully-paid never appears; days-overdue computed correctly; Google Maps link works.

**Depends on**: 3a.

---

## PHASE 4 — Dashboard + Polish (2 tasks)

### Task 4a — Dashboard

**Goal**: Replace the placeholder `/dashboard` with 4 cards: Total receivables, Total collected, Total outstanding balance, Total overdue amount. Scoped per role.

**Files**:

- `apps/api/src/routes/dashboard.ts` — `GET /totals` returns `{ totalReceivablesCents, totalCollectedCents, outstandingCents, overdueCents }`. Single query with `SUM(...)` aggregates, scoped to distributor when applicable.
- `apps/web/src/features/dashboard/DashboardCards.tsx` (new) — 4 Shadcn `<Card>`s.
- `apps/web/src/routes/_authed/dashboard.tsx` — render `<DashboardCards />`.

**Acceptance**: numbers match what you can hand-compute from seeded data; cards re-fetch (or invalidate) after creating a receivable/payment.

**Depends on**: 3c.

---

### Task 4b — Expand seed + end-to-end smoke test

**Goal**: Demo-ready data: ~12 customers across Manila with real-looking coords, 8–10 receivables in mixed states (3 overdue, 1 fully paid, 4 current), mixed risk statuses (1 watchlist, 1 blacklisted), 6–8 payments. Walk the demo flow end-to-end.

**Files**:

- `packages/db/src/seed.ts` — expand fixtures.
- `apps/web/src/routes/_authed/dashboard.tsx` — add nav links to all main pages (Customers, Map, Overdue, Add Customer) so the demo flow is one-click navigable.

**Acceptance**: walk the recommended demo flow from `docs/mvp-smaller.md` lines 1057–1079:

1. Log in as admin → dashboard shows totals.
2. Open map → click a pin → opens profile.
3. Open a receivable → record payment → balance updates.
4. Open overdue → see overdue customers with map link.
5. Add new customer with current location → save → appears on map → create receivable for them.

If every step works without errors, the demo MVP is done.

**Depends on**: 4a.

---

## Verification (per phase)

- After each task: run `bun run --filter '*' typecheck` from the repo root. Must be green.
- After each task touching the schema: run `bun run --filter db db:push` then `bun run --filter db db:seed`.
- After Phase 0: log in via browser, hit `/dashboard`, sign out, redirect to `/login`.
- After Phase 1: manually create + edit a customer, open map, open profile.
- After Phase 2: create a receivable end-to-end, open detail page.
- After Phase 3: record a payment, watch balance update, mark a receivable fully paid, open overdue page.
- After Phase 4: full demo walkthrough per `docs/mvp-smaller.md` §"Recommended Final Demo Flow".

## Out of scope (do not build)

Anything in `docs/mvp-smaller.md`'s "Cut From Demo" (lines 58–82) or "Not for Demo MVP" (lines 994–1011): distributor CRUD UI, user management UI, password reset, CSV exports, audit logs, payment void workflow, blacklist approval workflow, advanced reports, offline mode, route planning, inventory, accounting integration, SMS, push notifications, native mobile.

## References

- Spec: `docs/mvp-smaller.md`
- Progress tracker: `docs/progress.md`
- Current schema (skeleton): `packages/db/src/schema.ts`
- Current API (skeleton): `apps/api/src/index.ts`
- Web router: `apps/web/src/router.tsx`
- better-auth Hono guide: https://www.better-auth.com/docs/integrations/hono
- better-auth Drizzle adapter: https://www.better-auth.com/docs/adapters/drizzle
- Hono RPC: https://hono.dev/docs/guides/rpc
- TanStack Router `_authed` pattern: https://tanstack.com/router/latest/docs/framework/react/guide/authenticated-routes
- Leaflet + React: https://react-leaflet.js.org/
