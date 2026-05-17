# MVP Build Progress

Full task details in `docs/build-plan.md`. Spec in `docs/mvp-smaller.md`.

**Status legend**: `[ ]` todo · `[~]` in progress · `[x]` done · `[!]` blocked

---

## Phase 0 — Foundations

- [x] **0a** — Schema + seed (`packages/db/src/schema/domain.ts`, `seed.ts`)
- [x] **0b** — Hono restructure + RPC export (`apps/api/src/routes/*`, `index.ts`)
- [x] **0c** — better-auth wiring (`apps/api/src/lib/auth.ts`, `routes/auth.ts`, generated `schema/auth.ts`)
- [x] **0d** — Web shell: RPC client, react-query, auth context, login, `_authed` guard

## Phase 1 — Customers + Map

- [x] **1a** — Customer list (API + `/customers` page)
- [x] **1b** — Add/Edit customer (form + `POST`/`PATCH` + geolocation button)
- [x] **1c** — Customer profile page (`/customers/$id`)
- [x] **1d** — Map view (`/map`, Leaflet client-only)

## Phase 2 — Receivables

- [x] **2a** — Create receivable (form + API + balance calc + blacklist enforcement)
- [x] **2b** — Receivable detail page (`/receivables/$id`)
- [x] **2c** — Wire receivables into customer profile

## Phase 3 — Payments + Overdue

- [x] **3a** — Record payment (form + API + transactional balance update)
- [x] **3b** — Payment history on receivable detail
- [x] **3c** — Overdue accounts page (`/overdue`)

## Phase 4 — Dashboard + Polish

- [~] **4a** — Dashboard (4 totals cards, scoped per role)
- [ ] **4b** — Expand seed + end-to-end smoke test

---

## Notes / Decisions Log

(Add entries here when blocking or deviating from the plan. Format: `YYYY-MM-DD — task — note`.)

- 2026-05-16 — plan created. 16 tasks, 4 phases. Stack locked: better-auth + Hono RPC + TanStack Query + Leaflet. Money as INTEGER cents.
- 2026-05-16 — 0a — drizzle-kit push requires TTY even with --force in beta; workaround: delete local.db and push fresh. Also stripped skeleton /users routes from apps/api/src/index.ts (would block 0b anyway). Fixed 2 pre-existing Shadcn type errors (calendar.tsx table→month_grid, scroll-area.tsx unused React import).
- 2026-05-16 — 0c — drizzle-orm@1.0.0-beta.22 drops `relations` export; stripped from generated auth schema (not needed for better-auth queries). Workspace package named "api" clashes with npm "api@6.1.3" (better-auth transitive dep); fixed via root package.json overrides. seed.ts creates auth instance inline (circular dep prevents importing from apps/api); role set via drizzle update after signUpEmail since input:false blocks it in the body.
- 2026-05-16 — 0d — `api` workspace name collision with npm "api" override; used tsconfig paths alias (`"api": ["../api/src/index"]`) for type-only import instead of workspace:\* dep. `bun add --filter web` triggers DependencyLoop; added packages directly to package.json. beforeLoad SSR skip: typeof window guard + useEffect fallback in AuthedLayout for initial hydration check.
- 2026-05-16 — 1a — Hono RPC client with `basePath("/api")` nests routes under `api.api.*` (e.g. `api.api.customers.$get()`). Customer name rendered as plain text in list; will become Link in 1c when `$id` route is created.
- 2026-05-16 — 1c — routeTree.gen.ts must be manually updated when adding new routes (vite plugin regenerates on dev server start). Button component uses @base-ui/react/button (no asChild); use Link + buttonVariants className instead. router.tsx `declare module "@tanstack/react-router"` block removed — routeTree.gen.ts already registers router via @tanstack/react-start; keeping both caused TS2300 duplicate identifier. Receivables links (/receivables/$id, /receivables/new) use plain <a href> since routes don't exist until 2a/2b.
- 2026-05-16 — 1d — react-leaflet dynamically imported inside useEffect (mounted-state guard) to avoid SSR. Leaflet CSS imported statically in route file. routeTree.gen.ts patched manually with /\_authed/map entry. bun add triggers DependencyLoop; packages added directly to package.json. (vite plugin regenerates on dev server start). Button component uses @base-ui/react/button (no asChild); use Link + buttonVariants className instead. router.tsx `declare module "@tanstack/react-router"` block removed — routeTree.gen.ts already registers router via @tanstack/react-start; keeping both caused TS2300 duplicate identifier. Receivables links (/receivables/$id, /receivables/new) use plain <a href> since routes don't exist until 2a/2b.
- 2026-05-16 — 2c — Converted plain <a href> receivable list links in customer-profile.tsx to TanStack Router <Link to="/receivables/$id"> now that route exists (2b complete).
- 2026-05-16 — 3a — Payment POST uses db.transaction; receivableId sent in body (not URL param). customerId stripped from RPC body in mutation (used only for query invalidation). Sonner Toaster added to \_\_root.tsx. DialogTrigger render={<Button>} pattern validated against existing dialog.tsx usage.
