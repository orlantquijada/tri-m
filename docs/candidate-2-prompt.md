## Candidate 2 — Deep `Receivable` domain module

Extract a pure Receivable domain module in apps/api that owns balance arithmetic, status transitions, and overdue logic. Currently this logic is scattered across 4 services and will be triplicated by upcoming Phase 2 D1/D2/D3 tasks.

Context

Scattered logic (exact locations):

- originalBalanceCents = totalAmountCents - downPaymentCents — apps/api/src/services/receivables.ts:67
- newBalance = currentBalanceCents - amountCents, newStatus = newBalance === 0 ? "fully_paid" : receivable.status — apps/api/src/services/payments.ts:56-57
- Overdue SQL predicate (currentBalanceCents > 0 AND date(firstDueDate) < date('now')) duplicated in overdue.ts:42-43 and dashboard.ts:17
- daysOverdue as cast(julianday('now') - julianday(firstDueDate) as integer) — overdue.ts:20

Important: after a payment, status stays as-is unless balance hits exactly zero (no automatic "overdue → current" transition). Overdue is computed on-the-fly via date comparison, not stored.

Goal

New file apps/api/src/lib/receivable.ts exporting pure functions (no DB calls, no side effects):

// Cents-in, cents-out. All fns are pure.

export function computeOriginalBalance(input: {
totalAmountCents: number;
downPaymentCents: number;
}): number;

export function applyPayment(
receivable: { currentBalanceCents: number; status: string },
amountCents: number
): { newBalanceCents: number; newStatus: string };

export function isOverdue(
receivable: { currentBalanceCents: number; firstDueDate: string },
today: Date
): boolean;

export function daysOverdue(
receivable: { firstDueDate: string },
today: Date
): number;

// For D3 aging buckets (implement placeholder returning "current" if not yet needed):
export function agingBucket(
receivable: { currentBalanceCents: number; firstDueDate: string },
today: Date
): "current" | "1-30" | "31-60" | "61-90" | "90+";

Steps

1. Create apps/api/src/lib/receivable.ts with above interface. All pure functions — no drizzle, no db, no HTTP imports.
2. Migrate services/receivables.ts:67: originalBalanceCents = computeOriginalBalance(...).
3. Migrate services/payments.ts:56-57: const { newBalanceCents, newStatus } = applyPayment(receivable, amountCents).
4. In services/overdue.ts: replace inline SQL date predicates with isOverdue / daysOverdue called on each row after fetch, OR keep SQL for performance but use the module's output for any post-processing. Note the SQL predicate (date(firstDueDate) < date('now')) is the authoritative definition — the pure fn should match it exactly.
5. In services/dashboard.ts: same approach for overdue sum.
6. Run bun run --filter '\*' typecheck — must be green.

Constraints

- Money stays INTEGER cents everywhere — no floats in or out of any receivable fn.
- Do NOT change the status transition rule: only "fully_paid" when balance hits exactly 0. Do not add "overdue" as a stored status.
- Keep SQL for aggregates in dashboard.ts (don't replace GROUP BY with JS loops).
- agingBucket placeholder is fine returning "current" always if D3 isn't started yet.

Verification

- TypeCheck green.
- Record a payment that brings balance to zero → status = "fully_paid".
- Record a partial payment → status unchanged.
- Overdue list still returns same rows as before.
- Dashboard totals unchanged.
