---
# Architecture Deepening Candidates

Candidate 3 (`createResourceQueries` factory) is complete. Remaining candidates, sorted by leverage.
---

## Candidate 1 — Unified `Scope` seam (distributor + admin)

**Files**: `apps/api/src/lib/scope.ts`, `lib/guards.ts`, `middleware/auth.ts`, every route + service touching `customers`/`receivables`/`payments`/`distributors`/`users`.

**Problem**: Two parallel adapters for same rule. `distributorScope()` (SQL filter) for lists; `isDistributorOwner()` (imperative check) for single resources. `requireAdmin()` called manually inside handlers (`distributors.ts:16,20,28,37`, `users.ts:27,35,44`). `requireOwnDistributor()` exported but unused. Auth split across middleware + route bodies + service bodies. No single audit point for "who can see what."

**Solution**: One `Scope` module. Interface: `Scope.forUser(user)` returns `.filterQuery(column)`, `.assertCanRead(distributorId)`, `.assertCanWrite(distributorId)`, `.assertAdmin()`. Routes/services call only this. Delete old `isDistributorOwner` + `distributorScope` exports.

**Benefits**:

- **Locality**: all access policy in one module — auditing "what can a distributor do" = reading one file.
- **Leverage**: adding scoped table (e.g., `payment_schedules`) picks method, not reinvents pattern.
- **Tests**: Scope module = test surface for permissions; service tests stop mixing business logic with auth assertions.

Deletion test: deleting it concentrates 7+ scattered check sites into one place — passes.

---

## Candidate 2 — Deep `Receivable` domain module

**Files**: `apps/api/src/services/receivables.ts`, `services/payments.ts`, `services/overdue.ts`, `services/dashboard.ts`.

**Problem**: Receivable arithmetic + state machine scattered across 4 services.

- `originalBalanceCents = total - down` → `receivables.ts:67`
- `newBalance = currentBalance - amount`, `status = newBalance === 0 ? "fully_paid" : status` → `payments.ts:56-57`
- Overdue def (`balance > 0 AND firstDueDate < today`) duplicated in SQL: `overdue.ts:43`, `dashboard.ts:17`
- D2 will add per-installment overdue + payment allocation in a 3rd location
- D3 aging buckets will be a 4th location

**Solution**: `receivable` module owning balance/status/overdue/allocation. Interface: `Receivable.computeOriginalBalance(input)`, `Receivable.applyPayment(receivable, paymentCents)` → `{ newBalance, newStatus, scheduleUpdates }`, `Receivable.isOverdue(receivable, today)`, `Receivable.agingBucket(receivable, today)`. Services compose; SQL aggregates re-expressed via shared predicates.

**Benefits**:

- **Locality**: every fact about balance/status/overdue in one place. D2 payment-allocation becomes `receivable.applyPayment(amount)`.
- **Leverage**: D3 aging is 1 function call instead of new SQL elsewhere.
- **Tests**: pure-function table tests for balance arithmetic + status FSM; today these only have integration coverage.

Deletion test: deleting it scatters 4+ definitions of "overdue" — passes.

---

## Candidate 4 — Promote `requireAdmin` to Hono middleware

**Files**: `apps/api/src/routes/distributors.ts`, `routes/users.ts`, `middleware/auth.ts`.

**Problem**: `requireSession` is structural middleware (applied at subapp). `requireAdmin` is procedural — called inside every admin handler. Asymmetric. Easy to forget on a new admin endpoint. `requireOwnDistributor` defined but never used — dead seam.

**Solution**: `requireAdmin` becomes Hono middleware on the admin-only subapps (`distributors`, `users`). For per-resource ownership: middleware factory `requireOwner(loadResource)` that resolves resource then checks. Handler bodies stop carrying auth code.

**Benefits**:

- **Locality**: auth visible in route mount table, not buried in handlers.
- **Safety**: structural — can't accidentally skip.
- **Leverage**: new admin endpoint adds zero auth code.

Overlaps with Candidate 1 — could be subsumed if Candidate 1 is picked.

---

## Candidate 5 — Generate Zod schemas via `drizzle-zod`

**Files**: `packages/schema/src/{customer,receivable,payment,distributor}.ts`, `packages/db/src/schema/domain.ts`.

**Problem**: Every domain entity has 3 definitions: Drizzle table + Zod select + Zod insert. `receivables` has 5 `*Cents` fields each defined 3×. New field = 3 edits, silent drift risk.

**Solution**: `drizzle-zod` derives `*SelectSchema` + `*InsertSchema` from Drizzle. Hand-written extensions (`customerListItemSchema` aggregates, insert refines) layer on top.

**Benefits**: Locality of field defs improves. Shallow refactor — leverage only pays as entities multiply. Lower priority vs 1–2.

---

## Candidate 6 — `<QueryView>` loading/error/empty wrapper

**Files**: every list component + page route (~10 sites in `apps/web/src`).

**Problem**: `if (isLoading) return <p>Loading...</p>; if (error) return <p>Failed</p>; if (!data?.length) return <p>...</p>` copy-pasted ~10×. Cosmetic drift.

**Solution**: `<QueryView query={q} empty="..." render={(data) => ...}>`.

**Benefits**: Consistency over leverage. Lowest priority — pattern small enough that copy is arguable.

---

## Priority order

1. **Candidate 2** — highest leverage; Phase 2 D1/D2/D3 are about to triplicate receivable logic. Fix before, not after.
2. **Candidate 1** — auth surface grows with every new route.
3. **Candidate 4** — quick win; subsumed by Candidate 1 if that ships first.
4. **Candidate 5** — low leverage until entities multiply.
5. **Candidate 6** — cosmetic.
