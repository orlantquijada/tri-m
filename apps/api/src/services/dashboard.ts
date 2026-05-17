import {
  db,
  payments as paymentsTable,
  receivables as receivablesTable,
} from "db";
import { eq, sql } from "drizzle-orm";

import { Scope } from "../lib/scope";
import type { User } from "../middleware/auth";

export async function getDashboardTotals(user: User) {
  const scope = Scope.forUser(user).filterQuery(receivablesTable.distributorId);

  const [recAgg] = await db
    .select({
      outstandingCents: sql<number>`coalesce(sum(case when ${receivablesTable.status} != 'fully_paid' then ${receivablesTable.currentBalanceCents} else 0 end), 0)`,
      overdueCents: sql<number>`coalesce(sum(case when ${receivablesTable.currentBalanceCents} > 0 and date(${receivablesTable.firstDueDate}) < date('now') then ${receivablesTable.currentBalanceCents} else 0 end), 0)`,
      totalReceivablesCents: sql<number>`coalesce(sum(${receivablesTable.totalAmountCents}), 0)`,
    })
    .from(receivablesTable)
    .where(scope);

  const [payAgg] = await db
    .select({
      totalCollectedCents: sql<number>`coalesce(sum(${paymentsTable.amountCents}), 0)`,
    })
    .from(paymentsTable)
    .innerJoin(
      receivablesTable,
      eq(paymentsTable.receivableId, receivablesTable.id)
    )
    .where(scope);

  return {
    outstandingCents: recAgg?.outstandingCents ?? 0,
    overdueCents: recAgg?.overdueCents ?? 0,
    totalCollectedCents: payAgg?.totalCollectedCents ?? 0,
    totalReceivablesCents: recAgg?.totalReceivablesCents ?? 0,
  };
}
