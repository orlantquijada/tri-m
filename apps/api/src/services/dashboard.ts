import {
  db,
  payments as paymentsTable,
  receivables as receivablesTable,
} from "db";
import { and, eq, gt, sql } from "drizzle-orm";

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

export async function getAgingBuckets(user: User) {
  const scope = Scope.forUser(user);

  const [row] = await db
    .select({
      bucket0_30Cents: sql<number>`coalesce(sum(case when cast(julianday('now') - julianday(${receivablesTable.firstDueDate}) as integer) between 1 and 30 then ${receivablesTable.currentBalanceCents} else 0 end), 0)`,
      bucket31_60Cents: sql<number>`coalesce(sum(case when cast(julianday('now') - julianday(${receivablesTable.firstDueDate}) as integer) between 31 and 60 then ${receivablesTable.currentBalanceCents} else 0 end), 0)`,
      bucket61_90Cents: sql<number>`coalesce(sum(case when cast(julianday('now') - julianday(${receivablesTable.firstDueDate}) as integer) between 61 and 90 then ${receivablesTable.currentBalanceCents} else 0 end), 0)`,
      bucket90PlusCents: sql<number>`coalesce(sum(case when cast(julianday('now') - julianday(${receivablesTable.firstDueDate}) as integer) > 90 then ${receivablesTable.currentBalanceCents} else 0 end), 0)`,
    })
    .from(receivablesTable)
    .where(
      and(
        gt(receivablesTable.currentBalanceCents, 0),
        sql`date(${receivablesTable.firstDueDate}) < date('now')`,
        scope.filterQuery(receivablesTable.distributorId)
      )
    );

  return (
    row ?? {
      bucket0_30Cents: 0,
      bucket31_60Cents: 0,
      bucket61_90Cents: 0,
      bucket90PlusCents: 0,
    }
  );
}
