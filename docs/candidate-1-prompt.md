Candidate 1 — Unified Scope seam

Refactor the API auth/scope layer in apps/api into a single deep `Scope` module.

## Context

Currently two parallel adapters exist for the same access rule:

- `distributorScope(user, column)` in `apps/api/src/lib/scope.ts:7` — returns SQL WHERE clause for list queries
- `isDistributorOwner(user, distributorId)` in `apps/api/src/lib/guards.ts:3` — boolean for single-resource checks
- `requireAdmin(user)` in `apps/api/src/middleware/auth.ts:31` — called procedurally inside every handler (distributors.ts:15,19,27,36; users.ts:26,34,42)
- `requireOwnDistributor(user, distributorId)` in `apps/api/src/middleware/auth.ts:25` — defined but never called anywhere

## Goal

One `Scope` module at `apps/api/src/lib/scope.ts`. Interface:

```ts
import type { SQL } from "drizzle-orm";
import type { SQLiteColumn } from "drizzle-orm/sqlite-core";
import type { User } from "../middleware/auth";

export const Scope = {
  forUser(user: User): {
    filterQuery(column: SQLiteColumn): SQL | undefined;
    assertCanRead(distributorId: number): void;
    assertCanWrite(distributorId: number): void;
    assertAdmin(): void;
  };
};

- filterQuery — replaces distributorScope: returns eq(column, user.distributorId) for distributor, undefined for admin
- assertCanRead / assertCanWrite — replace requireOwnDistributor + isDistributorOwner: throw 403 if distributor and distributorId doesn't match
- assertAdmin — replaces requireAdmin: throw 403 if not admin

Steps

1. Rewrite apps/api/src/lib/scope.ts to export the Scope object above. Delete apps/api/src/lib/guards.ts.
2. Update apps/api/src/middleware/auth.ts: remove requireOwnDistributor, requireAdmin, and the isDistributorOwner import. Keep only requireSession, AuthVariables, User.
3. Migrate all call sites:
  - distributors.ts: requireAdmin(c.get("user")) → Scope.forUser(c.get("user")).assertAdmin()
  - users.ts: same pattern
  - Any service using distributorScope(user, col) → Scope.forUser(user).filterQuery(col)
  - Any service using isDistributorOwner or requireOwnDistributor → Scope.forUser(user).assertCanRead(id) or .assertCanWrite(id)
4. Run bun run --filter '*' typecheck — must be green. Fix all errors.

Out of scope

Do NOT convert requireAdmin into Hono middleware (that's Candidate 4). Keep it as a called function via the Scope object for now.

Verification

- TypeCheck green.
- bun run --filter api dev — hit GET /api/distributors as distributor user → 403. Hit as admin → 200.
- Confirm guards.ts is deleted and no import of isDistributorOwner, requireOwnDistributor, or requireAdmin anywhere except through Scope.
```
