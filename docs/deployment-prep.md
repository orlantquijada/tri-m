# Deployment Prep — Vercel + Turso

Target:

- Web app: Vercel
- API: Vercel
- DB: Turso/libSQL

## 1. Environment variables

### API env vars

Set on the API Vercel project:

```env
DB_FILE_NAME=libsql://<db-name>-<org>.turso.io
TURSO_AUTH_TOKEN=<turso-db-token>
BETTER_AUTH_SECRET=<random-32-plus-char-secret>
BETTER_AUTH_URL=https://<api-domain>
WEB_URL=https://<web-domain>
NODE_ENV=production
```

Optional/local-only:

```env
PORT=4000
```

Notes:

- Current code reads `DB_FILE_NAME`, not `DATABASE_URL`.
- Current code reads `WEB_URL`, not `WEB_ORIGIN`.
- Verify DB client passes `TURSO_AUTH_TOKEN` for Turso cloud before production deploy.

### Web env vars

Set on the web Vercel project:

```env
VITE_API_URL=https://<api-domain>
```

Notes:

- `VITE_API_URL` is embedded at build time.
- If API domain changes, update env var and redeploy web.

## 2. Recommended domains

Use stable production domains before final deploy:

```txt
Web: https://app.example.com
API: https://api.example.com
```

Then set:

```env
# API project
BETTER_AUTH_URL=https://api.example.com
WEB_URL=https://app.example.com

# Web project
VITE_API_URL=https://api.example.com
```

Same parent domain is preferred for auth cookies.

## 3. Turso setup

1. Create Turso DB.
2. Copy DB URL.
3. Create DB auth token.
4. Set API env vars in Vercel.
5. Apply schema:

```bash
DB_FILE_NAME=libsql://<db-name>-<org>.turso.io \
TURSO_AUTH_TOKEN=<token> \
bun run --filter db db:push
```

6. Seed only if needed:

```bash
DB_FILE_NAME=libsql://<db-name>-<org>.turso.io \
TURSO_AUTH_TOKEN=<token> \
bun run --filter db db:seed
```

Production note: remove/change demo credentials before real use.

## 4. Vercel project setup

Use two Vercel projects:

- `tri-m-web` rooted at `apps/web`
- `tri-m-api` rooted at `apps/api`

### Web project

Expected commands:

```bash
bun install
bun run build
```

Output/build handled by Vite/TanStack Start config.

### API project

Current API has no `build` script. Before deploy, verify Vercel can run `apps/api/src/index.ts` as serverless/edge entry.

May need one or more:

- `apps/api/vercel.json`
- Vercel-compatible serverless entry
- API `build` script
- Hono Vercel adapter/config

This is main open deployment risk.

## 5. Auth, cookies, CORS

Current API CORS allows only `WEB_URL` in production. Good.

Verify in production:

- Login succeeds.
- Session cookie is set.
- Authenticated API calls include cookie.
- Logout clears session.

If web and API are on different domains/subdomains, confirm Better Auth cookie config supports secure cross-site use:

- `Secure`
- correct `SameSite`
- trusted origin = web URL
- base URL = API URL

## 6. Pre-deploy checklist

Run from repo root:

```bash
bun install
bun run --filter '*' typecheck
bun run check
bun run --filter web build
```

Run local smoke test:

```bash
bun run --filter api dev
bun run --filter web dev
```

Smoke-test flows:

- `/api/health` returns `{ status: "ok" }`
- login
- dashboard loads
- customer list loads
- create customer
- create receivable
- record payment
- reports load
- CSV export downloads
- map route loads
- mobile viewport works
- print preview works for print-friendly pages

## 7. Production hardening

Before real users:

- Use strong unique `BETTER_AUTH_SECRET`.
- Remove/change seeded demo accounts.
- Confirm `.env` files are not committed.
- Enable Turso backups/restore plan.
- Decide migration process per release.
- Add uptime check for `/api/health`.
- Watch Vercel function logs after deploy.
- Verify CORS rejects unknown origins.
- Verify API errors do not leak secrets.

## 8. Known docs/env mismatch

README currently mentions older env names:

```env
DATABASE_URL
WEB_ORIGIN
```

Code currently uses:

```env
DB_FILE_NAME
WEB_URL
```

Fix README or add `.env.example` before handoff/deploy.

## 9. Open questions

- Does current Drizzle `tursodatabase` setup need explicit `TURSO_AUTH_TOKEN` wiring?
- What exact Vercel runtime/adapter should API use?
- Should production seed create first admin, or should admin creation be a manual one-time script?
- Final domains: Vercel preview domains or custom domains?
