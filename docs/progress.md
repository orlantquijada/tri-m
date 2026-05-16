# MVP Build Progress

Full task details in `docs/build-plan.md`. Spec in `docs/mvp-smaller.md`.

**Status legend**: `[ ]` todo · `[~]` in progress · `[x]` done · `[!]` blocked

---

## Phase 0 — Foundations

- [x] **0a** — Schema + seed (`packages/db/src/schema/domain.ts`, `seed.ts`)
- [x] **0b** — Hono restructure + RPC export (`apps/api/src/routes/*`, `index.ts`)
- [x] **0c** — better-auth wiring (`apps/api/src/lib/auth.ts`, `routes/auth.ts`, generated `schema/auth.ts`)
- [ ] **0d** — Web shell: RPC client, react-query, auth context, login, `_authed` guard

## Phase 1 — Customers + Map

- [ ] **1a** — Customer list (API + `/customers` page)
- [ ] **1b** — Add/Edit customer (form + `POST`/`PATCH` + geolocation button)
- [ ] **1c** — Customer profile page (`/customers/$id`)
- [ ] **1d** — Map view (`/map`, Leaflet client-only)

## Phase 2 — Receivables

- [ ] **2a** — Create receivable (form + API + balance calc + blacklist enforcement)
- [ ] **2b** — Receivable detail page (`/receivables/$id`)
- [ ] **2c** — Wire receivables into customer profile

## Phase 3 — Payments + Overdue

- [ ] **3a** — Record payment (form + API + transactional balance update)
- [ ] **3b** — Payment history on receivable detail
- [ ] **3c** — Overdue accounts page (`/overdue`)

## Phase 4 — Dashboard + Polish

- [ ] **4a** — Dashboard (4 totals cards, scoped per role)
- [ ] **4b** — Expand seed + end-to-end smoke test

---

## Notes / Decisions Log

(Add entries here when blocking or deviating from the plan. Format: `YYYY-MM-DD — task — note`.)

- 2026-05-16 — plan created. 16 tasks, 4 phases. Stack locked: better-auth + Hono RPC + TanStack Query + Leaflet. Money as INTEGER cents.
- 2026-05-16 — 0a — drizzle-kit push requires TTY even with --force in beta; workaround: delete local.db and push fresh. Also stripped skeleton /users routes from apps/api/src/index.ts (would block 0b anyway). Fixed 2 pre-existing Shadcn type errors (calendar.tsx table→month_grid, scroll-area.tsx unused React import).
- 2026-05-16 — 0c — drizzle-orm@1.0.0-beta.22 drops `relations` export; stripped from generated auth schema (not needed for better-auth queries). Workspace package named "api" clashes with npm "api@6.1.3" (better-auth transitive dep); fixed via root package.json overrides. seed.ts creates auth instance inline (circular dep prevents importing from apps/api); role set via drizzle update after signUpEmail since input:false blocks it in the body.
