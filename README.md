# tri-m

Internal app for tracking furniture customer receivables, payments, overdue accounts, and customer locations on a map.

The MVP demo (Phase 0–4) and Phase 2 are complete. Active development is Phase 3 — see `docs/phase3-plan.md`.

## Stack

- **Runtime / package manager**: Bun (workspaces)
- **API**: Hono + Drizzle ORM + Turso/SQLite, `better-auth` for sessions
- **Web**: TanStack Start (React 19, Vite) + Shadcn (Base UI) + TanStack Query + TanStack Router
- **Map**: Leaflet + OpenStreetMap (client-only)
- **Validation**: Zod schemas shared via `packages/schema`
- **Money**: integer cents (never `real`)

## Layout

```
apps/
  api/    Hono backend. Routes per resource, chained for Hono RPC type inference.
  web/    TanStack Start frontend. Auth-gated routes under _authed.
packages/
  db/             Drizzle schema, migrations, seed.
  schema/         Zod schemas shared between API and web.
  oxlint-config/  Shared lint config.
docs/             Plans, specs, progress trackers.
```

## Setup

Requires Bun ≥ 1.1 and a Turso/SQLite database (local file works fine for dev).

```bash
bun install
cp .env.example .env   # if .env.example exists; otherwise see "Env" below

bun run --filter db db:push    # apply schema
bun run --filter db db:seed    # seed demo data (admin@demo.local / demo1234)
```

### Env

Both apps read from the repo-root `.env` (loaded via `bun --env-file ../../.env`).

Minimum required keys:

```
DATABASE_URL=file:./local.db
BETTER_AUTH_SECRET=<random 32+ char string>
WEB_ORIGIN=http://localhost:3000
VITE_API_URL=http://localhost:4000
```

## Develop

Run both apps from the repo root:

```bash
bun dev   # runs apps/api and apps/web in parallel
```

Or each separately:

```bash
bun run --filter api dev    # API on :4000
bun run --filter web dev    # Web on :3000
```

## Demo credentials (seeded)

- Admin: `admin@demo.local` / `demo1234`
- Distributor: `dist@demo.local` / `demo1234`

## Demo flow

The script the demo follows lives in `docs/mvp-smaller.md` §"Recommended Final Demo Flow" (lines 1057–1079). The short version:

1. Log in as admin → dashboard totals.
2. Open map → click a customer pin.
3. Open profile → open a receivable → record a payment → watch the balance update.
4. Open overdue accounts → see customers with map links.
5. Add a new customer with current location → save → create a receivable for them.

## Common commands

```bash
bun run --filter '*' typecheck        # repo-wide TS check (must be green before commit)
bun run check                         # ultracite lint
bun run fix                           # ultracite lint --fix
bun run --filter db db:push           # apply schema
bun run --filter db db:seed           # reseed
bun run --filter db db:studio         # Drizzle Studio
```

## Documentation

- **Active plan**: `docs/phase3-plan.md` — Phase 3 tasks (F1 through I3) with Goal, Files, Acceptance, Depends-on.
- **Active progress**: `docs/phase3-progress.md` — checklist + decisions log.
- **MVP plan (history)**: `docs/build-plan.md`
- **MVP progress (history)**: `docs/progress.md`
- **Domain spec**: `docs/mvp-smaller.md` (smaller demo scope) and `docs/mvp.md` (full reference).
- **AI agent guidance**: `CLAUDE.md` — workflow rules for Claude / coding agents working in this repo.

## Conventions

- Money is stored as `integer` cents. UI divides by 100 for display, multiplies by 100 on submit.
- All web↔API data flow goes through Hono RPC (`hc<AppType>`) + TanStack Query. Don't reach for `createServerFn` for domain reads/writes.
- Hono routes must be chained (`app.get(...).post(...).route(...)`) so RPC inference stays alive.
- Distributor scope is enforced server-side via `scopeToDistributor` / `requireOwnDistributor` middleware. Every new route touching `customers`, `receivables`, `payments`, or `payment_schedules` MUST apply it.
- Leaflet is client-only — dynamic-import inside `useEffect` or set `ssr: false` on the route.
- `better-auth` owns `user`, `session`, `account`, `verification` tables. The `user` table is extended with `role` (`admin` | `distributor`) and `distributorId`.
